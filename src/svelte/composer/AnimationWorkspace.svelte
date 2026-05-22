<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData, OverlayData, OverlayTrack, TrackBehavior, TrackComponentLane } from '../../utils/types.ts';
	import { ensureComponentId, generateId } from '../../utils/types.ts';
	import {
		ANIMATABLE_PROPERTIES,
		computeTrackFrame,
		DEFAULT_EASING_V2,
		ensureLane,
		insertKeyframeOnLane,
		insertPropertyKeyframe,
		interpPropertyKeyframes,
		laneAggregateTimes,
		lanePropertyKeyframes,
		makeEmptyAnimation,
		makeEmptyTrack,
		PROP_DEFAULTS,
		removeKeyframeOnLane,
		removePropertyKeyframe,
		updateKeyframeOnLane,
		updatePropertyKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import { buildPreviewOverlay } from '../../utils/render.ts';
	import type {
		AnimatablePropertyKey,
		EasingDirection,
		EasingEquation,
		EasingInterpolation,
		EasingV2,
		PropertyKeyframe,
		TrackKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import { onDestroy, onMount, setContext } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { settings } from '../../utils/settings.ts';

	const { layer, commit }: {
		layer: OverlayData;
		commit: () => void;
	} = $props();

	function ensureAnimation(): void {
		if (layer.animation) return;
		const initialId = generateId();
		layer.animation = makeEmptyAnimation(initialId);
		commit();
	}

	async function requestRemoveTrack(id: string): Promise<void> {
		if (!layer.animation) return;
		if (layer.animation.tracks.length <= 1) {
			const proceed = await foundry.applications.api.DialogV2.confirm({
				content: game.i18n.localize('obs-utils.applications.overlayEditor.animation.confirmRemoveLastTrack')
					?? 'Removing the last track will delete this overlay’s animation entirely. Continue?',
			});
			if (!proceed) return;
		}
		removeTrack(id);
	}

	let selectedTrackId = $state<string | null>(layer.animation?.initialTrackId ?? null);
	const selectedTrack = $derived(
		selectedTrackId
			? layer.animation?.tracks.find(t => t.id === selectedTrackId) ?? null
			: null,
	);

	function addTrack() {
		ensureAnimation();
		const id = generateId();
		const track = makeEmptyTrack(id, defaultTrackName(layer.animation!.tracks.length + 1));
		track.behavior = { type: 'looping' };
		track.durationMs = 2000;
		layer.animation!.tracks = [...layer.animation!.tracks, track];
		selectedTrackId = id;
		commit();
	}

	function defaultTrackName(n: number): string {
		return `Track ${n}`;
	}

	function removeTrack(id: string) {
		if (!layer.animation) return;
		// Removing the last track wipes the whole animation (and any transitions
		// pointing at it) — the overlay returns to a no-animation state.
		if (layer.animation.tracks.length <= 1) {
			delete layer.animation;
			selectedTrackId = null;
			selection = null;
			commit();
			return;
		}
		layer.animation.tracks = layer.animation.tracks.filter(t => t.id !== id);
		if (layer.animation.initialTrackId === id) {
			layer.animation.initialTrackId = layer.animation.tracks[0].id;
		}
		layer.animation.transitions = layer.animation.transitions
			.filter(tr => tr.fromTrackId !== id)
			.map(tr => ({
				...tr,
				zones: tr.zones.map(z =>
					z.destination.type === 'goto' && z.destination.toTrackId === id
						? { ...z, destination: { type: 'ignore' as const } }
						: z,
				),
			}));
		if (selectedTrackId === id) {
			selectedTrackId = layer.animation.tracks[0]?.id ?? null;
		}
		commit();
	}

	function renameTrack(track: OverlayTrack, name: string) {
		track.name = name;
		commit();
	}

	function setBehavior(track: OverlayTrack, type: TrackBehavior['type']) {
		if (type === 'static') track.behavior = { type: 'static' };
		else if (type === 'looping') track.behavior = { type: 'looping' };
		else {
			const fallbackId = layer.animation?.tracks.find(t => t.id !== track.id)?.id ?? track.id;
			track.behavior = { type: 'transition-on-end', toTrackId: fallbackId, toTime: 0 };
		}
		commit();
	}

	// Behavior radios — icon-only, matching the loop / tracking-mode pattern
	// used elsewhere. Tooltips carry the full localized label.
	const behaviorOptions: Array<{ value: TrackBehavior['type']; icon: string; labelKey: string }> = [
		{ value: 'static', icon: 'fas fa-pause', labelKey: 'obs-utils.applications.overlayEditor.animation.behaviorStatic' },
		{ value: 'looping', icon: 'fas fa-rotate', labelKey: 'obs-utils.applications.overlayEditor.animation.behaviorLooping' },
		{ value: 'transition-on-end', icon: 'fas fa-arrow-right-from-bracket', labelKey: 'obs-utils.applications.overlayEditor.animation.behaviorTransitionOnEnd' },
	];

	function setEndTransitionTarget(track: OverlayTrack, toTrackId: string) {
		if (track.behavior.type !== 'transition-on-end') return;
		track.behavior = { ...track.behavior, toTrackId };
		commit();
	}

	function setEndTransitionTime(track: OverlayTrack, toTime: number) {
		if (track.behavior.type !== 'transition-on-end') return;
		track.behavior = { ...track.behavior, toTime };
		commit();
	}

	function setDuration(track: OverlayTrack, ms: number) {
		track.durationMs = Math.max(0, ms);
		commit();
	}

	function setInitialTrack(id: string) {
		if (!layer.animation) return;
		layer.animation.initialTrackId = id;
		commit();
	}

	// ─── timeline / keyframe state ───────────────────────────────────────────

	let playheadT = $state(0);

	// ─── playback ────────────────────────────────────────────────────────────
	// Local preview only — drives playheadT through the selected track at real
	// time. Loops behave per `track.behavior` (looping wraps; transition-on-end
	// stops at the end without auto-routing to the next track to keep the
	// editor preview simple).
	let isPlaying = $state(false);
	let playRafId: number | null = null;
	let playStartWall = 0;
	let playStartT = 0;

	function startPlayback() {
		if (!selectedTrack || selectedTrack.durationMs <= 0) return;
		// Restart from the beginning if the playhead is parked at the end.
		playStartT = playheadT >= selectedTrack.durationMs ? 0 : playheadT;
		playStartWall = performance.now();
		isPlaying = true;
		const tick = () => {
			if (!isPlaying || !selectedTrack) { playRafId = null; return; }
			const elapsed = performance.now() - playStartWall;
			const dur = selectedTrack.durationMs;
			const raw = playStartT + elapsed;
			if (selectedTrack.behavior.type === 'looping') {
				playheadT = dur > 0 ? raw % dur : 0;
			} else if (raw >= dur) {
				playheadT = dur;
				isPlaying = false;
				playRafId = null;
				return;
			} else {
				playheadT = raw;
			}
			playRafId = requestAnimationFrame(tick);
		};
		playRafId = requestAnimationFrame(tick);
	}

	function stopPlayback() {
		isPlaying = false;
		if (playRafId !== null) { cancelAnimationFrame(playRafId); playRafId = null; }
	}
	let timelineEl = $state<HTMLDivElement | null>(null);
	let workspaceEl = $state<HTMLDivElement | null>(null);

	/**
	 * Which component headers are expanded to show per-property rows.
	 * Key = componentId.
	 */
	let expandedComponents = $state<Set<string>>(new Set());

	function toggleExpanded(componentId: string) {
		const next = new Set(expandedComponents);
		if (next.has(componentId)) next.delete(componentId);
		else next.add(componentId);
		expandedComponents = next;
	}

	/**
	 * Selection can be:
	 *   - { kind: 'component'; componentId }        — header row selected
	 *   - { kind: 'property'; componentId; prop }   — property row selected
	 *   - { kind: 'legacy-kf'; componentId; index } — legacy lane keyframe
	 *   - { kind: 'prop-kf'; componentId; prop; index } — per-property keyframe
	 */
	type Selection =
		| { kind: 'component'; componentId: string }
		| { kind: 'property'; componentId: string; prop: AnimatablePropertyKey }
		| { kind: 'legacy-kf'; componentId: string; index: number }
		| { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };

	let selection = $state<Selection | null>(null);


	/** Resolve the selected property keyframe. */
	const selectedPropKfRef = $derived.by<{ lane: TrackComponentLane; prop: AnimatablePropertyKey; kf: PropertyKeyframe; index: number } | null>(() => {
		if (!selection || selection.kind !== 'prop-kf' || !selectedTrack) return null;
		const lane = selectedTrack.lanes.find(l => l.componentId === selection!.componentId);
		if (!lane?.propertyKeyframes) return null;
		const arr = lane.propertyKeyframes[(selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number }).prop];
		const kf = arr?.[(selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number }).index];
		if (!kf) return null;
		return { lane, prop: (selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number }).prop, kf, index: (selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number }).index };
	});

	/** Resolve the selected legacy keyframe. */
	const selectedLegacyKfRef = $derived.by<{ lane: TrackComponentLane; kf: TrackKeyframe; index: number } | null>(() => {
		if (!selection || selection.kind !== 'legacy-kf' || !selectedTrack) return null;
		const sel = selection as { kind: 'legacy-kf'; componentId: string; index: number };
		const lane = selectedTrack.lanes.find(l => l.componentId === sel.componentId);
		const kf = lane?.keyframes[sel.index];
		return kf ? { lane: lane!, kf, index: sel.index } : null;
	});

	// Resolved "which component is currently in the inspector's property view"
	// — header clicks set it directly, keyframe selections promote their
	// associated component so editing properties stays available without
	// navigating back to a header click first.
	const activeComponentId = $derived.by<string | null>(() => {
		if (selection?.kind === 'component') return (selection as { componentId: string }).componentId;
		if (selection?.kind === 'property') return (selection as { componentId: string }).componentId;
		if (selectedPropKfRef) return selectedPropKfRef.lane.componentId;
		if (selectedLegacyKfRef) return selectedLegacyKfRef.lane.componentId;
		return null;
	});

	function componentLabel(c: OverlayComponentData): string {
		const entry = getApi().overlayTypes.get(layer.type);
		const nameKey = entry?.overlayComponentNames?.get(c.type);
		const typeLabel = nameKey ? (game.i18n?.localize(nameKey) ?? c.type) : c.type;
		return `${typeLabel} #${(layer.components ?? []).indexOf(c) + 1}`;
	}

	const TIMELINE_INSET = 8;

	function timelineWidth(): number {
		return timelineEl?.clientWidth ?? 600;
	}

	function timelineInner(): number {
		return Math.max(1, timelineWidth() - TIMELINE_INSET * 2);
	}

	function tToX(t: number, durationMs: number): number {
		if (durationMs <= 0) return TIMELINE_INSET;
		return TIMELINE_INSET + (t / durationMs) * timelineInner();
	}

	function xToT(x: number, durationMs: number): number {
		if (durationMs <= 0) return 0;
		return Math.max(0, Math.min(durationMs, ((x - TIMELINE_INSET) / timelineInner()) * durationMs));
	}

	function clampPlayhead() {
		if (!selectedTrack) return;
		if (playheadT > selectedTrack.durationMs) playheadT = selectedTrack.durationMs;
		if (playheadT < 0) playheadT = 0;
	}

	function onTimelineMouseDown(e: MouseEvent) {
		if (!timelineEl || !selectedTrack) return;
		const target = e.target as HTMLElement;
		if (target.closest('.kf-marker')) return;
		const r = timelineEl.getBoundingClientRect();
		const newT = Math.round(xToT(e.clientX - r.left, selectedTrack.durationMs));
		// Ctrl/Meta+drag on the strip = 2D lasso. Selects every marker whose
		// DOM rect intersects the dragged box on mouseup, so the user can
		// constrain the selection to a specific lane vertically as well as a
		// time range horizontally.
		if (e.ctrlKey || e.metaKey) {
			dragging = { kind: 'lasso', startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
			e.preventDefault();
			return;
		}
		playheadT = newT;
		if (selection?.kind === 'prop-kf') {
			selection = {
				kind: 'property',
				componentId: (selection as { componentId: string }).componentId,
				prop: (selection as { prop: AnimatablePropertyKey }).prop,
			};
		} else if (selection?.kind === 'legacy-kf') {
			selection = { kind: 'component', componentId: (selection as { componentId: string }).componentId };
		}
		multiSelection = [];
		scrubbing = true;
		scrubStartX = e.clientX;
		scrubStartT = newT;
		e.preventDefault();
	}

	let scrubbing = $state(false);
	let scrubStartX = 0;
	let scrubStartT = 0;

	const STEP_MS = 1;

	function stepFrame(direction: 1 | -1) {
		if (!selectedTrack) return;
		playheadT = Math.max(0, Math.min(selectedTrack.durationMs, Math.round(playheadT + direction * STEP_MS)));
	}

	const uniqueKfTimes = $derived.by(() => {
		if (!selectedTrack) return [] as number[];
		const set = new Set<number>();
		for (const lane of selectedTrack.lanes) {
			for (const kf of lane.keyframes) set.add(kf.t);
			if (lane.propertyKeyframes) {
				for (const prop of ANIMATABLE_PROPERTIES) {
					for (const kf of lane.propertyKeyframes[prop] ?? []) set.add(kf.t);
				}
			}
		}
		return [...set].sort((a, b) => a - b);
	});

	function jumpKeyframe(direction: 1 | -1, toEdge = false) {
		if (!selectedTrack) return;
		if (uniqueKfTimes.length === 0) {
			playheadT = direction > 0 ? selectedTrack.durationMs : 0;
			return;
		}
		// Ctrl/Meta+click jumps to the first or last keyframe instead of the
		// neighbouring one. Matches the director's nav-button behavior.
		if (toEdge) {
			playheadT = direction > 0 ? uniqueKfTimes[uniqueKfTimes.length - 1] : uniqueKfTimes[0];
			return;
		}
		if (direction > 0) {
			const next = uniqueKfTimes.find(t => t > playheadT + 1);
			playheadT = next ?? selectedTrack.durationMs;
		} else {
			let prev: number | undefined;
			for (const t of uniqueKfTimes) {
				if (t < playheadT - 1) prev = t;
				else break;
			}
			playheadT = prev ?? 0;
		}
	}

	// ─── keyframe add/remove ─────────────────────────────────────────────────

	/**
	 * Chevron click from the inspector: toggle a property keyframe at the current
	 * playhead. Exposed to WYSIWYGComposerEditor via Svelte context.
	 */
	function togglePropertyKeyframe(componentId: string, prop: AnimatablePropertyKey, currentValue: number) {
		if (!selectedTrack) return;
		const lane = ensureLane(selectedTrack, componentId);
		const pkf = lanePropertyKeyframes(lane);
		const arr = pkf[prop];
		const existingIdx = arr.findIndex(k => k.t === Math.round(playheadT));
		if (existingIdx >= 0) {
			removePropertyKeyframe(lane, prop, existingIdx);
			selection = { kind: 'component', componentId };
		} else {
			const comp = (layer.components ?? []).find(c => ensureComponentId(c) === componentId);
			const base = componentBase(comp, prop);
			const stored = (prop === 'x' || prop === 'y' || prop === 'rotation') ? currentValue - base : currentValue;
			const idx = insertPropertyKeyframe(lane, prop, {
				t: Math.round(playheadT),
				v: stored,
				easing: { ...DEFAULT_EASING_V2 },
			});
			selection = { kind: 'prop-kf', componentId, prop, index: idx };
		}
		commit();
	}

	function chevronStateFor(componentId: string, prop: AnimatablePropertyKey): 'none' | 'between' | 'on' {
		if (!selectedTrack) return 'none';
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		if (!lane) return 'none';
		const pkf = lanePropertyKeyframes(lane);
		const arr = pkf[prop];
		if (arr.length === 0) return 'none';
		const onKf = arr.some(k => k.t === Math.round(playheadT));
		return onKf ? 'on' : 'between';
	}

	// Only animate properties that also exist as layout fields, plus opacity
	// (a universal CSS property with no layout counterpart). Scale is purely
	// a frame concept — having it animatable but not settable in Layout was
	// confusing, so it's gone.
	const USER_ANIMATABLE_PROPERTIES: AnimatablePropertyKey[] = ['opacity', 'x', 'y', 'rotation'];

	/**
	 * Static-component base for properties that the renderer combines additively
	 * with the animation frame: x/y come from the absolute layout position,
	 * rotation is added on top of the layout rotation. Other properties have
	 * no layout counterpart and so contribute zero to the base.
	 */
	function componentBase(comp: OverlayComponentData | undefined, prop: AnimatablePropertyKey): number {
		if (!comp) return 0;
		if (prop === 'x') return comp.x ?? 0;
		if (prop === 'y') return comp.y ?? 0;
		if (prop === 'rotation') return comp.rotation ?? 0;
		return 0;
	}

	/**
	 * The value the user expects to see in the inspector. For x / y / rotation
	 * we show the ABSOLUTE position (base + frame delta) so it matches where
	 * the component is actually drawn. For opacity we show the frame value
	 * directly (no layout counterpart). Falls back cleanly when no track or
	 * no keyframes exist (D8: static fallback).
	 */
	function valueAt(componentId: string, prop: AnimatablePropertyKey): number {
		const comp = (layer.components ?? []).find(c => ensureComponentId(c) === componentId);
		const base = componentBase(comp, prop);
		if (!selectedTrack) {
			return prop === 'opacity' ? PROP_DEFAULTS.opacity : base;
		}
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		if (!lane) {
			return prop === 'opacity' ? PROP_DEFAULTS.opacity : base;
		}
		const arr = lanePropertyKeyframes(lane)[prop] ?? [];
		const delta = interpPropertyKeyframes(arr, prop, Math.round(playheadT));
		if (prop === 'x' || prop === 'y' || prop === 'rotation') return base + delta;
		return delta;
	}

	/**
	 * Editing a property value from the inspector. Converts the user-visible
	 * absolute coordinate back to the frame delta before storing for x / y /
	 * rotation. If a keyframe already exists at the current playhead, update
	 * its `v`. Otherwise insert a new keyframe at the playhead (creating the
	 * property track if it doesn't exist yet) — D3: edit-off-keyframe creates.
	 */
	function setPropertyValueAtPlayhead(componentId: string, prop: AnimatablePropertyKey, value: number) {
		if (!selectedTrack) return;
		const comp = (layer.components ?? []).find(c => ensureComponentId(c) === componentId);
		const base = componentBase(comp, prop);
		// Translate user-visible absolute into stored delta for additive props.
		const stored = (prop === 'x' || prop === 'y' || prop === 'rotation') ? value - base : value;
		const lane = ensureLane(selectedTrack, componentId);
		const arr = lanePropertyKeyframes(lane)[prop] ?? [];
		const t = Math.round(playheadT);
		const existing = arr.findIndex(k => k.t === t);
		if (existing >= 0) {
			const persisted = lane.propertyKeyframes?.[prop] ?? [];
			const storedIdx = persisted.findIndex(k => k.t === t);
			if (storedIdx >= 0) {
				updatePropertyKeyframe(lane, prop, storedIdx, { v: stored });
			} else {
				// Merged value came from legacy keyframes; insert into per-property
				// storage so future edits go through the new path.
				insertPropertyKeyframe(lane, prop, { t, v: stored, easing: { ...DEFAULT_EASING_V2 } });
			}
		} else {
			insertPropertyKeyframe(lane, prop, { t, v: stored, easing: { ...DEFAULT_EASING_V2 } });
		}
		commit();
	}

	// Expose to WYSIWYGComposerEditor and similar editors via context.
	setContext('obs-utils.animWorkspace', {
		get playheadT() { return playheadT; },
		togglePropertyKeyframe,
		chevronStateFor,
	});

	function addKeyframeAtPlayhead(c: OverlayComponentData) {
		if (!selectedTrack) return;
		const componentId = ensureComponentId(c);
		const lane = ensureLane(selectedTrack, componentId);
		const t = Math.round(playheadT);
		for (const prop of USER_ANIMATABLE_PROPERTIES) {
			const arr = lanePropertyKeyframes(lane)[prop] ?? [];
			if (arr.some(k => k.t === t)) continue;
			const v = valueAt(componentId, prop) - componentBase(c, prop);
			insertPropertyKeyframe(lane, prop, { t, v, easing: { ...DEFAULT_EASING_V2 } });
		}
		commit();
	}

	function deleteLegacyKeyframe() {
		if (!selection || selection.kind !== 'legacy-kf' || !selectedLegacyKfRef) return;
		const componentId = selectedLegacyKfRef.lane.componentId;
		removeKeyframeOnLane(selectedLegacyKfRef.lane, selectedLegacyKfRef.index);
		selection = { kind: 'component', componentId };
		commit();
	}

	function deletePropKeyframe() {
		if (!selection || selection.kind !== 'prop-kf' || !selectedPropKfRef) return;
		const componentId = selectedPropKfRef.lane.componentId;
		removePropertyKeyframe(selectedPropKfRef.lane, selectedPropKfRef.prop, selectedPropKfRef.index);
		selection = { kind: 'component', componentId };
		commit();
	}

	function deleteMultiSelection() {
		if (!selectedTrack || multiSelection.length === 0) return;
		// Group refs by (lane, kind, prop?) then sort indices descending so
		// in-place splices in the underlying arrays don't shift the indices
		// we're about to use.
		const sorted = [...multiSelection].sort((a, b) => b.index - a.index);
		for (const ref of sorted) {
			const lane = selectedTrack.lanes.find(l => l.componentId === ref.componentId);
			if (!lane) continue;
			if (ref.kind === 'legacy') {
				removeKeyframeOnLane(lane, ref.index);
			} else {
				removePropertyKeyframe(lane, ref.prop, ref.index);
			}
		}
		multiSelection = [];
		commit();
	}

	function nudgeSelectedKeyframe(deltaMs: number) {
		if (!selectedTrack) return;
		if (selection?.kind === 'prop-kf' && selectedPropKfRef) {
			const newT = Math.max(0, Math.min(selectedTrack.durationMs, selectedPropKfRef.kf.t + deltaMs));
			const newIdx = updatePropertyKeyframe(selectedPropKfRef.lane, selectedPropKfRef.prop, selectedPropKfRef.index, { t: newT });
			if (newIdx >= 0) selection = { kind: 'prop-kf', componentId: selectedPropKfRef.lane.componentId, prop: selectedPropKfRef.prop, index: newIdx };
			playheadT = newT;
			commit();
		} else if (selection?.kind === 'legacy-kf' && selectedLegacyKfRef) {
			const newT = Math.max(0, Math.min(selectedTrack.durationMs, selectedLegacyKfRef.kf.t + deltaMs));
			const newIdx = updateKeyframeOnLane(selectedLegacyKfRef.lane, selectedLegacyKfRef.index, { t: newT });
			if (newIdx >= 0) selection = { kind: 'legacy-kf', componentId: selectedLegacyKfRef.lane.componentId, index: newIdx };
			playheadT = newT;
			commit();
		}
	}

	function onWindowKeyCapture(e: KeyboardEvent) {
		const t = e.target as HTMLElement | null;
		const tag = t?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;

		if (e.key === 'Backspace' || e.key === 'Delete') {
			if (multiSelection.length > 0) {
				e.preventDefault();
				e.stopImmediatePropagation();
				deleteMultiSelection();
			} else if (selection?.kind === 'prop-kf') {
				e.preventDefault();
				e.stopImmediatePropagation();
				deletePropKeyframe();
			} else if (selection?.kind === 'legacy-kf') {
				e.preventDefault();
				e.stopImmediatePropagation();
				deleteLegacyKeyframe();
			}
			return;
		}

		if ((selection?.kind === 'prop-kf' || selection?.kind === 'legacy-kf')
			&& (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			const step = e.shiftKey ? 100 : e.ctrlKey || e.metaKey ? 10 : 1;
			const dir = e.key === 'ArrowLeft' ? -1 : 1;
			e.preventDefault();
			e.stopImmediatePropagation();
			nudgeSelectedKeyframe(step * dir);
		}
	}

	let actorDataTick = $state(0);
	let actorUpdateHookId = 0;

	onMount(() => {
		window.addEventListener('keydown', onWindowKeyCapture, { capture: true });
		actorUpdateHookId = Hooks.on('updateActor' as never, () => {
			actorDataTick = actorDataTick + 1;
		});
	});
	onDestroy(() => {
		window.removeEventListener('keydown', onWindowKeyCapture, { capture: true });
		if (actorUpdateHookId) Hooks.off('updateActor' as never, actorUpdateHookId);
	});

	function patchLegacyKeyframe(patch: Partial<TrackKeyframe>) {
		if (!selection || selection.kind !== 'legacy-kf' || !selectedLegacyKfRef) return;
		const sel = selection as { kind: 'legacy-kf'; componentId: string; index: number };
		const newIdx = updateKeyframeOnLane(selectedLegacyKfRef.lane, selectedLegacyKfRef.index, patch);
		if (newIdx >= 0) selection = { kind: 'legacy-kf', componentId: sel.componentId, index: newIdx };
		commit();
	}

	function patchPropKfValue(v: number) {
		if (!selection || selection.kind !== 'prop-kf' || !selectedPropKfRef) return;
		const sel = selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };
		const newIdx = updatePropertyKeyframe(selectedPropKfRef.lane, sel.prop, sel.index, { v });
		if (newIdx >= 0) selection = { ...sel, index: newIdx };
		commit();
	}

	function patchPropKfTime(t: number) {
		if (!selection || selection.kind !== 'prop-kf' || !selectedPropKfRef) return;
		const sel = selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };
		const newIdx = updatePropertyKeyframe(selectedPropKfRef.lane, sel.prop, sel.index, { t: Math.round(t) });
		if (newIdx >= 0) selection = { ...sel, index: newIdx };
		commit();
	}

	function patchPropKfEasing(patch: Partial<EasingV2>) {
		if (!selection || selection.kind !== 'prop-kf' || !selectedPropKfRef) return;
		const sel = selection as { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };
		const current = selectedPropKfRef.kf.easing ?? { ...DEFAULT_EASING_V2 };
		const next: EasingV2 = { ...current, ...patch };
		const newIdx = updatePropertyKeyframe(selectedPropKfRef.lane, sel.prop, sel.index, { easing: next });
		if (newIdx >= 0) selection = { ...sel, index: newIdx };
		commit();
	}

	function patchLegacyKfField(field: keyof TrackKeyframe, value: number) {
		patchLegacyKeyframe({ [field]: value });
	}

	// ─── transitions ─────────────────────────────────────────────────────────

	const availableTriggers = $derived.by(() => {
		const out: Array<{ key: string; name: string }> = [];
		for (const [key, reg] of getApi().overlayTriggers) {
			const label = reg.name ? (game.i18n?.localize(reg.name) ?? reg.name) : key;
			out.push({ key, name: label });
		}
		return out;
	});

	function addTransition() {
		if (!layer.animation || !selectedTrack) return;
		const firstTriggerKey = availableTriggers[0]?.key ?? 'core.onPlayerRoll';
		const targetTrack = layer.animation.tracks.find(t => t.id !== selectedTrack.id) ?? selectedTrack;
		layer.animation.transitions = [
			...layer.animation.transitions,
			{
				triggerKey: firstTriggerKey,
				fromTrackId: selectedTrack.id,
				zones: [{
					startT: 0,
					endT: selectedTrack.durationMs,
					destination: { type: 'goto', toTrackId: targetTrack.id, toTime: 0 },
				}],
			},
		];
		commit();
	}

	function removeTransition(index: number) {
		if (!layer.animation) return;
		layer.animation.transitions = layer.animation.transitions.filter((_, i) => i !== index);
		commit();
	}

	function patchTransitionTrigger(index: number, triggerKey: string) {
		if (!layer.animation) return;
		const t = layer.animation.transitions[index];
		if (!t) return;
		t.triggerKey = triggerKey;
		commit();
	}

	function addZone(transitionIndex: number) {
		if (!layer.animation || !selectedTrack) return;
		const t = layer.animation.transitions[transitionIndex];
		if (!t) return;
		const lastEnd = t.zones.length > 0 ? t.zones[t.zones.length - 1].endT : 0;
		const fallback = layer.animation.tracks.find(x => x.id !== t.fromTrackId) ?? layer.animation.tracks[0];
		t.zones = [
			...t.zones,
			{
				startT: lastEnd,
				endT: selectedTrack.durationMs,
				destination: { type: 'goto', toTrackId: fallback.id, toTime: 0 },
			},
		];
		commit();
	}

	function removeZone(transitionIndex: number, zoneIndex: number) {
		if (!layer.animation) return;
		const t = layer.animation.transitions[transitionIndex];
		if (!t) return;
		t.zones = t.zones.filter((_, i) => i !== zoneIndex);
		commit();
	}

	function patchZoneRange(transitionIndex: number, zoneIndex: number, field: 'startT' | 'endT', value: number) {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z) return;
		z[field] = Math.max(0, value);
		commit();
	}

	function patchZoneDestType(transitionIndex: number, zoneIndex: number, type: 'goto' | 'ignore') {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z) return;
		if (type === 'ignore') {
			z.destination = { type: 'ignore' };
		} else {
			const target = layer.animation.tracks[0];
			z.destination = { type: 'goto', toTrackId: target.id, toTime: 0 };
		}
		commit();
	}

	function patchZoneDestTrack(transitionIndex: number, zoneIndex: number, toTrackId: string) {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z || z.destination.type !== 'goto') return;
		z.destination = { ...z.destination, toTrackId };
		commit();
	}

	function patchZoneDestTime(transitionIndex: number, zoneIndex: number, toTime: number) {
		if (!layer.animation) return;
		const z = layer.animation.transitions[transitionIndex]?.zones[zoneIndex];
		if (!z || z.destination.type !== 'goto') return;
		z.destination = { ...z.destination, toTime: Math.max(0, toTime) };
		commit();
	}

	function testFire(triggerKey: string) {
		getApi().fireOverlayTrigger(triggerKey, {});
	}

	const transitionsForCurrentTrack = $derived.by(() => {
		if (!layer.animation || !selectedTrack) return [] as Array<{ transition: typeof layer.animation.transitions[number]; index: number }>;
		const out: Array<{ transition: typeof layer.animation.transitions[number]; index: number }> = [];
		layer.animation.transitions.forEach((tr, i) => {
			if (tr.fromTrackId === selectedTrack.id) out.push({ transition: tr, index: i });
		});
		return out;
	});

	const transitionsCountWithEndBehavior = $derived(
		transitionsForCurrentTrack.length + (selectedTrack?.behavior.type === 'transition-on-end' ? 1 : 0),
	);

	// ─── keyframe drag ───────────────────────────────────────────────────────

	type KfRef =
		| { kind: 'legacy'; componentId: string; index: number }
		| { kind: 'prop'; componentId: string; prop: AnimatablePropertyKey; index: number };

	function kfRefId(ref: KfRef): string {
		return ref.kind === 'legacy'
			? `legacy:${ref.componentId}:${ref.index}`
			: `prop:${ref.componentId}:${ref.prop}:${ref.index}`;
	}

	function kfRefTime(ref: KfRef): number | null {
		if (!selectedTrack) return null;
		const lane = selectedTrack.lanes.find(l => l.componentId === ref.componentId);
		if (!lane) return null;
		if (ref.kind === 'legacy') return lane.keyframes[ref.index]?.t ?? null;
		return lane.propertyKeyframes?.[ref.prop]?.[ref.index]?.t ?? null;
	}

	function isInMultiSelection(ref: KfRef): boolean {
		const id = kfRefId(ref);
		return multiSelection.some(r => kfRefId(r) === id);
	}

	// Lasso-selected keyframes. Independent of the single `selection` so single-
	// click flows stay unchanged; multi-only operations (delete, group-drag)
	// check this first and fall back to `selection` when empty.
	let multiSelection = $state<KfRef[]>([]);

	type DragTarget =
		| { kind: 'legacy'; componentId: string; index: number; startX: number; startT: number }
		| { kind: 'prop'; componentId: string; prop: AnimatablePropertyKey; index: number; startX: number; startT: number }
		| { kind: 'aggregate'; componentId: string; times: number[]; startX: number; startBaseT: number }
		| { kind: 'multi'; startX: number; refs: Array<KfRef & { startT: number }> }
		| { kind: 'lasso'; startX: number; startY: number; endX: number; endY: number };

	let dragging = $state<DragTarget | null>(null);

	function startMultiDragFromRef(e: MouseEvent, anchor: KfRef): boolean {
		if (!selectedTrack) return false;
		if (!isInMultiSelection(anchor)) return false;
		const refs: Array<KfRef & { startT: number }> = [];
		for (const ref of multiSelection) {
			const t = kfRefTime(ref);
			if (t === null) continue;
			refs.push({ ...ref, startT: t });
		}
		dragging = { kind: 'multi', startX: e.clientX, refs };
		return true;
	}

	function startLegacyKfDrag(e: MouseEvent, componentId: string, index: number) {
		if (!selectedTrack) return;
		e.preventDefault();
		e.stopPropagation();
		const anchor: KfRef = { kind: 'legacy', componentId, index };
		if (startMultiDragFromRef(e, anchor)) return;
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		const kf = lane?.keyframes[index];
		if (!kf) return;
		multiSelection = [];
		selection = { kind: 'legacy-kf', componentId, index };
		dragging = { kind: 'legacy', componentId, index, startX: e.clientX, startT: kf.t };
	}

	function startPropKfDrag(e: MouseEvent, componentId: string, prop: AnimatablePropertyKey, index: number) {
		if (!selectedTrack) return;
		e.preventDefault();
		e.stopPropagation();
		const anchor: KfRef = { kind: 'prop', componentId, prop, index };
		if (startMultiDragFromRef(e, anchor)) return;
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		const arr = lane?.propertyKeyframes?.[prop];
		const kf = arr?.[index];
		if (!kf) return;
		multiSelection = [];
		selection = { kind: 'prop-kf', componentId, prop, index };
		dragging = { kind: 'prop', componentId, prop, index, startX: e.clientX, startT: kf.t };
	}

	/**
	 * Aggregated drag on the component header: shifts ALL keyframes at the
	 * clicked timestamp together across every property row.
	 */
	function startAggregateDrag(e: MouseEvent, componentId: string, t: number) {
		if (!selectedTrack) return;
		e.preventDefault();
		e.stopPropagation();
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		if (!lane) return;
		// Collect the set of times that will move together. The dragged marker
		// represents a single timestamp; we move all keyframes at exactly that t.
		dragging = { kind: 'aggregate', componentId, times: [t], startX: e.clientX, startBaseT: t };
	}

	/**
	 * Snap a candidate ms position to the playhead if it's within a few
	 * pixels. The threshold scales with the current pixel-per-ms so the snap
	 * radius feels consistent regardless of track duration / timeline zoom.
	 */
	function snapToPlayhead(candidateMs: number): number {
		if (!selectedTrack) return candidateMs;
		const w = timelineInner();
		if (w <= 0) return candidateMs;
		const pxPerMs = w / Math.max(1, selectedTrack.durationMs);
		const snapPx = 6;
		const snapMs = snapPx / pxPerMs;
		if (Math.abs(candidateMs - playheadT) <= snapMs) return Math.round(playheadT);
		return candidateMs;
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (scrubbing && selectedTrack) {
			const dx = e.clientX - scrubStartX;
			const dMs = (dx / timelineInner()) * selectedTrack.durationMs;
			playheadT = Math.max(0, Math.min(selectedTrack.durationMs, Math.round(scrubStartT + dMs)));
			return;
		}
		if (!dragging || !selectedTrack) return;

		const dx = e.clientX - dragging.startX;
		const dMs = Math.round((dx / timelineInner()) * selectedTrack.durationMs);

		if (dragging.kind === 'lasso') {
			dragging = { ...dragging, endX: e.clientX, endY: e.clientY };
			return;
		}

		if (dragging.kind === 'multi') {
			for (const ref of dragging.refs) {
				const lane = selectedTrack.lanes.find(l => l.componentId === ref.componentId);
				if (!lane) continue;
				const raw = Math.max(0, Math.min(selectedTrack.durationMs, ref.startT + dMs));
				const newT = snapToPlayhead(raw);
				if (ref.kind === 'legacy') {
					const newIdx = updateKeyframeOnLane(lane, ref.index, { t: newT });
					ref.index = newIdx;
				} else {
					const newIdx = updatePropertyKeyframe(lane, ref.prop, ref.index, { t: newT });
					ref.index = newIdx;
				}
			}
			commit();
			return;
		}

		if (dragging.kind === 'legacy') {
			const lane = selectedTrack.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const raw = Math.max(0, Math.min(selectedTrack.durationMs, dragging.startT + dMs));
			const newT = snapToPlayhead(raw);
			const newIdx = updateKeyframeOnLane(lane, dragging.index, { t: newT });
			dragging.index = newIdx;
			selection = { kind: 'legacy-kf', componentId: dragging.componentId, index: newIdx };
			commit();
		} else if (dragging.kind === 'prop') {
			const lane = selectedTrack.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const raw = Math.max(0, Math.min(selectedTrack.durationMs, dragging.startT + dMs));
			const newT = snapToPlayhead(raw);
			const newIdx = updatePropertyKeyframe(lane, dragging.prop, dragging.index, { t: newT });
			dragging.index = newIdx;
			selection = { kind: 'prop-kf', componentId: dragging.componentId, prop: dragging.prop, index: newIdx };
			commit();
		} else if (dragging.kind === 'aggregate') {
			const lane = selectedTrack.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const origT = dragging.startBaseT;
			const raw = Math.max(0, Math.min(selectedTrack.durationMs, origT + dMs));
			const newT = snapToPlayhead(raw);
			const actualDelta = newT - origT;
			if (actualDelta === 0) return;

			// Move matching legacy keyframes.
			for (let i = 0; i < lane.keyframes.length; i++) {
				if (lane.keyframes[i].t === origT) {
					updateKeyframeOnLane(lane, i, { t: Math.max(0, Math.min(selectedTrack.durationMs, origT + actualDelta)) });
				}
			}
			// Move matching per-property keyframes.
			if (lane.propertyKeyframes) {
				for (const prop of ANIMATABLE_PROPERTIES) {
					const arr = lane.propertyKeyframes[prop];
					if (!arr) continue;
					for (let i = 0; i < arr.length; i++) {
						if (arr[i].t === origT) {
							updatePropertyKeyframe(lane, prop, i, { t: Math.max(0, Math.min(selectedTrack.durationMs, origT + actualDelta)) });
						}
					}
				}
			}
			// Track the new base time so subsequent move events are relative to it.
			dragging.startBaseT = newT;
			dragging.startX = e.clientX;
			commit();
		}
	}

	function onWindowMouseUp() {
		// Finalize lasso: hit-test every kf-marker DOM rect against the dragged
		// rectangle. Markers carry a `data-kf-ref` attribute (`legacy:cid:idx` or
		// `prop:cid:prop:idx`) we parse back into a KfRef.
		if (dragging?.kind === 'lasso' && timelineEl) {
			const lx = Math.min(dragging.startX, dragging.endX);
			const ly = Math.min(dragging.startY, dragging.endY);
			const rx = Math.max(dragging.startX, dragging.endX);
			const ry = Math.max(dragging.startY, dragging.endY);
			const hits: KfRef[] = [];
			const markers = timelineEl.querySelectorAll<HTMLElement>('.kf-marker[data-kf-ref]');
			for (const m of markers) {
				const r = m.getBoundingClientRect();
				if (r.right < lx || r.left > rx || r.bottom < ly || r.top > ry) continue;
				const ref = parseKfRef(m.dataset.kfRef ?? '');
				if (ref) hits.push(ref);
			}
			multiSelection = hits;
		}
		dragging = null;
		scrubbing = false;
	}

	function parseKfRef(s: string): KfRef | null {
		const parts = s.split(':');
		if (parts[0] === 'legacy' && parts.length === 3) {
			return { kind: 'legacy', componentId: parts[1], index: Number(parts[2]) };
		}
		if (parts[0] === 'prop' && parts.length === 4) {
			return { kind: 'prop', componentId: parts[1], prop: parts[2] as AnimatablePropertyKey, index: Number(parts[3]) };
		}
		return null;
	}

	$effect(() => {
		void selectedTrackId;
		playheadT = 0;
		selection = null;
	});

	$effect(() => {
		clampPlayhead();
	});

	// ─── focused live preview ────────────────────────────────────────────────
	// The preview pane shows the overlay at the editor's scrub position, not at
	// whatever the playback engine would naturally do. We bypass OverlayHost
	// (which would auto-play the initial track) and feed `buildPreviewOverlay`
	// a manually-computed frame from `computeTrackFrame(selectedTrack, playheadT)`
	// so opacity / transforms reflect the scrubbed state in real time.

	const actorIDsStore = settings.getReadableStore('overlayActors');
	const previewActorIDs = $derived(($actorIDsStore ?? []).slice(0, 1));
	const PREVIEW_FRAME_W = 300;
	const PREVIEW_FRAME_H = 180;
	const previewScale = $derived.by(() => {
		const w = layer.config?.w ?? 300;
		const h = layer.config?.h ?? 300;
		if (w <= 0 || h <= 0) return 1;
		return Math.min(PREVIEW_FRAME_W / w, PREVIEW_FRAME_H / h, 1);
	});

	const previewActor = $derived.by(() => {
		void actorDataTick;
		const id = previewActorIDs[0];
		if (!id) return null;
		const a = (game as { actors?: { get?: (id: string) => unknown } }).actors?.get?.(id);
		return a ?? null;
	});

	const previewFrame = $derived.by(() => {
		if (!selectedTrack) return undefined;
		const frame = computeTrackFrame(selectedTrack, playheadT);
		return {
			activeTrackId: selectedTrack.id,
			playheadT,
			components: frame,
		};
	});

	const previewRendered = $derived.by(() => {
		return buildPreviewOverlay(layer, previewActor, previewFrame);
	});

	const previewOverlayType = $derived(layer.type);
	const previewOverlayComponent = $derived.by(() => {
		const entry = getApi().overlayTypes.get(previewOverlayType);
		return entry?.overlayClass ?? null;
	});

	let transitionsOpen = $state(false);

	const EQUATION_LABELS: Record<string, string> = {
		sinusoidal: 'Sinusoidal', quadratic: 'Quadratic', cubic: 'Cubic',
		quartic: 'Quartic', quintic: 'Quintic', exponential: 'Exponential',
		circular: 'Circular', back: 'Back', bounce: 'Bounce', elastic: 'Elastic',
	};

	const EQUATIONS: EasingEquation[] = [
		'sinusoidal', 'quadratic', 'cubic', 'quartic', 'quintic',
		'exponential', 'circular', 'back', 'bounce', 'elastic',
	];

	const INTERP_LABELS: Record<EasingInterpolation, string> = {
		constant: 'Constant',
		linear: 'Linear',
		bezier: 'Bezier',
	};

	const PROP_LABELS: Record<AnimatablePropertyKey, string> = {
		opacity: 'Opacity',
		x: 'X',
		y: 'Y',
		rotation: 'Rotation',
		scaleX: 'Scale X',
		scaleY: 'Scale Y',
	};

	/**
	 * Shape + color encoding for a keyframe marker. After Effects / Blender
	 * style: shape conveys interpolation mode, color conveys easing equation
	 * (for beziers). The user can read the curve at a glance regardless of
	 * which keyframe is selected or which mode the inspector is in.
	 */
	function kfMarkerClass(easing: EasingV2 | undefined): string {
		const interp = easing?.interpolation ?? 'bezier';
		if (interp === 'constant') return 'kf-marker kf-constant';
		if (interp === 'linear') return 'kf-marker kf-linear';
		const eq = easing?.equation ?? 'sinusoidal';
		return `kf-marker kf-bezier kf-eq-${eq}`;
	}
