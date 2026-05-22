<svelte:options runes={true} />
<script lang='ts'>
	import type { AnimatablePropertyKey, EasingV2 } from '../../utils/overlayAnimation.ts';
	import type { OverlayComponentData, OverlayData, OverlayTrack } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import {
		ANIMATABLE_PROPERTIES,
		DEFAULT_EASING_V2,
		ensureLane,
		insertPropertyKeyframe,
		laneAggregateTimes,
		lanePropertyKeyframes,
		removeKeyframeOnLane,
		removePropertyKeyframe,
		updateKeyframeOnLane,
		updatePropertyKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import { ensureComponentId } from '../../utils/types.ts';

	type Selection
		= | { kind: 'component'; componentId: string }
			| { kind: 'property'; componentId: string; prop: AnimatablePropertyKey }
			| { kind: 'legacy-kf'; componentId: string; index: number }
			| { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };

	type KfRef
		= | { kind: 'legacy'; componentId: string; index: number }
			| { kind: 'prop'; componentId: string; prop: AnimatablePropertyKey; index: number };

	const USER_ANIMATABLE_PROPERTIES: AnimatablePropertyKey[] = ['opacity', 'x', 'y', 'rotation'];

	let {
		layer,
		track,
		playheadT = $bindable(),
		selection = $bindable(),
		commit,
		onSetWorkspaceLasso,
		valueAt,
		componentBase,
	}: {
		layer: OverlayData;
		track: OverlayTrack;
		playheadT: number;
		selection: Selection | null;
		commit: () => void;
		onSetWorkspaceLasso: (lasso: { lx: number; ly: number; rx: number; ry: number } | null) => void;
		valueAt: (componentId: string, prop: AnimatablePropertyKey) => number;
		componentBase: (comp: OverlayComponentData | undefined, prop: AnimatablePropertyKey) => number;
	} = $props();

	let timelineEl = $state<HTMLDivElement | null>(null);
	let expandedComponents = $state<Set<string>>(new Set());
	let multiSelection = $state<KfRef[]>([]);

	let scrubbing = $state(false);
	let scrubStartX = 0;
	let scrubStartT = 0;

	type DragTarget
		= | { kind: 'legacy'; componentId: string; index: number; startX: number; startT: number }
			| { kind: 'prop'; componentId: string; prop: AnimatablePropertyKey; index: number; startX: number; startT: number }
			| { kind: 'aggregate'; componentId: string; times: number[]; startX: number; startBaseT: number }
			| { kind: 'multi'; startX: number; refs: Array<KfRef & { startT: number }> }
			| { kind: 'lasso'; startX: number; startY: number; endX: number; endY: number };

	let dragging = $state<DragTarget | null>(null);

	const TIMELINE_INSET = 8;
	const STEP_MS = 1;

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

	function toggleExpanded(componentId: string) {
		const next = new Set(expandedComponents);
		if (next.has(componentId)) next.delete(componentId);
		else next.add(componentId);
		expandedComponents = next;
	}

	function componentLabel(c: OverlayComponentData): string {
		const entry = getApi().overlayTypes.get(layer.type);
		const nameKey = entry?.overlayComponentNames?.get(c.type);
		const typeLabel = nameKey ? (game.i18n?.localize(nameKey) ?? c.type) : c.type;
		return `${typeLabel} #${(layer.components ?? []).indexOf(c) + 1}`;
	}

	function kfRefId(ref: KfRef): string {
		return ref.kind === 'legacy'
			? `legacy:${ref.componentId}:${ref.index}`
			: `prop:${ref.componentId}:${ref.prop}:${ref.index}`;
	}

	function kfRefTime(ref: KfRef): number | null {
		const lane = track.lanes.find(l => l.componentId === ref.componentId);
		if (!lane) return null;
		if (ref.kind === 'legacy') return lane.keyframes[ref.index]?.t ?? null;
		return lane.propertyKeyframes?.[ref.prop]?.[ref.index]?.t ?? null;
	}

	function isInMultiSelection(ref: KfRef): boolean {
		const id = kfRefId(ref);
		return multiSelection.some(r => kfRefId(r) === id);
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

	function kfMarkerClass(easing: EasingV2 | undefined): string {
		const interp = easing?.interpolation ?? 'bezier';
		if (interp === 'constant') return 'kf-marker kf-constant';
		if (interp === 'linear') return 'kf-marker kf-linear';
		const eq = easing?.equation ?? 'sinusoidal';
		return `kf-marker kf-bezier kf-eq-${eq}`;
	}

	function snapToPlayhead(candidateMs: number): number {
		const w = timelineInner();
		if (w <= 0) return candidateMs;
		const pxPerMs = w / Math.max(1, track.durationMs);
		const snapPx = 6;
		const snapMs = snapPx / pxPerMs;
		if (Math.abs(candidateMs - playheadT) <= snapMs) return Math.round(playheadT);
		return candidateMs;
	}

	function onTimelineMouseDown(e: MouseEvent) {
		if (!timelineEl) return;
		const target = e.target as HTMLElement;
		if (target.closest('.kf-marker')) return;
		const r = timelineEl.getBoundingClientRect();
		const newT = Math.round(xToT(e.clientX - r.left, track.durationMs));
		if (e.ctrlKey || e.metaKey) {
			dragging = { kind: 'lasso', startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
			pushLassoRect();
			e.preventDefault();
			return;
		}
		playheadT = newT;
		if (selection?.kind === 'prop-kf') {
			selection = { kind: 'property', componentId: selection.componentId, prop: selection.prop };
		} else if (selection?.kind === 'legacy-kf') {
			selection = { kind: 'component', componentId: selection.componentId };
		}
		multiSelection = [];
		scrubbing = true;
		scrubStartX = e.clientX;
		scrubStartT = newT;
		e.preventDefault();
	}

	function startMultiDragFromRef(e: MouseEvent, anchor: KfRef): boolean {
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
		e.preventDefault();
		e.stopPropagation();
		const anchor: KfRef = { kind: 'legacy', componentId, index };
		if (startMultiDragFromRef(e, anchor)) return;
		const lane = track.lanes.find(l => l.componentId === componentId);
		const kf = lane?.keyframes[index];
		if (!kf) return;
		multiSelection = [];
		selection = { kind: 'legacy-kf', componentId, index };
		dragging = { kind: 'legacy', componentId, index, startX: e.clientX, startT: kf.t };
	}

	function startPropKfDrag(e: MouseEvent, componentId: string, prop: AnimatablePropertyKey, index: number) {
		e.preventDefault();
		e.stopPropagation();
		const anchor: KfRef = { kind: 'prop', componentId, prop, index };
		if (startMultiDragFromRef(e, anchor)) return;
		const lane = track.lanes.find(l => l.componentId === componentId);
		const arr = lane?.propertyKeyframes?.[prop];
		const kf = arr?.[index];
		if (!kf) return;
		multiSelection = [];
		selection = { kind: 'prop-kf', componentId, prop, index };
		dragging = { kind: 'prop', componentId, prop, index, startX: e.clientX, startT: kf.t };
	}

	function startAggregateDrag(e: MouseEvent, componentId: string, t: number) {
		e.preventDefault();
		e.stopPropagation();
		const lane = track.lanes.find(l => l.componentId === componentId);
		if (!lane) return;
		dragging = { kind: 'aggregate', componentId, times: [t], startX: e.clientX, startBaseT: t };
	}

	function addKeyframeAtPlayhead(c: OverlayComponentData) {
		const componentId = ensureComponentId(c);
		const lane = ensureLane(track, componentId);
		const t = Math.round(playheadT);
		for (const prop of USER_ANIMATABLE_PROPERTIES) {
			const arr = lanePropertyKeyframes(lane)[prop] ?? [];
			if (arr.some(k => k.t === t)) continue;
			const v = valueAt(componentId, prop) - componentBase(c, prop);
			insertPropertyKeyframe(lane, prop, { t, v, easing: { ...DEFAULT_EASING_V2 } });
		}
		commit();
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (scrubbing) {
			const dx = e.clientX - scrubStartX;
			const dMs = (dx / timelineInner()) * track.durationMs;
			playheadT = Math.max(0, Math.min(track.durationMs, Math.round(scrubStartT + dMs)));
			return;
		}
		if (!dragging) return;

		const dx = e.clientX - dragging.startX;
		const dMs = Math.round((dx / timelineInner()) * track.durationMs);

		if (dragging.kind === 'lasso') {
			dragging = { ...dragging, endX: e.clientX, endY: e.clientY };
			pushLassoRect();
			return;
		}

		if (dragging.kind === 'multi') {
			for (const ref of dragging.refs) {
				const lane = track.lanes.find(l => l.componentId === ref.componentId);
				if (!lane) continue;
				const raw = Math.max(0, Math.min(track.durationMs, ref.startT + dMs));
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
			const lane = track.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const raw = Math.max(0, Math.min(track.durationMs, dragging.startT + dMs));
			const newT = snapToPlayhead(raw);
			const newIdx = updateKeyframeOnLane(lane, dragging.index, { t: newT });
			dragging.index = newIdx;
			selection = { kind: 'legacy-kf', componentId: dragging.componentId, index: newIdx };
			commit();
		} else if (dragging.kind === 'prop') {
			const lane = track.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const raw = Math.max(0, Math.min(track.durationMs, dragging.startT + dMs));
			const newT = snapToPlayhead(raw);
			const newIdx = updatePropertyKeyframe(lane, dragging.prop, dragging.index, { t: newT });
			dragging.index = newIdx;
			selection = { kind: 'prop-kf', componentId: dragging.componentId, prop: dragging.prop, index: newIdx };
			commit();
		} else if (dragging.kind === 'aggregate') {
			const lane = track.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const origT = dragging.startBaseT;
			const raw = Math.max(0, Math.min(track.durationMs, origT + dMs));
			const newT = snapToPlayhead(raw);
			const actualDelta = newT - origT;
			if (actualDelta === 0) return;

			for (let i = 0; i < lane.keyframes.length; i++) {
				if (lane.keyframes[i].t === origT) {
					updateKeyframeOnLane(lane, i, { t: Math.max(0, Math.min(track.durationMs, origT + actualDelta)) });
				}
			}
			if (lane.propertyKeyframes) {
				for (const prop of ANIMATABLE_PROPERTIES) {
					const arr = lane.propertyKeyframes[prop];
					if (!arr) continue;
					for (let i = 0; i < arr.length; i++) {
						if (arr[i].t === origT) {
							updatePropertyKeyframe(lane, prop, i, { t: Math.max(0, Math.min(track.durationMs, origT + actualDelta)) });
						}
					}
				}
			}
			dragging.startBaseT = newT;
			dragging.startX = e.clientX;
			commit();
		}
	}

	function pushLassoRect() {
		if (dragging?.kind !== 'lasso') {
			onSetWorkspaceLasso(null);
			return;
		}
		const lx = Math.min(dragging.startX, dragging.endX);
		const ly = Math.min(dragging.startY, dragging.endY);
		const rx = Math.max(dragging.startX, dragging.endX);
		const ry = Math.max(dragging.startY, dragging.endY);
		onSetWorkspaceLasso({ lx, ly, rx, ry });
	}

	function onWindowMouseUp() {
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
		onSetWorkspaceLasso(null);
	}

	function deleteLegacyKeyframe() {
		if (selection?.kind !== 'legacy-kf') return;
		const sel = selection;
		const lane = track.lanes.find(l => l.componentId === sel.componentId);
		if (!lane) return;
		removeKeyframeOnLane(lane, sel.index);
		selection = { kind: 'component', componentId: sel.componentId };
		commit();
	}

	function deletePropKeyframe() {
		if (selection?.kind !== 'prop-kf') return;
		const sel = selection;
		const lane = track.lanes.find(l => l.componentId === sel.componentId);
		if (!lane) return;
		removePropertyKeyframe(lane, sel.prop, sel.index);
		selection = { kind: 'component', componentId: sel.componentId };
		commit();
	}

	function deleteMultiSelection() {
		if (multiSelection.length === 0) return;
		const sorted = [...multiSelection].sort((a, b) => b.index - a.index);
		for (const ref of sorted) {
			const lane = track.lanes.find(l => l.componentId === ref.componentId);
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
		if (selection?.kind === 'prop-kf') {
			const sel = selection;
			const lane = track.lanes.find(l => l.componentId === sel.componentId);
			const kf = lane?.propertyKeyframes?.[sel.prop]?.[sel.index];
			if (!lane || !kf) return;
			const newT = Math.max(0, Math.min(track.durationMs, kf.t + deltaMs));
			const newIdx = updatePropertyKeyframe(lane, sel.prop, sel.index, { t: newT });
			if (newIdx >= 0) selection = { kind: 'prop-kf', componentId: sel.componentId, prop: sel.prop, index: newIdx };
			playheadT = newT;
			commit();
		} else if (selection?.kind === 'legacy-kf') {
			const sel = selection;
			const lane = track.lanes.find(l => l.componentId === sel.componentId);
			const kf = lane?.keyframes[sel.index];
			if (!lane || !kf) return;
			const newT = Math.max(0, Math.min(track.durationMs, kf.t + deltaMs));
			const newIdx = updateKeyframeOnLane(lane, sel.index, { t: newT });
			if (newIdx >= 0) selection = { kind: 'legacy-kf', componentId: sel.componentId, index: newIdx };
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

	onMount(() => {
		window.addEventListener('keydown', onWindowKeyCapture, { capture: true });
	});
	onDestroy(() => {
		window.removeEventListener('keydown', onWindowKeyCapture, { capture: true });
	});

	export function stepFrame(direction: 1 | -1) {
		playheadT = Math.max(0, Math.min(track.durationMs, Math.round(playheadT + direction * STEP_MS)));
	}

	const uniqueKfTimes = $derived.by(() => {
		const set = new Set<number>();
		for (const lane of track.lanes) {
			for (const kf of lane.keyframes) set.add(kf.t);
			if (lane.propertyKeyframes) {
				for (const prop of ANIMATABLE_PROPERTIES) {
					for (const kf of lane.propertyKeyframes[prop] ?? []) set.add(kf.t);
				}
			}
		}
		return [...set].sort((a, b) => a - b);
	});

	export function jumpKeyframe(direction: 1 | -1, toEdge = false) {
		if (uniqueKfTimes.length === 0) {
			playheadT = direction > 0 ? track.durationMs : 0;
			return;
		}
		if (toEdge) {
			playheadT = direction > 0 ? uniqueKfTimes[uniqueKfTimes.length - 1] : uniqueKfTimes[0];
			return;
		}
		if (direction > 0) {
			const next = uniqueKfTimes.find(t => t > playheadT + 1);
			playheadT = next ?? track.durationMs;
		} else {
			let prev: number | undefined;
			for (const t of uniqueKfTimes) {
				if (t < playheadT - 1) prev = t;
				else break;
			}
			playheadT = prev ?? 0;
		}
	}
</script>

<svelte:window onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} />

<div class='lanes-frame'>
	<div class='lane-heads'>
		{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
			{@const componentId = ensureComponentId(comp)}
			{@const isExpanded = expandedComponents.has(componentId)}
			{@const lane = track.lanes.find(l => l.componentId === componentId)}

			<div
				class='lane-head comp-header'
				class:selected={selection?.kind === 'component' && selection.componentId === componentId}
				role='button'
				tabindex='0'
				onclick={() => { selection = { kind: 'component', componentId }; }}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { selection = { kind: 'component', componentId }; } }}
			>
				<button
					type='button'
					class='expand-btn'
					onclick={(e) => { e.stopPropagation(); toggleExpanded(componentId); }}
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
					onclick={(e) => { e.stopPropagation(); addKeyframeAtPlayhead(comp); }}
				><i class='fas fa-plus'></i></button>
			</div>

			{#if isExpanded}
				{#each USER_ANIMATABLE_PROPERTIES as prop}
					{@const pkf = lane ? lanePropertyKeyframes(lane)[prop] : []}
					<div
						class='lane-head prop-row'
						class:selected={selection?.kind === 'property' && selection.componentId === componentId && selection.prop === prop}
						role='button'
						tabindex='0'
						onclick={() => { selection = { kind: 'property', componentId, prop }; }}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { selection = { kind: 'property', componentId, prop }; } }}
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
			{@const lane = track.lanes.find(l => l.componentId === componentId)}
			{@const aggTimes = lane ? laneAggregateTimes(lane) : []}

			<div class='lane-strip comp-strip'>
				{#each aggTimes as t (t)}
					<div
						class='kf-marker kf-bezier kf-aggregate'
						style={`left: ${tToX(t, track.durationMs)}px;`}
						onmousedown={e => startAggregateDrag(e, componentId, t)}
						onclick={(e) => { e.stopPropagation(); selection = { kind: 'component', componentId }; }}
						role='button'
						tabindex='0'
						aria-label={`Aggregate keyframe at ${t}ms`}
					></div>
				{/each}

				{#if lane}
					{#each lane.keyframes as kf, idx (`${idx}-${kf.t}`)}
						<div
							class={`${kfMarkerClass(undefined)} kf-legacy`}
							class:selected={selection?.kind === 'legacy-kf' && selection.componentId === componentId && selection.index === idx}
							class:multi-selected={isInMultiSelection({ kind: 'legacy', componentId, index: idx })}
							style={`left: ${tToX(kf.t, track.durationMs)}px;`}
							data-kf-ref={`legacy:${componentId}:${idx}`}
							onmousedown={e => startLegacyKfDrag(e, componentId, idx)}
							onclick={(e) => { e.stopPropagation(); playheadT = kf.t; if (!isInMultiSelection({ kind: 'legacy', componentId, index: idx })) multiSelection = []; selection = { kind: 'legacy-kf', componentId, index: idx }; }}
							role='button'
							tabindex='0'
							aria-label={`Keyframe at ${kf.t}ms`}
						></div>
					{/each}
				{/if}
			</div>

			{#if isExpanded}
				{#each USER_ANIMATABLE_PROPERTIES as prop}
					{@const pkf = lane ? (lanePropertyKeyframes(lane)[prop] ?? []) : []}
					<div class='lane-strip prop-strip'>
						{#each pkf as kf, idx (`${idx}-${kf.t}`)}
							<div
								class={kfMarkerClass(kf.easing)}
								class:selected={selection?.kind === 'prop-kf' && selection.componentId === componentId && selection.prop === prop && selection.index === idx}
								class:multi-selected={isInMultiSelection({ kind: 'prop', componentId, prop, index: idx })}
								style={`left: ${tToX(kf.t, track.durationMs)}px;`}
								data-kf-ref={`prop:${componentId}:${prop}:${idx}`}
								onmousedown={e => startPropKfDrag(e, componentId, prop, idx)}
								onclick={(e) => { e.stopPropagation(); playheadT = kf.t; if (!isInMultiSelection({ kind: 'prop', componentId, prop, index: idx })) multiSelection = []; selection = { kind: 'prop-kf', componentId, prop, index: idx }; }}
								role='button'
								tabindex='0'
								aria-label={`${prop} keyframe at ${kf.t}ms`}
							></div>
						{/each}
					</div>
				{/each}
			{/if}
		{/each}

		<div class='playhead' style={`left: ${tToX(playheadT, track.durationMs)}px;`}></div>
	</div>
</div>

<style lang='stylus'>
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

	.kf-bezier
		background rgba(255, 200, 80, 0.7)
		border 1.5px solid rgba(255, 230, 140, 0.9)
		border-radius 50%

		&.selected
			border-color white
			border-width 2px

	.kf-eq-back
		background rgba(150, 110, 220, 0.78)
		border-color rgba(190, 150, 250, 0.95)
	.kf-eq-bounce
		background rgba(110, 200, 130, 0.78)
		border-color rgba(150, 240, 170, 0.95)
	.kf-eq-elastic
		background rgba(230, 100, 200, 0.78)
		border-color rgba(255, 140, 230, 0.95)

	.kf-linear
		background rgba(100, 200, 255, 0.75)
		border none
		border-radius 0
		clip-path polygon(0% 0%, 100% 50%, 0% 100%)

		&.selected
			background rgba(140, 230, 255, 1)

	.kf-constant
		background rgba(160, 160, 200, 0.7)
		border 1.5px solid rgba(200, 200, 255, 0.9)
		border-radius 2px

		&.selected
			background rgba(200, 200, 255, 0.95)

	.kf-aggregate
		width 10px
		height 10px
		top 5px
		margin-left -5px
		opacity 0.5
		background rgba(255, 144, 0, 0.4)
		border-color rgba(255, 200, 80, 0.5)

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
</style>