</script>

<svelte:window onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} />

<div class='anim-workspace' bind:this={workspaceEl}>
	{#if !layer.animation}
		<div class='no-anim'>
			<i class='fas fa-film'></i>
			<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.intro')}</p>
			<button type='button' class='primary-btn' onclick={ensureAnimation}>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.start')}
			</button>
		</div>
	{:else}
		<aside class='tracks-pane'>
			<header class='pane-head'>
				<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}</h3>
				<button type='button' class='add-btn' onclick={addTrack} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTrack')}>
					<i class='fas fa-plus'></i>
				</button>
			</header>
			<ul class='track-list'>
				{#each layer.animation.tracks as track (track.id)}
					<li class='track-row' class:selected={selectedTrackId === track.id}>
						<button type='button' class='track-pick' onclick={() => (selectedTrackId = track.id)}>
							{#if layer.animation.initialTrackId === track.id}
								<i class='fas fa-flag initial-flag' title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialTrack')}></i>
							{/if}
							<span class='track-name'>{track.name}</span>
							<span class='track-behavior'>{track.behavior.type}</span>
						</button>
						<button
							type='button'
							class='row-btn danger'
							title={layer.animation.tracks.length > 1
								? (game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTrack') ?? 'Remove track')
								: (game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeLastTrackHint') ?? 'Remove animation')}
							onclick={() => requestRemoveTrack(track.id)}
						>
							<i class='fas fa-trash'></i>
						</button>
					</li>
				{/each}
			</ul>
		</aside>

		<section class='center-col'>
			{#if selectedTrack}
				<header class='track-bar'>
					<input
						type='text'
						class='track-name-input'
						value={selectedTrack.name}
						onchange={e => renameTrack(selectedTrack, (e.currentTarget as HTMLInputElement).value)}
						placeholder={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}
					/>
					<div class='behavior-group' role='radiogroup' aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behavior')}>
						{#each behaviorOptions as opt (opt.value)}
							<button
								type='button'
								class='behavior-btn'
								class:active={selectedTrack.behavior.type === opt.value}
								title={game.i18n?.localize(opt.labelKey) ?? opt.value}
								aria-label={game.i18n?.localize(opt.labelKey) ?? opt.value}
								onclick={() => setBehavior(selectedTrack, opt.value)}
							>
								<i class={opt.icon}></i>
							</button>
						{/each}
					</div>
					{#if selectedTrack.behavior.type !== 'static'}
						<label class='inline-field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.duration')}</span>
							<input
								type='number'
								class='narrow'
								min='0'
								value={selectedTrack.durationMs}
								onchange={e => setDuration(selectedTrack, Number((e.currentTarget as HTMLInputElement).value) || 0)}
							/>
						</label>
					{/if}
					<button
						type='button'
						class='initial-btn'
						class:active={layer.animation.initialTrackId === selectedTrack.id}
						onclick={() => setInitialTrack(selectedTrack.id)}
						title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.useAsInitial')}
					>
						<i class='fas fa-flag'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialShort')}</span>
					</button>
					<button
						type='button'
						class='tx-btn'
						onclick={() => (transitionsOpen = !transitionsOpen)}
						class:active={transitionsOpen}
						disabled={layer.animation.tracks.length < 2}
						title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')}
					>
						<i class='fas fa-diagram-project'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')}</span>
						{#if transitionsCountWithEndBehavior > 0}
							<span class='tx-count'>{transitionsCountWithEndBehavior}</span>
						{/if}
					</button>
				</header>

				<div class='timeline-controls'>
					<div class='nav-buttons'>
						<button type='button' class='small-btn' onclick={(e) => jumpKeyframe(-1, e.ctrlKey || e.metaKey)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.prevKeyframe')}>
							<i class='fas fa-backward-step'></i>
						</button>
						<button type='button' class='small-btn' onclick={() => stepFrame(-1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.prevFrame')}>
							<i class='fas fa-caret-left'></i>
						</button>
						{#if !isPlaying}
							<button type='button' class='small-btn primary' onclick={startPlayback} disabled={!selectedTrack || selectedTrack.durationMs <= 0} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.play') ?? 'Play'}>
								<i class='fas fa-play'></i>
							</button>
						{:else}
							<button type='button' class='small-btn active' onclick={stopPlayback} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.stop') ?? 'Stop'}>
								<i class='fas fa-stop'></i>
							</button>
						{/if}
						<button type='button' class='small-btn' onclick={() => stepFrame(1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.nextFrame')}>
							<i class='fas fa-caret-right'></i>
						</button>
						<button type='button' class='small-btn' onclick={(e) => jumpKeyframe(1, e.ctrlKey || e.metaKey)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.nextKeyframe')}>
							<i class='fas fa-forward-step'></i>
						</button>
					</div>
					<label class='inline-field'>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.playhead')}</span>
						<input
							type='number'
							class='narrow'
							min='0'
							max={selectedTrack.durationMs}
							value={Math.round(playheadT)}
							onchange={e => { playheadT = Math.max(0, Math.min(selectedTrack.durationMs, Number((e.currentTarget as HTMLInputElement).value) || 0)); }}
						/>
						<span class='units'>/ {selectedTrack.durationMs} ms</span>
					</label>
				</div>

				<!-- Blender-style nested timeline -->
				<div class='lanes-frame'>
					<div class='lane-heads'>
						{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
							{@const componentId = ensureComponentId(comp)}
							{@const isExpanded = expandedComponents.has(componentId)}
							{@const lane = selectedTrack.lanes.find(l => l.componentId === componentId)}

							<!-- Component header row -->
							<div
								class='lane-head comp-header'
								class:selected={selection?.kind === 'component' && selection.componentId === componentId}
								role='button'
								tabindex='0'
								onclick={() => { selection = { kind: 'component', componentId }; }}
								onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') { selection = { kind: 'component', componentId }; } }}
							>
								<button
									type='button'
									class='expand-btn'
									onclick={e => { e.stopPropagation(); toggleExpanded(componentId); }}
									title={isExpanded ? 'Collapse' : 'Expand properties'}
									aria-expanded={isExpanded}
								>
									<i class={isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'}></i>
								</button>
								<span class='lane-name'>{componentLabel(comp)}</span>
								<button
									type='button'
									class='lane-add'
									title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addKeyframe')}
									onclick={e => { e.stopPropagation(); addKeyframeAtPlayhead(comp); }}
								><i class='fas fa-plus'></i></button>
							</div>

							<!-- Per-property rows (only when expanded) -->
							{#if isExpanded}
								{#each USER_ANIMATABLE_PROPERTIES as prop}
									{@const pkf = lane ? lanePropertyKeyframes(lane)[prop] : []}
									<div
										class='lane-head prop-row'
										class:selected={selection?.kind === 'property' && selection.componentId === componentId && (selection as { prop: string }).prop === prop}
										role='button'
										tabindex='0'
										onclick={() => { selection = { kind: 'property', componentId, prop }; }}
										onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') { selection = { kind: 'property', componentId, prop }; } }}
									>
										<span class='prop-indent'></span>
										<span class='lane-name prop-name'>{prop}</span>
										<span class='prop-kf-count' class:has-kf={pkf.length > 0}>{pkf.length > 0 ? pkf.length : ''}</span>
									</div>
								{/each}
							{/if}
						{/each}
					</div>

					<div
						class='lane-strips'
						bind:this={timelineEl}
						onmousedown={onTimelineMouseDown}
						role='presentation'
					>
						{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
							{@const componentId = ensureComponentId(comp)}
							{@const isExpanded = expandedComponents.has(componentId)}
							{@const lane = selectedTrack.lanes.find(l => l.componentId === componentId)}
							{@const aggTimes = lane ? laneAggregateTimes(lane) : []}

							<!-- Aggregated component header strip -->
							<div class='lane-strip comp-strip'>
								{#each aggTimes as t (t)}
									<div
										class='kf-marker kf-bezier kf-aggregate'
										class:selected={false}
										style={`left: ${tToX(t, selectedTrack.durationMs)}px;`}
										onmousedown={e => startAggregateDrag(e, componentId, t)}
										onclick={e => { e.stopPropagation(); selection = { kind: 'component', componentId }; }}
										role='button'
										tabindex='0'
										aria-label={`Aggregate keyframe at ${t}ms`}
									></div>
								{/each}

								<!-- Legacy keyframe markers on the header strip -->
								{#if lane}
									{#each lane.keyframes as kf, idx (idx + '-' + kf.t)}
										<div
											class={kfMarkerClass(undefined) + ' kf-legacy'}
											class:selected={selection?.kind === 'legacy-kf' && selection.componentId === componentId && (selection as { index: number }).index === idx}
											class:multi-selected={isInMultiSelection({ kind: 'legacy', componentId, index: idx })}
											style={`left: ${tToX(kf.t, selectedTrack.durationMs)}px;`}
											data-kf-ref={`legacy:${componentId}:${idx}`}
											onmousedown={e => startLegacyKfDrag(e, componentId, idx)}
											onclick={e => { e.stopPropagation(); playheadT = kf.t; if (!isInMultiSelection({ kind: 'legacy', componentId, index: idx })) multiSelection = []; selection = { kind: 'legacy-kf', componentId, index: idx }; }}
											role='button'
											tabindex='0'
											aria-label={`Keyframe at ${kf.t}ms`}
										></div>
									{/each}
								{/if}
							</div>

							<!-- Per-property strips (only when expanded) -->
							{#if isExpanded}
								{#each USER_ANIMATABLE_PROPERTIES as prop}
									{@const pkf = lane ? (lanePropertyKeyframes(lane)[prop] ?? []) : []}
									<div class='lane-strip prop-strip'>
										{#each pkf as kf, idx (idx + '-' + kf.t)}
											<div
												class={kfMarkerClass(kf.easing)}
												class:selected={selection?.kind === 'prop-kf' && selection.componentId === componentId && (selection as { prop: string }).prop === prop && (selection as { index: number }).index === idx}
												class:multi-selected={isInMultiSelection({ kind: 'prop', componentId, prop, index: idx })}
												style={`left: ${tToX(kf.t, selectedTrack.durationMs)}px;`}
												data-kf-ref={`prop:${componentId}:${prop}:${idx}`}
												onmousedown={e => startPropKfDrag(e, componentId, prop, idx)}
												onclick={e => { e.stopPropagation(); playheadT = kf.t; if (!isInMultiSelection({ kind: 'prop', componentId, prop, index: idx })) multiSelection = []; selection = { kind: 'prop-kf', componentId, prop, index: idx }; }}
												role='button'
												tabindex='0'
												aria-label={`${prop} keyframe at ${kf.t}ms`}
											></div>
										{/each}
									</div>
								{/each}
							{/if}
						{/each}

						<div class='playhead' style={`left: ${tToX(playheadT, selectedTrack.durationMs)}px;`}></div>
					</div>
				</div>
			{:else}
				<div class='empty-detail'>
					<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.selectTrack')}</p>
				</div>
			{/if}
		</section>

		<!-- Right column: preview + inspector -->
		<aside class='right-col'>
			<div class='live-preview'>
				<header class='live-preview-head'>
					<i class='fas fa-eye'></i>
					<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.livePreview')}</span>
				</header>
				<div class='live-preview-frame' style={`width: ${PREVIEW_FRAME_W}px; height: ${PREVIEW_FRAME_H}px;`}>
					<div class='live-preview-stage' style={`transform: scale(${previewScale}); transform-origin: top left;`}>
						{#if previewOverlayComponent}
							<svelte:component this={previewOverlayComponent} overlay={previewRendered} overlayIndex={0} />
						{/if}
					</div>
				</div>
			</div>

			<div class='kf-inspector'>
				{#if activeComponentId && selectedTrack}
					{@const compId = activeComponentId}
					{@const comp = (layer.components ?? []).find(c => ensureComponentId(c) === compId)}
					{@const lane = selectedTrack.lanes.find(l => l.componentId === compId)}
					{#if comp}
						<header class='kf-detail-head'>
							<i class='fas fa-layer-group' style='font-size: 10px; opacity: 0.8'></i>
							<span>{componentLabel(comp)}</span>
						</header>
						<div class='prop-chevron-list'>
							{#each USER_ANIMATABLE_PROPERTIES as prop}
								{@const pkf = lane ? (lanePropertyKeyframes(lane)[prop] ?? []) : []}
								{@const onKf = pkf.some(k => k.t === Math.round(playheadT))}
								{@const hasTrack = pkf.length > 0}
								{@const curVal = valueAt(compId, prop)}
								{@const isOpacity = prop === 'opacity'}
								{@const stepSize = isOpacity ? 1 : 1}
								{@const displayVal = isOpacity ? Math.round(curVal * 100) : Number(curVal.toFixed(2))}
								{@const isExpanded = selectedPropKfRef?.prop === prop && selection?.kind === 'prop-kf' && (selection as { componentId: string }).componentId === compId}
								{@const easing = isExpanded && selectedPropKfRef ? (selectedPropKfRef.kf.easing ?? DEFAULT_EASING_V2) : null}
								<div
									class='prop-value-row'
									class:expanded={isExpanded}
									class:selected={selection?.kind === 'property' && (selection as { componentId: string }).componentId === compId && (selection as { prop: string }).prop === prop}
									onclick={(e) => {
										if ((e.target as HTMLElement).closest('input, button')) return;
										selection = { kind: 'property', componentId: compId, prop };
									}}
									role='button'
									tabindex='0'
								>
									<span class='prop-label'>{PROP_LABELS[prop]}</span>
									<input
										class='prop-value-input'
										type='number'
										step={stepSize}
										min={isOpacity ? 0 : undefined}
										max={isOpacity ? 100 : undefined}
										value={displayVal}
										onchange={e => {
											const raw = Number((e.currentTarget as HTMLInputElement).value);
											const stored = isOpacity ? raw / 100 : raw;
											setPropertyValueAtPlayhead(compId, prop, stored);
										}}
									/>
									{#if isOpacity}<span class='prop-unit'>%</span>{/if}
									<button
										type='button'
										class='kf-chevron-btn'
										class:state-none={!hasTrack}
										class:state-between={hasTrack && !onKf}
										class:state-on={onKf}
										title={onKf
											? 'Remove keyframe at playhead'
											: hasTrack
												? 'Add keyframe at playhead with current value'
												: 'Create property track + add keyframe at playhead'}
										onclick={() => togglePropertyKeyframe(compId, prop, curVal)}
									>
										<i class='fas fa-diamond'></i>
									</button>
								</div>

								{#if isExpanded && easing && selectedPropKfRef}
									<div class='prop-kf-expansion'>
										<div class='prop-kf-row'>
											<span class='kf-row-label'>Time</span>
											<input
												type='number'
												min='0'
												max={selectedTrack.durationMs}
												value={selectedPropKfRef.kf.t}
												onchange={e => patchPropKfTime(Number((e.currentTarget as HTMLInputElement).value) || 0)}
											/>
											<span class='kf-row-unit'>ms</span>
										</div>
										<div class='prop-kf-row interp-row'>
											{#each (['constant', 'linear', 'bezier'] as EasingInterpolation[]) as mode}
												<button
													type='button'
													class='interp-chip'
													class:active={easing.interpolation === mode}
													onclick={() => patchPropKfEasing({ interpolation: mode })}
												>{INTERP_LABELS[mode]}</button>
											{/each}
										</div>
										{#if easing.interpolation === 'bezier'}
											<div class='prop-kf-row'>
												<select
													class='eq-select'
													value={easing.equation ?? 'sinusoidal'}
													onchange={e => patchPropKfEasing({ equation: (e.currentTarget as HTMLSelectElement).value as EasingEquation })}
												>
													{#each EQUATIONS as eq}
														<option value={eq}>{EQUATION_LABELS[eq]}</option>
													{/each}
												</select>
											</div>
											<div class='prop-kf-row dir-row'>
												{#each (['in', 'out', 'inout', 'auto'] as EasingDirection[]) as dir}
													<button
														type='button'
														class='dir-chip'
														class:active={easing.direction === dir}
														onclick={() => patchPropKfEasing({ direction: dir })}
													>{dir === 'inout' ? 'In/Out' : dir.charAt(0).toUpperCase() + dir.slice(1)}</button>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				{/if}
				{#if selectedLegacyKfRef && selectedTrack}
					<header class='kf-detail-head'>
						<i class='fas fa-circle' style='font-size: 8px; color: rgba(255,200,30,0.9)'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.keyframe')} t={selectedLegacyKfRef.kf.t}ms</span>
						<button type='button' class='row-btn danger' title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.deleteKeyframe')} onclick={deleteLegacyKeyframe}>
							<i class='fas fa-trash'></i>
						</button>
					</header>
					<div class='kf-grid'>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.time')}</span>
							<input type='number' min='0' max={selectedTrack.durationMs} value={selectedLegacyKfRef.kf.t} onchange={e => patchLegacyKfField('t', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.opacity')}</span>
							<input type='number' min='0' max='1' step='0.05' value={selectedLegacyKfRef.kf.opacity ?? 1} onchange={e => patchLegacyKfField('opacity', Number((e.currentTarget as HTMLInputElement).value))} />
						</label>
						<label class='field'>
							<span>X</span>
							<input type='number' value={selectedLegacyKfRef.kf.x ?? 0} onchange={e => patchLegacyKfField('x', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>Y</span>
							<input type='number' value={selectedLegacyKfRef.kf.y ?? 0} onchange={e => patchLegacyKfField('y', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.rotation')}</span>
							<input type='number' value={selectedLegacyKfRef.kf.rotation ?? 0} onchange={e => patchLegacyKfField('rotation', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
						</label>
						<label class='field'>
							<span>Scale X</span>
							<input type='number' step='0.05' value={selectedLegacyKfRef.kf.scaleX ?? 1} onchange={e => patchLegacyKfField('scaleX', Number((e.currentTarget as HTMLInputElement).value) || 1)} />
						</label>
						<label class='field'>
							<span>Scale Y</span>
							<input type='number' step='0.05' value={selectedLegacyKfRef.kf.scaleY ?? 1} onchange={e => patchLegacyKfField('scaleY', Number((e.currentTarget as HTMLInputElement).value) || 1)} />
						</label>
					</div>
				{/if}
				{#if !activeComponentId && !selectedPropKfRef && !selectedLegacyKfRef}
					<div class='kf-empty'>
						<i class='fas fa-mouse-pointer'></i>
						<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.kfSelectHint')}</p>
					</div>
				{/if}
			</div>
		</aside>

		<!-- Transitions drawer -->
		{#if transitionsOpen && selectedTrack}
			<div class='tx-drawer-backdrop' onclick={() => (transitionsOpen = false)} role='presentation'></div>
			<div class='tx-drawer' role='dialog' aria-modal='true'>
				<header class='tx-drawer-head'>
					<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')} <span class='dim'>· {selectedTrack.name}</span></h3>
					<div class='tx-drawer-actions'>
						<button type='button' class='small-btn' onclick={addTransition} disabled={layer.animation.tracks.length < 2}>
							<i class='fas fa-plus'></i>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTransition')}</span>
						</button>
						<button type='button' class='row-btn' onclick={() => (transitionsOpen = false)} title={game.i18n?.localize('obs-utils.strings.done')}>
							<i class='fas fa-times'></i>
						</button>
					</div>
				</header>

				<div class='tx-drawer-body'>
					{#if selectedTrack.behavior.type === 'transition-on-end'}
						<div class='transition-card end-of-track'>
							<div class='transition-head'>
								<label class='field inline'>
									<span><i class='fas fa-flag-checkered' style='opacity:0.6;margin-right:4px'></i>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.endOfTrack') ?? 'On end of track'}</span>
								</label>
							</div>
							<div class='zone-row'>
								<label class='field inline'>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</span>
									<select
										value={selectedTrack.behavior.toTrackId}
										onchange={e => setEndTransitionTarget(selectedTrack, (e.currentTarget as HTMLSelectElement).value)}
									>
										{#each layer.animation.tracks as t (t.id)}
											{#if t.id !== selectedTrack.id}<option value={t.id}>{t.name}</option>{/if}
										{/each}
									</select>
								</label>
								<label class='field inline narrow'>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTime')}</span>
									<input
										type='number'
										min='0'
										value={selectedTrack.behavior.toTime ?? 0}
										onchange={e => setEndTransitionTime(selectedTrack, Number((e.currentTarget as HTMLInputElement).value) || 0)}
									/>
								</label>
							</div>
						</div>
					{/if}

					{#if (layer.animation.tracks.length < 2 || transitionsForCurrentTrack.length === 0)
						&& selectedTrack.behavior.type !== 'transition-on-end'}
						<p class='hint'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.noTriggersHint')}</p>
					{/if}

					{#each transitionsForCurrentTrack as { transition, index } (index)}
						<div class='transition-card'>
							<div class='transition-head'>
								<label class='field inline'>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.trigger')}</span>
									<select value={transition.triggerKey} onchange={e => patchTransitionTrigger(index, (e.currentTarget as HTMLSelectElement).value)}>
										{#each availableTriggers as trig (trig.key)}
											<option value={trig.key}>{trig.name}</option>
										{/each}
									</select>
								</label>
								<button type='button' class='small-btn' onclick={() => testFire(transition.triggerKey)}>
									<i class='fas fa-play'></i>
									<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.testFire')}</span>
								</button>
								<button type='button' class='row-btn danger' onclick={() => removeTransition(index)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTransition')}>
									<i class='fas fa-trash'></i>
								</button>
							</div>

							{#each transition.zones as zone, zoneIdx (zoneIdx)}
								<div class='zone-row'>
									<label class='field inline narrow'>
										<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneStart')}</span>
										<input type='number' min='0' value={zone.startT} onchange={e => patchZoneRange(index, zoneIdx, 'startT', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
									</label>
									<label class='field inline narrow'>
										<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneEnd')}</span>
										<input type='number' min='0' value={zone.endT} onchange={e => patchZoneRange(index, zoneIdx, 'endT', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
									</label>
									<label class='field inline narrow'>
										<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneDestination')}</span>
										<select value={zone.destination.type} onchange={e => patchZoneDestType(index, zoneIdx, (e.currentTarget as HTMLSelectElement).value as 'goto' | 'ignore')}>
											<option value='goto'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</option>
											<option value='ignore'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneIgnore')}</option>
										</select>
									</label>
									{#if zone.destination.type === 'goto'}
										<label class='field inline narrow'>
											<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTrack')}</span>
											<select value={zone.destination.toTrackId} onchange={e => patchZoneDestTrack(index, zoneIdx, (e.currentTarget as HTMLSelectElement).value)}>
												{#each layer.animation.tracks as t (t.id)}
													<option value={t.id}>{t.name}</option>
												{/each}
											</select>
										</label>
										<label class='field inline narrow'>
											<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.zoneGotoTime')}</span>
											<input type='number' min='0' value={zone.destination.toTime} onchange={e => patchZoneDestTime(index, zoneIdx, Number((e.currentTarget as HTMLInputElement).value) || 0)} />
										</label>
									{/if}
									<button type='button' class='row-btn danger' onclick={() => removeZone(index, zoneIdx)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeZone')}>
										<i class='fas fa-times'></i>
									</button>
								</div>
							{/each}
							<button type='button' class='small-btn' onclick={() => addZone(index)}>
								<i class='fas fa-plus'></i>
								<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addZone')}</span>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	{#if dragging?.kind === 'lasso' && workspaceEl}
		{@const wr = workspaceEl.getBoundingClientRect()}
		{@const lx = Math.min(dragging.startX, dragging.endX) - wr.left}
		{@const ly = Math.min(dragging.startY, dragging.endY) - wr.top}
		{@const rx = Math.max(dragging.startX, dragging.endX) - wr.left}
		{@const ry = Math.max(dragging.startY, dragging.endY) - wr.top}
		<div
			class='lasso-rect'
			style={`left: ${lx}px; top: ${ly}px; width: ${Math.max(1, rx - lx)}px; height: ${Math.max(1, ry - ly)}px;`}
		></div>
	{/if}

</div>


<style lang='stylus'>
	.anim-workspace
		display grid
		grid-template-columns 180px minmax(0, 1fr) 320px
		gap 6px
		flex 1 1 auto
		padding 6px
		min-height 0
		overflow hidden
		position relative

	.no-anim
		grid-column 1 / -1
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 12px
		opacity 0.7

		i
			font-size 36px
			opacity 0.5

		p
			margin 0
			font-size 13px
			max-width 320px
			text-align center
			line-height 1.5

		.primary-btn
			height 32px
			padding 0 16px
			background rgba(255, 144, 0, 0.18)
			border 1px solid rgba(255, 144, 0, 0.5)
			border-radius 4px
			cursor pointer
			font-size 13px

			&:hover
				background rgba(255, 144, 0, 0.28)

	.tracks-pane
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	.pane-head
		display flex
		align-items center
		justify-content space-between
		gap 6px
		padding 6px 8px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		h3
			margin 0
			font-size 12px
			font-weight 600
			letter-spacing 0.4px
			text-transform uppercase
			opacity 0.7

		.add-btn
			width 24px
			height 22px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			cursor pointer
			opacity 0.8

			&:hover
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.4)

	.track-list
		flex 1 1 auto
		list-style none
		margin 0
		padding 4px
		overflow-y auto
		display flex
		flex-direction column
		gap 2px

	.track-row
		display flex
		align-items center
		gap 2px
		border-radius 3px

		&.selected
			background rgba(255, 144, 0, 0.18)

	.track-pick
		flex 1 1 auto
		display flex
		align-items center
		gap 6px
		padding 6px 8px
		background transparent
		border 0
		color inherit
		text-align left
		font-size 12px
		cursor pointer
		min-width 0

		.initial-flag
			font-size 10px
			color #ffce80

		.track-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.track-behavior
			font-size 10px
			padding 1px 5px
			background rgba(255, 255, 255, 0.08)
			border-radius 3px
			opacity 0.65

	.row-btn
		width 26px
		height 22px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		cursor pointer
		opacity 0.65
		margin-right 4px

		&:hover
			opacity 1

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

	.center-col
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px
		gap 8px
		overflow hidden

	.right-col
		display flex
		flex-direction column
		min-height 0
		min-width 0
		gap 6px

	.live-preview
		flex 0 0 auto
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 6px

	.live-preview-head
		display flex
		align-items center
		gap 6px
		font-size 10px
		text-transform uppercase
		letter-spacing 0.4px
		opacity 0.7
		margin-bottom 4px

	.live-preview-frame
		background #1a1a1a
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		overflow hidden
		position relative

	.live-preview-stage
		position absolute
		top 0
		left 0

	.kf-inspector
		flex 1 1 auto
		min-height 0
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px
		overflow-y auto

	.kf-empty
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 8px
		height 100%
		min-height 100px
		opacity 0.5
		font-size 12px

		i
			font-size 20px

	.track-bar
		display flex
		align-items center
		gap 8px
		padding 4px 6px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.06)
		border-radius 4px
		flex 0 0 auto

	.track-name-input
		flex 0 1 220px
		min-width 0
		height 26px
		padding 0 8px
		font-size 13px
		font-weight 600
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		color inherit

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

	.inline-field
		display inline-flex
		align-items center
		gap 4px
		font-size 11px

		span
			opacity 0.7

		input, select
			height 26px
			padding 0 6px
			font-size 11px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color inherit

		input.narrow
			width 80px

	.initial-btn
		display inline-flex
		align-items center
		gap 6px
		height 26px
		padding 0 10px
		font-size 11px
		background rgba(0, 0, 0, 0.2)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		cursor pointer
		color inherit
		white-space nowrap

		i
			font-size 10px
			opacity 0.55

		&.active
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)
			color #ffce80

			i
				opacity 1
				color #ffce80

		&:hover
			background rgba(255, 255, 255, 0.06)

			&.active
				background rgba(255, 144, 0, 0.26)

	.tx-btn
		display inline-flex
		align-items center
		gap 6px
		height 26px
		padding 0 10px
		margin-left auto
		background rgba(255, 255, 255, 0.04)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		font-size 11px
		cursor pointer

		&:hover:not(:disabled)
			background rgba(255, 255, 255, 0.1)

		&.active
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)

		&:disabled
			opacity 0.4
			cursor not-allowed

		.tx-count
			padding 1px 5px
			background rgba(255, 200, 30, 0.25)
			border-radius 8px
			font-size 10px
			font-family monospace

	.timeline-controls
		display flex
		align-items center
		gap 8px
		flex 0 0 auto

	.tx-drawer-backdrop
		position absolute
		inset 0
		background rgba(0, 0, 0, 0.5)
		z-index 5

	.tx-drawer
		position absolute
		top 12px
		right 12px
		bottom 12px
		width 540px
		max-width calc(100% - 24px)
		background #1c1c1c
		border 1px solid rgba(255, 255, 255, 0.15)
		border-radius 6px
		box-shadow 0 8px 24px rgba(0, 0, 0, 0.5)
		display flex
		flex-direction column
		z-index 6

	.tx-drawer-head
		display flex
		align-items center
		justify-content space-between
		gap 8px
		padding 8px 10px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		h3
			margin 0
			font-size 13px
			font-weight 600

			.dim
				opacity 0.55
				margin-left 4px

	.tx-drawer-actions
		display inline-flex
		gap 6px

	.tx-drawer-body
		flex 1 1 auto
		padding 10px
		overflow-y auto
		display flex
		flex-direction column
		gap 8px

	.field
		display flex
		flex-direction column
		gap 4px
		font-size 11px

		span
			opacity 0.7

		input, select
			height 28px
			padding 0 6px
			font-size 12px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color #e4e4e4

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

		select
			appearance none
			-webkit-appearance none
			padding-right 22px
			background-image url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path fill='%23bbb' d='M6 8L2 4h8z'/></svg>")
			background-repeat no-repeat
			background-position right 6px center

			option
				background #1a1a1a
				color #e4e4e4

	// ── timeline / lanes ─────────────────────────────────────────────────────

	.nav-buttons
		display inline-flex
		gap 2px

		.field.inline
			flex-direction row
			align-items center
			gap 6px

			input
				width 90px

			.units
				opacity 0.55
				font-size 11px

	.lanes-frame
		display grid
		grid-template-columns 140px minmax(0, 1fr)
		gap 8px
		padding 8px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		user-select none
		min-height 80px
		overflow-y auto
		flex 1 1 auto

	.lane-heads
		display flex
		flex-direction column
		gap 2px

	.lane-head
		display flex
		align-items center
		gap 4px
		height 20px
		font-size 11px
		border-radius 3px
		cursor pointer

		&:hover
			background rgba(255, 255, 255, 0.05)

		&.selected
			background rgba(255, 144, 0, 0.15)

		&.comp-header
			font-weight 600
			border-top 1px solid rgba(255, 255, 255, 0.06)
			margin-top 2px
			padding-left 2px

		&.prop-row
			padding-left 0
			opacity 0.8

			&:hover
				opacity 1

		.lane-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.prop-name
			font-size 10px
			font-family monospace
			opacity 0.75

		.prop-indent
			width 12px
			flex 0 0 auto

		.prop-kf-count
			font-size 9px
			opacity 0.5
			font-family monospace
			min-width 12px
			text-align right

			&.has-kf
				opacity 1
				color rgba(255, 200, 30, 0.85)

		.lane-add
			width 22px
			height 18px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			cursor pointer
			opacity 0.7
			font-size 10px

			&:hover
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.45)

	.expand-btn
		width 16px
		height 16px
		background transparent
		border none
		cursor pointer
		opacity 0.6
		display flex
		align-items center
		justify-content center
		flex 0 0 auto
		padding 0
		font-size 9px

		&:hover
			opacity 1

	.lane-strips
		position relative
		display flex
		flex-direction column
		gap 2px
		cursor crosshair

	.lane-strip
		position relative
		height 20px
		background rgba(255, 255, 255, 0.04)
		border-radius 3px

		&.comp-strip
			background rgba(255, 255, 255, 0.06)
			margin-top 2px
			border-top 1px solid rgba(255, 255, 255, 0.06)

		&.prop-strip
			background rgba(255, 255, 255, 0.03)

	// ── D6: keyframe marker shapes ────────────────────────────────────────────

	.kf-marker
		position absolute
		top 3px
		width 14px
		height 14px
		margin-left -7px
		cursor grab

		&::before
			content ''
			position absolute
			inset -6px
			cursor inherit

		&:active
			cursor grabbing

		&.selected
			filter brightness(1.5)
			z-index 1

		&.multi-selected
			outline 2px solid rgba(120, 200, 255, 0.9)
			outline-offset 1px
			z-index 1

	// bezier — diamond. Fill color encodes the easing equation; default
	// sinusoidal (no equation set) stays the warm theme orange so untouched
	// keyframes read as "still the default."
	.kf-bezier
		background rgba(255, 200, 80, 0.7)
		border 1.5px solid rgba(255, 230, 140, 0.9)
		border-radius 50%

		&.selected
			border-color white
			border-width 2px

	// Equation palette — only the visually distinct families get their own
	// hue. The smooth polynomial family (sinusoidal / quadratic / cubic /
	// quartic / quintic / circular / exponential) all read as "a smooth
	// curve" at a glance, so they share the default theme color. Back,
	// bounce, and elastic each have a recognizable shape and earn their
	// own color so they pop on the timeline.
	.kf-eq-back
		background rgba(150, 110, 220, 0.78)
		border-color rgba(190, 150, 250, 0.95)
	.kf-eq-bounce
		background rgba(110, 200, 130, 0.78)
		border-color rgba(150, 240, 170, 0.95)
	.kf-eq-elastic
		background rgba(230, 100, 200, 0.78)
		border-color rgba(255, 140, 230, 0.95)

	// linear — triangle (clip-path triangle pointing right)
	.kf-linear
		background rgba(100, 200, 255, 0.75)
		border none
		border-radius 0
		clip-path polygon(0% 0%, 100% 50%, 0% 100%)

		&.selected
			background rgba(140, 230, 255, 1)

	// constant — square (hold-previous step)
	.kf-constant
		background rgba(160, 160, 200, 0.7)
		border 1.5px solid rgba(200, 200, 255, 0.9)
		border-radius 2px

		&.selected
			background rgba(200, 200, 255, 0.95)

	// aggregate header marker — slightly larger, more opaque
	.kf-aggregate
		width 10px
		height 10px
		top 5px
		margin-left -5px
		opacity 0.5
		background rgba(255, 144, 0, 0.4)
		border-color rgba(255, 200, 80, 0.5)

	// legacy mixed markers on header strip
	.kf-legacy
		opacity 0.85

	.playhead
		position absolute
		top 0
		bottom 0
		width 1.5px
		background rgba(255, 255, 255, 0.65)
		pointer-events none
		margin-left -0.75px

	.lasso-rect
		position absolute
		background rgba(120, 200, 255, 0.15)
		border 1.5px dashed rgba(120, 200, 255, 0.85)
		pointer-events none
		z-index 9999

	// ── component header inspector (D1 chevrons) ─────────────────────────────

	.prop-chevron-list
		display flex
		flex-direction column
		gap 4px
		margin-top 6px

	.prop-chevron-row,
	.prop-value-row
		display flex
		align-items center
		gap 6px
		height 24px
		padding 0 4px
		border-radius 3px

		&:hover
			background rgba(255, 255, 255, 0.04)

		.prop-label
			flex 0 0 70px
			font-size 11px
			font-family monospace
			opacity 0.8

	.prop-value-row .prop-value-input
		flex 1 1 auto
		min-width 0
		height 22px
		padding 0 6px
		font-size 11px
		background rgba(0, 0, 0, 0.3)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		color inherit
		font-family monospace

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

	.prop-value-row .prop-unit
		font-size 10px
		opacity 0.55
		margin-left -2px
		font-family monospace

		.prop-kf-info
			font-size 10px
			font-family monospace
			opacity 0.5

	.prop-value-row.expanded
		background rgba(255, 144, 0, 0.08)
		border-radius 3px 3px 0 0

	.prop-value-row.selected:not(.expanded)
		background rgba(255, 200, 80, 0.06)

	.prop-kf-expansion
		display flex
		flex-direction column
		gap 4px
		padding 6px 4px 8px 78px
		background rgba(255, 144, 0, 0.06)
		border-left 2px solid rgba(255, 144, 0, 0.35)
		border-radius 0 0 3px 3px
		margin-bottom 4px

	.prop-kf-row
		display flex
		gap 4px
		align-items center

		input[type='number'], select
			height 22px
			padding 0 6px
			background rgba(0, 0, 0, 0.3)
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			color inherit
			font-family monospace
			font-size 11px

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

		input[type='number']
			width 70px

		.eq-select
			flex 1 1 auto
			font-family inherit

		.kf-row-label
			font-size 10px
			opacity 0.6
			font-family monospace

		.kf-row-unit
			font-size 10px
			opacity 0.5
			margin-left -2px

	.interp-row, .dir-row
		flex-wrap wrap

	.interp-chip, .dir-chip
		height 22px
		padding 0 8px
		font-size 11px
		background rgba(255, 255, 255, 0.05)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		cursor pointer
		color inherit
		text-transform capitalize

		&:hover
			background rgba(255, 255, 255, 0.1)

		&.active
			background rgba(255, 144, 0, 0.22)
			border-color rgba(255, 144, 0, 0.6)
			color #ffce80

	.dir-chip
		padding 0 6px
		font-size 10px

	.kf-chevron-btn
		width 18px
		height 18px
		padding 0
		background transparent
		border none
		cursor pointer
		display flex
		align-items center
		justify-content center

		i
			transition color 100ms ease, transform 100ms ease, text-shadow 100ms ease

		i
			font-size 11px

		&.state-none i
			color rgba(255, 255, 255, 0.25)

		&.state-none:hover i
			color rgba(255, 255, 255, 0.6)

		&.state-between i
			color rgba(120, 180, 230, 0.75)

		&.state-between:hover i
			color rgba(160, 210, 250, 1)

		&.state-on i
			color rgba(255, 200, 80, 1)

		&:hover
			opacity 1 !important
			background rgba(255, 255, 255, 0.08)

	// ── shared inspector ─────────────────────────────────────────────────────

	.hint
		margin 0
		padding 8px
		font-size 11px
		opacity 0.6
		font-style italic
		background rgba(255, 255, 255, 0.02)
		border 1px dashed rgba(255, 255, 255, 0.1)
		border-radius 3px

	.transition-card
		display flex
		flex-direction column
		gap 6px
		padding 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px

	.transition-head
		display flex
		align-items center
		gap 8px

		.field.inline
			flex 1 1 auto
			max-width 240px

	.zone-row
		display flex
		flex-wrap wrap
		align-items center
		gap 6px
		padding 4px 6px
		background rgba(255, 255, 255, 0.02)
		border 1px solid rgba(255, 255, 255, 0.05)
		border-radius 3px

	.field.inline.narrow
		flex-direction row
		align-items center
		gap 4px

		input, select
			width 80px

	.small-btn
		display inline-flex
		align-items center
		gap 4px
		height 24px
		padding 0 8px
		font-size 11px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		cursor pointer
		opacity 0.85

		&:hover:not(:disabled)
			opacity 1
			background rgba(255, 255, 255, 0.06)

		&:disabled
			opacity 0.4
			cursor not-allowed

		&.primary
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.45)
			color #ffd166
			opacity 1

			&:hover:not(:disabled)
				background rgba(255, 144, 0, 0.28)

		&.active
			background rgba(255, 144, 0, 0.28)
			border-color rgba(255, 144, 0, 0.6)
			color #ffd166
			opacity 1

	.behavior-group
		display inline-flex
		gap 2px

		.behavior-btn
			display inline-flex
			align-items center
			justify-content center
			width 26px
			height 22px
			padding 0
			background rgba(255, 255, 255, 0.05)
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			cursor pointer
			font-size 11px

			&:hover
				background rgba(255, 255, 255, 0.12)

			&.active
				background rgba(255, 144, 0, 0.22)
				border-color rgba(255, 144, 0, 0.55)
				color #ffd166

	.kf-detail-head
		display flex
		align-items center
		gap 8px
		font-size 12px
		margin-bottom 6px

		.row-btn
			margin-left auto

	.kf-grid
		display grid
		grid-template-columns repeat(auto-fit, minmax(110px, 1fr))
		gap 6px

	.empty-detail
		padding 24px
		text-align center
		font-size 12px
		opacity 0.6
</style>
