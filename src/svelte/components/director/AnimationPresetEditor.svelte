<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraKeyframe, CameraPreset, EasingKind, LoopMode } from '../../../utils/cameraPresets.ts';
	import type { SequenceController } from '../../../utils/cameraSequencePlayer.ts';
	import { onDestroy, onMount } from 'svelte';
	import {
		insertKeyframe,
		makeKeyframe,
		maxKeyframeTime,
		removeKeyframeAt,
		sortKeyframesByTime,
		updateKeyframeAt,
	} from '../../../utils/cameraKeyframeOps.ts';
	import { writePresets } from '../../../utils/cameraPresets.ts';
	import { playSequence } from '../../../utils/cameraSequencePlayer.ts';
	import { getLocalViewport } from '../../../utils/canvas.ts';

	interface Props {
		preset: CameraPreset;
		presets: CameraPreset[];
		scene: unknown;
		onClose: () => void;
		onPresetsChange: (next: CameraPreset[]) => void;
	}

	const { preset, presets, scene, onClose, onPresetsChange }: Props = $props();

	const LOC = (key: string) => game.i18n?.localize(`obs-utils.applications.director.keyframeEditor.${key}`) ?? key;

	// ─── state ────────────────────────────────────────────────────────────────

	const keyframes = $derived(sortKeyframesByTime(preset.keyframes ?? []));

	const TIMELINE_PADDING_MS = 500;
	const MIN_DURATION_MS = 2000;
	const ZOOM_MIN = 0.5;
	const ZOOM_MAX = 8;

	// Composition duration is sticky — initialized once from the preset's
	// current keyframe extent (so existing presets open at a sensible size) and
	// only changed by the Duration input or by recording (which appends
	// keyframes past the existing end). Dragging or editing a keyframe must
	// never inflate the canvas.
	let totalMs = $state(preset.durationMs
		?? Math.max(MIN_DURATION_MS, maxKeyframeTime(preset.keyframes ?? []) + TIMELINE_PADDING_MS));

	/** Persist the composition duration onto the preset so the play path bounces / holds against it. */
	function setTotalMs(v: number) {
		const next = Math.max(MIN_DURATION_MS, Math.round(v));
		totalMs = next;
		if (preset.durationMs !== next) patchPreset({ durationMs: next });
	}

	let zoom = $state(1);
	function setZoom(z: number) { zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); }

	let playheadMs = $state(0);
	// Multi-select model — `selectedIndices` is the source of truth (sorted,
	// may be empty). Drag, inspector and the scrub-to-viewport effect treat
	// the first entry as the "primary" selection, exposed as `selectedIndex`.
	let selectedIndices = $state<number[]>([]);
	const selectedIndex = $derived<number | null>(selectedIndices.length > 0 ? selectedIndices[0] : null);
	const selectedKf = $derived<CameraKeyframe | null>(selectedIndex !== null ? keyframes[selectedIndex] ?? null : null);

	function isSelected(idx: number): boolean { return selectedIndices.includes(idx); }
	function selectOnly(idx: number) { selectedIndices = [idx]; }
	function selectToggle(idx: number) {
		selectedIndices = isSelected(idx)
			? selectedIndices.filter(i => i !== idx)
			: [...selectedIndices, idx].sort((a, b) => a - b);
	}
	function selectClick(idx: number, additive: boolean) {
		if (additive) selectToggle(idx);
		else selectOnly(idx);
	}

	// Empty inspector with a lone keyframe is a dead-end — auto-select so the
	// user lands on something editable.
	$effect(() => {
		if (selectedIndices.length === 0 && keyframes.length === 1) selectedIndices = [0];
	});

	// When the primary selection changes (timeline click, jumpKeyframe nav,
	// etc.) bring the matching row in the keyframe list into view.
	// block:'nearest' avoids jarring jumps when the row is already visible.
	$effect(() => {
		const idx = selectedIndex;
		if (idx === null || !rootEl) return;
		const row = rootEl.querySelector<HTMLElement>(`[data-kf-idx="${idx}"]`);
		row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});

	/**
	 * Linear interpolation through the keyframe list at a given playhead time.
	 * Used for scrub feedback only — the actual playback path uses GSAP with
	 * per-segment easing (see playSequence). For scrubbing we want each pixel
	 * of timeline travel to map to a deterministic on-canvas position, which
	 * a simple linear interp gives us.
	 */
	function interpolateAt(t: number): { x: number; y: number; scale: number } | null {
		const kfs = keyframes;
		if (kfs.length === 0) return null;
		if (kfs.length === 1 || t <= kfs[0].time) {
			return { x: kfs[0].x, y: kfs[0].y, scale: kfs[0].scale };
		}
		const lastKf = kfs[kfs.length - 1];
		if (t >= lastKf.time) return { x: lastKf.x, y: lastKf.y, scale: lastKf.scale };
		for (let i = 0; i < kfs.length - 1; i++) {
			const a = kfs[i]; const b = kfs[i + 1];
			if (t >= a.time && t <= b.time) {
				const span = b.time - a.time;
				const u = span <= 0 ? 0 : (t - a.time) / span;
				return {
					x: a.x + (b.x - a.x) * u,
					y: a.y + (b.y - a.y) * u,
					scale: a.scale + (b.scale - a.scale) * u,
				};
			}
		}
		return null;
	}

	// Snap the editor user's local viewport to the interpolated position at the
	// current playhead so scrubbing/stepping/jumping previews what the
	// animation will look like. Suppressed during recording (the user *is*
	// driving the viewport — we mustn't fight them) and during playback (GSAP
	// already drives the canvas via clampAndApplyExternal).
	$effect(() => {
		if (recording || isPlaying) return;
		const pos = interpolateAt(playheadMs);
		if (!pos) return;
		(canvas as any)?.pan?.(pos);
	});

	// ─── playback ─────────────────────────────────────────────────────────────

	let controller = $state<SequenceController | null>(null);
	let isPlaying = $state(false);
	let rafId: number | null = null;
	let playStartWall = 0;

	function tickPlay() {
		if (!controller) { isPlaying = false; rafId = null; return; }
		const elapsed = performance.now() - playStartWall;
		const dur = controller.duration();
		if (dur > 0) {
			if (preset.loop === 'pingpong') {
				// Ping-pong cycle = forward dur + reverse dur. Within the first
				// half the playhead advances; within the second half it walks
				// back. `playStartWall` is backdated so `elapsed` matches the
				// authored timeline position, which puts the initial press
				// onto the forward leg regardless of where the user pressed
				// play from — that's the contract for "starting play".
				const cycle = dur * 2;
				const within = elapsed % cycle;
				playheadMs = within < dur ? within : (2 * dur - within);
			} else {
				playheadMs = elapsed % dur;
			}
		}
		// GSAP's timeline isn't reliably `isActive()` for the first frame after
		// creation — polling immediately races the engine's first tick and
		// flips us back to "stopped". Only trust the not-playing signal once
		// real time has elapsed.
		if (!controller.isPlaying() && elapsed > 80) {
			isPlaying = false;
			rafId = null;
			return;
		}
		rafId = requestAnimationFrame(tickPlay);
	}

	function play(fromStart = false) {
		if (controller) { controller.stop(); controller = null; }
		controller = playSequence(preset);
		// Default: pick up from the current playhead so scrubbing then pressing
		// play feels natural. Ctrl/meta-click overrides and starts at t=0.
		const offsetMs = fromStart ? 0 : Math.max(0, Math.min(controller.duration(), playheadMs));
		if (offsetMs > 0) controller.scrub(offsetMs);
		isPlaying = true;
		// Backdate the wall clock so the rAF loop's `elapsed = now - playStartWall`
		// reflects the timeline's true position from t=0 onwards.
		playStartWall = performance.now() - offsetMs;
		rafId = requestAnimationFrame(tickPlay);
	}

	function stop() {
		if (controller) { controller.stop(); controller = null; }
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		isPlaying = false;
	}

	onDestroy(() => {
		stop();
		stopRecord();
	});

	// ─── writing back ────────────────────────────────────────────────────────

	let writeTimer: ReturnType<typeof setTimeout> | null = null;
	function scheduleWrite(updated: CameraPreset[]) {
		if (writeTimer !== null) clearTimeout(writeTimer);
		writeTimer = setTimeout(() => {
			writeTimer = null;
			writePresets(scene, updated).catch(() => {});
		}, 200);
	}
	function commitPresets(updated: CameraPreset[]) {
		onPresetsChange(updated);
		scheduleWrite(updated);
	}
	function patchPreset(patch: Partial<CameraPreset>) {
		const next = presets.map(p => p.id === preset.id ? { ...preset, ...patch } : p);
		commitPresets(next);
	}

	function updateLoop(loop: LoopMode) {
		patchPreset({ loop });
	}

	/**
	 * Apply a new composition duration. When the new value is shorter than the
	 * latest keyframe, confirm with the user before truncating — silently
	 * losing recorded keyframes from a typo would be a foot-gun. Bumping
	 * upward, or shrinking within the existing keyframe range, applies
	 * immediately without a prompt.
	 */
	async function tryUpdateDuration(raw: number) {
		const v = Math.max(MIN_DURATION_MS, Math.round(raw));
		const lostKfs = keyframes.filter(k => k.time > v);
		if (lostKfs.length === 0) {
			setTotalMs(v);
			return;
		}
		const DialogV2 = (foundry as any)?.applications?.api?.DialogV2;
		const confirmed = await DialogV2?.confirm?.({
			window: { title: LOC('shortenTitle') ?? 'Shorten duration' },
			content: `<p>${LOC('shortenWarning')
			?? `This will delete ${lostKfs.length} keyframe${lostKfs.length === 1 ? '' : 's'} past the new duration. Continue?`}</p>`,
		});
		if (!confirmed) {
			// Trigger a Svelte update so the input snaps back to the old value.
			totalMs = totalMs;
			return;
		}
		patchPreset({ keyframes: keyframes.filter(k => k.time <= v), durationMs: v });
		selectedIndices = [];
		if (playheadMs > v) playheadMs = v;
		totalMs = v;
	}

	// ─── keyframe mutations ───────────────────────────────────────────────────

	function addAtPlayhead() {
		const vp = getLocalViewport();
		if (!vp) return;
		const kf = makeKeyframe(vp, Math.round(playheadMs));
		const next = insertKeyframe(keyframes, kf);
		patchPreset({ keyframes: next });
		const newIdx = next.findIndex(k => k.time === kf.time && k.x === kf.x && k.y === kf.y);
		selectedIndices = newIdx >= 0 ? [newIdx] : [];
	}

	function captureFromViewport() {
		if (selectedIndex === null || !selectedKf) return;
		const vp = getLocalViewport();
		if (!vp) return;
		const updated: CameraKeyframe = { ...selectedKf, x: Math.round(vp.x), y: Math.round(vp.y), scale: vp.scale };
		const next = updateKeyframeAt(keyframes, selectedIndex, updated);
		const newIdx = next.findIndex(k => k === updated || (k.time === updated.time && k.x === updated.x));
		selectedIndices = newIdx >= 0 ? [newIdx] : [];
		patchPreset({ keyframes: next });
	}

	function deleteSelected() {
		if (selectedIndices.length === 0) return;
		// Remove highest-index-first so the lower indices remain valid as we go.
		const order = [...selectedIndices].sort((a, b) => b - a);
		let next = keyframes;
		for (const idx of order) next = removeKeyframeAt(next, idx);
		selectedIndices = [];
		const maxT = maxKeyframeTime(next);
		if (playheadMs > maxT) playheadMs = maxT;
		patchPreset({ keyframes: next });
	}

	function patchSelected(patch: Partial<CameraKeyframe>) {
		if (selectedIndex === null || !selectedKf) return;
		const updated: CameraKeyframe = { ...selectedKf, ...patch };
		const next = updateKeyframeAt(keyframes, selectedIndex, updated);
		const newIdx = next.findIndex(k => k === updated || (k.time === updated.time && k.x === updated.x && k.y === updated.y));
		selectedIndices = newIdx >= 0 ? [newIdx] : [];
		patchPreset({ keyframes: next });
	}

	// ─── timeline geometry ───────────────────────────────────────────────────

	let timelineWrapEl = $state<HTMLDivElement | null>(null);
	let timelineEl = $state<HTMLDivElement | null>(null);

	function stripWidth(): number { return timelineEl?.clientWidth ?? 600; }
	function tToX(ms: number): number {
		if (totalMs <= 0) return 0;
		return (ms / totalMs) * stripWidth();
	}
	function xToT(x: number): number {
		if (totalMs <= 0 || stripWidth() <= 0) return 0;
		return Math.max(0, Math.min(totalMs, (x / stripWidth()) * totalMs));
	}

	// Group keyframes only when their rounded screen-pixel positions match
	// exactly. Anything that resolves to even one pixel apart renders as a
	// distinct dot — overlap is fine, but pretending keyframes 50 ms apart
	// are "the same" was misleading.
	const stacks = $derived.by(() => {
		const out: Array<{ key: string; indices: number[]; t: number }> = [];
		let group: number[] = [];
		let groupPx = -1;
		let groupT = 0;
		for (let i = 0; i < keyframes.length; i++) {
			const px = Math.round(tToX(keyframes[i].time));
			if (group.length === 0) { group = [i]; groupPx = px; groupT = keyframes[i].time; continue; }
			if (px === groupPx) {
				group.push(i);
			} else {
				out.push({ key: `${groupT}-${group.length}`, indices: group, t: groupT });
				group = [i]; groupPx = px; groupT = keyframes[i].time;
			}
		}
		if (group.length) out.push({ key: `${groupT}-${group.length}`, indices: group, t: groupT });
		return out;
	});

	// ─── interaction ─────────────────────────────────────────────────────────

	type DragKind
		= | { kind: 'playhead'; startX: number; startMs: number }
			| { kind: 'keyframe'; index: number; startX: number; startMs: number }
			| { kind: 'keyframes-multi'; startX: number; snapshot: CameraKeyframe[]; selectedSet: Set<number> }
			| { kind: 'lasso'; startX: number; startMs: number; endMs: number };
	let dragState = $state<DragKind | null>(null);

	function onStripMouseDown(e: MouseEvent) {
		if (!timelineEl) return;
		// Markers, stacks, and the playhead handle install their own onmousedown
		// handlers and stop propagation, so anything reaching here is the bare
		// timeline track.
		const r = timelineEl.getBoundingClientRect();
		const newMs = Math.round(xToT(e.clientX - r.left));
		// Ctrl/Meta-drag on the strip starts a time-range lasso instead of
		// moving the playhead — any keyframe whose time falls inside the
		// finished range becomes selected on mouseup.
		if (e.ctrlKey || e.metaKey) {
			dragState = { kind: 'lasso', startX: e.clientX, startMs: newMs, endMs: newMs };
			e.preventDefault();
			return;
		}
		playheadMs = newMs;
		dragState = { kind: 'playhead', startX: e.clientX, startMs: newMs };
		e.preventDefault();
	}

	function startPlayheadDrag(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragState = { kind: 'playhead', startX: e.clientX, startMs: playheadMs };
	}

	function startKfDrag(e: MouseEvent, idx: number) {
		e.preventDefault();
		e.stopPropagation();
		// Ctrl/meta on a dot is "toggle selection only" — don't start a drag,
		// because the user is curating the selection set.
		if (e.ctrlKey || e.metaKey) {
			selectToggle(idx);
			return;
		}
		// If the clicked keyframe is part of an existing multi-selection, drag
		// the whole batch together. Otherwise replace the selection and drag
		// just this one.
		if (selectedIndices.includes(idx) && selectedIndices.length > 1) {
			dragState = {
				kind: 'keyframes-multi',
				startX: e.clientX,
				snapshot: keyframes.map(k => ({ ...k })),
				selectedSet: new Set(selectedIndices),
			};
			return;
		}
		selectOnly(idx);
		dragState = { kind: 'keyframe', index: idx, startX: e.clientX, startMs: keyframes[idx].time };
	}

	function onWinMouseMove(e: MouseEvent) {
		if (!dragState || !timelineEl) return;
		const dx = e.clientX - dragState.startX;
		const dMs = (dx / stripWidth()) * totalMs;

		if (dragState.kind === 'playhead') {
			const newMs = Math.max(0, Math.min(totalMs, Math.round(dragState.startMs + dMs)));
			playheadMs = newMs;
			return;
		}

		if (dragState.kind === 'lasso') {
			const r = timelineEl.getBoundingClientRect();
			const cur = Math.round(xToT(e.clientX - r.left));
			dragState = { ...dragState, endMs: cur };
			return;
		}

		if (dragState.kind === 'keyframes-multi') {
			// Rebuild from the immutable drag-start snapshot every frame.
			// This keeps multi-drag stable regardless of how the keyframe
			// array re-orders during the drag.
			const shifted = dragState.snapshot.map((k, i) => {
				if (!dragState!.selectedSet.has(i)) return k;
				const t = Math.max(0, Math.min(totalMs, Math.round(k.time + dMs)));
				return { ...k, time: t };
			});
			// Pair each shifted entry with its original index, sort by time,
			// then read the new positions of the originally-selected keyframes
			// out of the sort permutation.
			const paired = shifted.map((kf, origIdx) => ({ kf, origIdx }));
			paired.sort((a, b) => a.kf.time - b.kf.time);
			const next = paired.map(p => p.kf);
			const newSel: number[] = [];
			for (let i = 0; i < paired.length; i++) {
				if (dragState.selectedSet.has(paired[i].origIdx)) newSel.push(i);
			}
			selectedIndices = newSel;
			patchPreset({ keyframes: next });
			return;
		}

		// Single keyframe drag.
		const newMs = Math.max(0, Math.min(totalMs, Math.round(dragState.startMs + dMs)));
		const updated: CameraKeyframe = { ...keyframes[dragState.index], time: newMs };
		const next = updateKeyframeAt(keyframes, dragState.index, updated);
		const newIdx = next.findIndex(k => k === updated || (k.time === newMs && k.x === updated.x && k.y === updated.y));
		dragState = { ...dragState, index: newIdx >= 0 ? newIdx : dragState.index };
		selectedIndices = [dragState.index];
		patchPreset({ keyframes: next });
	}

	function onWinMouseUp() {
		// Finalize lasso: select every keyframe whose time falls inside the
		// dragged range. Drop the rectangle by clearing dragState last.
		if (dragState?.kind === 'lasso') {
			const lo = Math.min(dragState.startMs, dragState.endMs);
			const hi = Math.max(dragState.startMs, dragState.endMs);
			const matching: number[] = [];
			for (let i = 0; i < keyframes.length; i++) {
				if (keyframes[i].time >= lo && keyframes[i].time <= hi) matching.push(i);
			}
			selectedIndices = matching;
		}
		dragState = null;
	}

	/**
	 * Window-capture handler for Delete/Backspace only. Foundry's KeyboardManager
	 * binds Delete at window-capture for "delete selected canvas object", so an
	 * element-level handler never sees the key. We intercept at capture phase
	 * and bail unless the event target is inside the editor root — that gate
	 * keeps Foundry's canvas-delete intact when focus is elsewhere.
	 */
	function onWindowDeleteCapture(e: KeyboardEvent) {
		// Delete is captured by Foundry's KeyboardManager; rather than fight
		// for it, the editor listens for Backspace only. The handler runs at
		// window-capture (otherwise Foundry's listener fires first and the
		// event never propagates to us), and is intentionally gated only by
		// "is the focused element an editable input" — checking that the
		// target lives inside the editor root drops events when focus has
		// drifted to the body after a kf-dot click, which left Backspace
		// inert. Foundry doesn't bind Backspace anywhere by default, so it's
		// safe to consume globally while the editor window is mounted.
		if (e.key !== 'Backspace') return;
		const target = e.target as HTMLElement | null;
		const tag = target?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
			|| target?.isContentEditable) {
			return;
		}
		if (selectedIndices.length === 0) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		deleteSelected();
	}

	onMount(() => {
		window.addEventListener('keydown', onWindowDeleteCapture, { capture: true });
		// Seed preset.durationMs from the locally-derived totalMs the first
		// time the editor opens an unfilled preset. Without this, playback
		// would still bounce at the last keyframe because the trailing-hold
		// tween only fires when the preset itself carries a durationMs.
		if (preset.durationMs == null) patchPreset({ durationMs: totalMs });
	});
	onDestroy(() => {
		window.removeEventListener('keydown', onWindowDeleteCapture, { capture: true });
	});

	// rootEl is bound for the selection auto-scroll effect (querySelector
	// scope). Kept even though the editor no longer registers any keybindings.
	let rootEl = $state<HTMLDivElement | null>(null);

	function onWheel(e: WheelEvent) {
		if (!(e.ctrlKey || e.metaKey)) return;
		e.preventDefault();
		setZoom(zoom * (e.deltaY < 0 ? 1.25 : 0.8));
	}

	function formatSeconds(ms: number): string { return `${(ms / 1000).toFixed(2)}s`; }

	// ─── navigation buttons ──────────────────────────────────────────────────
	// Keyframe times are stored as integer ms, so a "step" is one ms — the
	// finest granularity the data model supports. Larger jumps are available
	// via the keyframe-jump buttons or shift+arrow.
	const STEP_MS = 1;

	function stepFrame(direction: 1 | -1) {
		playheadMs = Math.max(0, Math.min(totalMs, Math.round(playheadMs + direction * STEP_MS)));
	}

	/**
	 * Jump to a neighbouring keyframe. With `toEdge: true` (ctrl/meta+click on
	 * the nav buttons) jump straight to the first / last keyframe instead of
	 * just the adjacent one.
	 */
	function jumpKeyframe(direction: 1 | -1, toEdge = false) {
		if (keyframes.length === 0) {
			playheadMs = direction > 0 ? totalMs : 0;
			return;
		}
		if (toEdge) {
			const edgeIdx = direction > 0 ? keyframes.length - 1 : 0;
			playheadMs = keyframes[edgeIdx].time;
			selectOnly(edgeIdx);
			return;
		}
		if (direction > 0) {
			const nextIdx = keyframes.findIndex(k => k.time > playheadMs + 1);
			if (nextIdx >= 0) {
				playheadMs = keyframes[nextIdx].time;
				selectOnly(nextIdx);
			} else {
				playheadMs = totalMs;
			}
		} else {
			let prevIdx = -1;
			for (let i = 0; i < keyframes.length; i++) {
				if (keyframes[i].time < playheadMs - 1) prevIdx = i;
				else break;
			}
			if (prevIdx >= 0) {
				playheadMs = keyframes[prevIdx].time;
				selectOnly(prevIdx);
			} else {
				playheadMs = 0;
			}
		}
	}

	// ─── recording ───────────────────────────────────────────────────────────
	// Flow: user clicks Record → 3-2-1 countdown plays in the toolbar →
	// sampling begins, the playhead advances in real time and a fill renders
	// behind it on the timeline. On Stop, the raw buffer is smoothed,
	// deduplicated, and simplified into a sparse keyframe set that replaces
	// any pre-existing keyframes inside the recorded time window.

	let recording = $state(false);
	let countdown = $state<number | null>(null); // 3, 2, 1, then 0 ("GO") then null
	let smoothingWindow = $state(3);
	// Duration lock: when on, recording auto-stops at the duration mark and
	// never extends totalMs. When off, recording past the end pushes totalMs
	// out to fit the new keyframes.
	let durationLocked = $state(true);
	let recordSampleTimerId: ReturnType<typeof setInterval> | null = null;
	let countdownTimerId: ReturnType<typeof setTimeout> | null = null;
	let recordRafId: number | null = null;
	let recordStartWall = 0;
	let recordStartTimelineMs = 0;
	let recordElapsedMs = $state(0);
	let recordBuffer: CameraKeyframe[] = [];
	const RECORD_INTERVAL_MS = 33;
	const RECORD_DELTA_PX = 2;
	const RECORD_DELTA_SCALE = 0.005;
	// RDP epsilon — perpendicular pixel distance below which a sample is
	// considered redundant. 4 px on a 1080p map keeps the shape visually
	// indistinguishable from the raw curve.
	const SIMPLIFY_EPSILON_PX = 4;
	// Dedup window — adjacent samples within this many ms AND below the per-sample
	// delta thresholds collapse into one.
	const DEDUP_MIN_DT_MS = 50;

	function startRecord() {
		// Anchor at the current playhead so the recording overwrites the area
		// of the timeline the user has scrubbed to.
		recordStartTimelineMs = playheadMs;
		recordBuffer = [];
		recordElapsedMs = 0;

		// Countdown: show 3 → 2 → 1 → 0 (GO) at 1 s intervals, then begin.
		countdown = 3;
		const tick = () => {
			if (countdown === null) return;
			if (countdown > 1) {
				countdown -= 1;
				countdownTimerId = setTimeout(tick, 1000);
			} else if (countdown === 1) {
				countdown = 0;
				countdownTimerId = setTimeout(() => {
					countdown = null;
					beginSampling();
				}, 600);
			}
		};
		countdownTimerId = setTimeout(tick, 1000);
	}

	function beginSampling() {
		recording = true;
		recordStartWall = performance.now();
		// Force a sample at t=0 so the recording always anchors on the
		// starting frame. setInterval's first tick lands one interval later,
		// which used to leave a ~33 ms gap before the first keyframe.
		sampleViewport();
		recordSampleTimerId = setInterval(sampleViewport, RECORD_INTERVAL_MS);

		// rAF loop drives playhead + progress fill at display refresh rate so
		// the UI feels smooth even though sampling runs at ~30 Hz.
		const loop = () => {
			if (!recording) { recordRafId = null; return; }
			recordElapsedMs = performance.now() - recordStartWall;
			playheadMs = Math.min(totalMs, recordStartTimelineMs + recordElapsedMs);
			// Locked recording stops automatically when the playhead reaches
			// the composition end — the rAF loop is also the cleanest place to
			// detect that boundary since recordElapsedMs is updated here.
			if (durationLocked && recordStartTimelineMs + recordElapsedMs >= totalMs) {
				stopRecord();
				return;
			}
			recordRafId = requestAnimationFrame(loop);
		};
		recordRafId = requestAnimationFrame(loop);
	}

	function stopRecord() {
		if (countdownTimerId !== null) { clearTimeout(countdownTimerId); countdownTimerId = null; }
		if (recordSampleTimerId !== null) { clearInterval(recordSampleTimerId); recordSampleTimerId = null; }
		if (recordRafId !== null) { cancelAnimationFrame(recordRafId); recordRafId = null; }
		const wasRecording = recording;
		recording = false;
		countdown = null;
		if (!wasRecording || recordBuffer.length === 0) {
			recordBuffer = [];
			return;
		}

		const smoothed = smoothBuffer(recordBuffer, smoothingWindow);
		const simplified = simplifyKeyframes(smoothed, SIMPLIFY_EPSILON_PX, DEDUP_MIN_DT_MS);
		const recordEndMs = recordStartTimelineMs + (simplified[simplified.length - 1]?.time ?? 0);

		// Replace existing keyframes inside the recorded window with the new
		// (sparse, simplified) set. Keyframes outside the window are kept verbatim.
		const outsideRange = keyframes.filter(k => k.time < recordStartTimelineMs || k.time > recordEndMs);
		const offsetted = simplified.map(k => ({ ...k, time: k.time + recordStartTimelineMs, easing: 'linear' as EasingKind }));
		const next = sortKeyframesByTime([...outsideRange, ...offsetted]);
		recordBuffer = [];

		// Duration lock: when on, never grow the canvas — any keyframes past
		// totalMs are dropped silently. The user opted in to a fixed window;
		// honor it. When off, bump totalMs to fit so the recording is fully
		// visible.
		if (!durationLocked) {
			const newMax = maxKeyframeTime(next);
			if (newMax + TIMELINE_PADDING_MS > totalMs) setTotalMs(newMax + TIMELINE_PADDING_MS);
		}
		patchPreset({ keyframes: next });
	}

	function sampleViewport() {
		const vp = getLocalViewport();
		if (!vp) return;
		const t = Math.round(performance.now() - recordStartWall);
		const last = recordBuffer[recordBuffer.length - 1];
		if (last) {
			const dx = Math.abs(vp.x - last.x);
			const dy = Math.abs(vp.y - last.y);
			const ds = Math.abs(vp.scale - last.scale);
			if (dx < RECORD_DELTA_PX && dy < RECORD_DELTA_PX && ds < RECORD_DELTA_SCALE) return;
		}
		recordBuffer.push({ time: t, x: Math.round(vp.x), y: Math.round(vp.y), scale: vp.scale, easing: 'easeInOut' });
	}

	function smoothBuffer(buf: CameraKeyframe[], windowSize: number): CameraKeyframe[] {
		if (windowSize <= 1 || buf.length <= 1) return buf;
		const half = Math.floor(windowSize / 2);
		const out: CameraKeyframe[] = [];
		for (let i = 0; i < buf.length; i++) {
			let sx = 0; let sy = 0; let ss = 0; let n = 0;
			for (let j = Math.max(0, i - half); j <= Math.min(buf.length - 1, i + half); j++) {
				sx += buf[j].x; sy += buf[j].y; ss += buf[j].scale; n++;
			}
			out.push({ ...buf[i], x: Math.round(sx / n), y: Math.round(sy / n), scale: ss / n });
		}
		return out;
	}

	/**
	 * Two-pass decimation:
	 *   1. Drop adjacent samples that barely moved within `minDtMs`.
	 *   2. Ramer-Douglas-Peucker over (x, y) with `epsilonPx` perpendicular
	 *      distance: keep only points that the chord between their kept
	 *      neighbors can't approximate within tolerance.
	 *
	 * The result preserves the shape of the recorded path while dropping the
	 * straight-line filler samples that bloat the keyframe list and slow down
	 * the editor's inspector.
	 */
	function simplifyKeyframes(buf: CameraKeyframe[], epsilonPx: number, minDtMs: number): CameraKeyframe[] {
		if (buf.length <= 2) return buf;
		const dedup: CameraKeyframe[] = [buf[0]];
		for (let i = 1; i < buf.length; i++) {
			const last = dedup[dedup.length - 1];
			const cur = buf[i];
			const dt = cur.time - last.time;
			const moved = Math.hypot(cur.x - last.x, cur.y - last.y) > epsilonPx
				|| Math.abs(cur.scale - last.scale) > 0.01;
			if (dt < minDtMs && !moved) continue;
			dedup.push(cur);
		}
		// Always include the last raw sample so the recording's end frame is preserved.
		if (dedup[dedup.length - 1] !== buf[buf.length - 1]) dedup.push(buf[buf.length - 1]);
		if (dedup.length <= 2) return dedup;
		return rdpSimplify(dedup, epsilonPx);
	}

	function rdpSimplify(buf: CameraKeyframe[], epsilon: number): CameraKeyframe[] {
		if (buf.length <= 2) return buf;
		let maxDist = 0;
		let maxIdx = 0;
		const first = buf[0];
		const last = buf[buf.length - 1];
		for (let i = 1; i < buf.length - 1; i++) {
			const d = perpDistance(buf[i], first, last);
			if (d > maxDist) { maxDist = d; maxIdx = i; }
		}
		if (maxDist > epsilon) {
			const left = rdpSimplify(buf.slice(0, maxIdx + 1), epsilon);
			const right = rdpSimplify(buf.slice(maxIdx), epsilon);
			return [...left.slice(0, -1), ...right];
		}
		return [first, last];
	}

	function perpDistance(p: CameraKeyframe, a: CameraKeyframe, b: CameraKeyframe): number {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy);
		if (len < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
		return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
	}

	// Loop modes — Off (single shot), Restart (jump back to t=0), Ping-pong
	// (reverse on every cycle). Titles fall back to plain English so the row
	// stays usable before i18n keys are added.
	const loopOptions: Array<{ value: LoopMode; icon: string; title: string }> = [
		{ value: 'none', icon: 'fas fa-arrow-right', title: LOC('loopNone') ?? 'Loop off' },
		{ value: 'restart', icon: 'fas fa-rotate-right', title: LOC('loopRestart') ?? 'Restart' },
		{ value: 'pingpong', icon: 'fas fa-arrows-left-right', title: LOC('loopPingPong') ?? 'Ping-pong' },
	];

	const NAMED_EASINGS: EasingKind[] = [
		'linear',
		'easeIn',
		'easeOut',
		'easeInOut',
		'power2.in',
		'power2.out',
		'power2.inOut',
		'sine.in',
		'sine.out',
		'sine.inOut',
		'back.in',
		'back.out',
		'back.inOut',
	];
</script>

<svelte:window onmousemove={onWinMouseMove} onmouseup={onWinMouseUp} />

<div class='ape' bind:this={rootEl} tabindex='0' role='application'>
	<header class='ape-toolbar'>
		<div class='group'>
			<button type='button' class='btn' onclick={e => jumpKeyframe(-1, e.ctrlKey || e.metaKey)} title={LOC('prevKeyframe')}>
				<i class='fas fa-backward-step'></i>
			</button>
			<button type='button' class='btn' onclick={() => stepFrame(-1)} title={LOC('prevFrame')}>
				<i class='fas fa-caret-left'></i>
			</button>
			{#if !isPlaying}
				<button type='button' class='btn primary' onclick={e => play(e.ctrlKey || e.metaKey)} disabled={keyframes.length < 2} title={LOC('play')}>
					<i class='fas fa-play'></i>
				</button>
			{:else}
				<button type='button' class='btn active' onclick={stop} title={LOC('stop')}>
					<i class='fas fa-stop'></i>
				</button>
			{/if}
			<button type='button' class='btn' onclick={() => stepFrame(1)} title={LOC('nextFrame')}>
				<i class='fas fa-caret-right'></i>
			</button>
			<button type='button' class='btn' onclick={e => jumpKeyframe(1, e.ctrlKey || e.metaKey)} title={LOC('nextKeyframe')}>
				<i class='fas fa-forward-step'></i>
			</button>
		</div>

		<div class='group'>
			{#if countdown !== null}
				<button type='button' class='btn active countdown-btn' onclick={stopRecord} title={LOC('recordStop')}>
					{#if countdown > 0}
						<span class='countdown-num'>{countdown}</span>
					{:else}
						<i class='fas fa-circle rec-dot rec-dot--go'></i>
					{/if}
				</button>
			{:else if !recording}
				<button type='button' class='btn' onclick={startRecord} title={LOC('record')}>
					<i class='fas fa-circle rec-dot'></i>
				</button>
			{:else}
				<button type='button' class='btn active' onclick={stopRecord} title={LOC('recordStop')}>
					<i class='fas fa-stop'></i>
					<span class='record-elapsed'>{formatSeconds(recordElapsedMs)}</span>
				</button>
			{/if}
		</div>

		<div class='time-readout' aria-live='polite'>
			<strong>{formatSeconds(playheadMs)}</strong>
			<span class='dim'>/ {formatSeconds(totalMs)}</span>
		</div>

		<div class='spacer'></div>

		<div class='group'>
			<label class='field duration-field' title={LOC('durationTip')}>
				<span>{LOC('duration')}</span>
				<div class='duration-input-wrap' class:locked={durationLocked}>
					<input
						type='number'
						class='in tiny duration-input'
						min={MIN_DURATION_MS}
						step='100'
						value={totalMs}
						onchange={(e) => {
							const v = Number((e.currentTarget as HTMLInputElement).value) || 0;
							void tryUpdateDuration(v);
						}}
					/>
					<button
						type='button'
						class='duration-lock'
						class:locked={durationLocked}
						onclick={() => (durationLocked = !durationLocked)}
						title={durationLocked ? (LOC('durationLockedTip') ?? 'Recording stops at duration') : (LOC('durationUnlockedTip') ?? 'Recording extends duration')}
						aria-label={durationLocked ? 'Lock duration' : 'Unlock duration'}
					>
						<i class={durationLocked ? 'fas fa-lock' : 'fas fa-lock-open'}></i>
					</button>
				</div>
			</label>
		</div>

		<div class='group loop-group' title={LOC('loopTip') ?? 'Loop behaviour for this preset'}>
			{#each loopOptions as opt (opt.value)}
				<input
					type='radio'
					id='loop-{opt.value}'
					name='loop'
					value={opt.value}
					checked={(preset.loop ?? 'none') === opt.value}
					onchange={() => updateLoop(opt.value)}
				/>
				<label class='loop-btn' for='loop-{opt.value}' title={opt.title} aria-label={opt.title}>
					<i class={opt.icon}></i>
				</label>
			{/each}
		</div>

		<div class='group'>
			<label class='field' title={LOC('smoothingTip')}>
				<span>{LOC('smoothing')}</span>
				<input
					type='number'
					class='in tiny'
					min='1'
					max='15'
					value={smoothingWindow}
					onchange={(e) => { smoothingWindow = Math.max(1, Math.min(15, Number((e.currentTarget as HTMLInputElement).value) || 1)); }}
				/>
			</label>
		</div>

		<div class='group'>
			<button type='button' class='btn' onclick={() => setZoom(zoom / 1.5)} disabled={zoom <= ZOOM_MIN} title={LOC('zoomOut')}>
				<i class='fas fa-minus'></i>
			</button>
			<button type='button' class='btn zoom-readout' onclick={() => (zoom = 1)} title={LOC('zoomReset')}>{zoom.toFixed(1)}×</button>
			<button type='button' class='btn' onclick={() => setZoom(zoom * 1.5)} disabled={zoom >= ZOOM_MAX} title={LOC('zoomIn')}>
				<i class='fas fa-plus'></i>
			</button>
		</div>
	</header>

	<!-- ── timeline ───────────────────────────────────────────────────────── -->
	<div
		class='ape-timeline-wrap'
		bind:this={timelineWrapEl}
		onwheel={onWheel}
	>
		<div class='ape-timeline' bind:this={timelineEl} onmousedown={onStripMouseDown} role='presentation' style={`width: ${100 * zoom}%`}>
			<!-- tick grid: 6 labelled ticks keeps labels readable at narrow widths,
				 with minor unlabeled ticks between them for visual rhythm. -->
			<div class='ticks'>
				{#each Array.from({ length: 11 }, (_, i) => i) as i (i)}
					<div class='tick' class:major={i % 2 === 0} class:tick-last={i === 10} style={`left: ${(i / 10) * 100}%`}>
						{#if i % 2 === 0}<span>{formatSeconds((i / 10) * totalMs)}</span>{/if}
					</div>
				{/each}
			</div>

			<!-- marker rail -->
			<div class='rail'>
				{#each stacks as g (g.key)}
					{#if g.indices.length === 1}
						{@const kf = keyframes[g.indices[0]]}
						<div
							class='kf-dot'
							class:selected={isSelected(g.indices[0])}
							style={`left: ${tToX(kf.time)}px`}
							role='button'
							tabindex='0'
							aria-label='Keyframe at {kf.time}ms'
							onmousedown={e => startKfDrag(e, g.indices[0])}
							onclick={(e) => {
								e.stopPropagation();
								selectOnly(g.indices[0]);
								// Ctrl/Meta+click on the timeline yanks the playhead to the
								// keyframe — convenient when scrubbing to "go here, then play".
								if (e.ctrlKey || e.metaKey) playheadMs = keyframes[g.indices[0]].time;
							}}
						></div>
					{:else}
						<div
							class='kf-stack'
							style={`left: ${tToX(g.t)}px`}
							role='button'
							tabindex='0'
							aria-label='{g.indices.length} keyframes'
							onmousedown={(e) => { e.stopPropagation(); e.preventDefault(); }}
							onclick={(e) => {
								e.stopPropagation();
								// Cycle through stacked keyframes on plain click.
								const cur = selectedIndex !== null ? g.indices.indexOf(selectedIndex) : -1;
								const nextIdx = g.indices[(cur + 1) % g.indices.length];
								selectOnly(nextIdx);
								if (e.ctrlKey || e.metaKey) playheadMs = keyframes[nextIdx].time;
							}}
						>{g.indices.length}</div>
					{/if}
				{/each}
			</div>

			<!-- playhead line + handle -->
			{#if recording}
				{@const recStartX = tToX(recordStartTimelineMs)}
				{@const recEndX = tToX(Math.min(totalMs, recordStartTimelineMs + recordElapsedMs))}
				<div
					class='record-fill'
					style={`left: ${recStartX}px; width: ${Math.max(0, recEndX - recStartX)}px`}
					aria-hidden='true'
				></div>
			{/if}
			{#if dragState?.kind === 'lasso'}
				{@const lassoLo = Math.min(dragState.startMs, dragState.endMs)}
				{@const lassoHi = Math.max(dragState.startMs, dragState.endMs)}
				<div
					class='lasso-fill'
					style={`left: ${tToX(lassoLo)}px; width: ${Math.max(0, tToX(lassoHi) - tToX(lassoLo))}px`}
					aria-hidden='true'
				></div>
			{/if}
			<div class='playhead-line' style={`left: ${tToX(playheadMs)}px`}></div>
			<div
				class='playhead-handle'
				style={`left: ${tToX(playheadMs)}px`}
				role='button'
				tabindex='0'
				aria-label='Scrub playhead'
				onmousedown={startPlayheadDrag}
			></div>
		</div>
	</div>

	<!-- ── body: keyframe list + selected detail ─────────────────────────── -->
	<div class='ape-body'>
		<aside class='ape-list'>
			<header class='list-head'>
				<h4>{LOC('keyframes')}</h4>
				<span class='count'>{keyframes.length}</span>
				<button
					type='button'
					class='list-add'
					onclick={addAtPlayhead}
					title={LOC('addAtPlayhead')}
					aria-label={LOC('addAtPlayhead')}
				><i class='fas fa-plus'></i></button>
			</header>
			<ul>
				{#each keyframes as kf, idx (`${kf.time}-${idx}`)}
					<li>
						<button
							type='button'
							class='list-row'
							class:selected={isSelected(idx)}
							data-kf-idx={idx}
							onclick={e => selectClick(idx, e.ctrlKey || e.metaKey)}
						>
							<span class='kf-t'>{formatSeconds(kf.time)}</span>
							<span class='kf-pos'>{kf.x}, {kf.y}</span>
							<span class='kf-scale'>×{kf.scale.toFixed(2)}</span>
						</button>
					</li>
				{/each}
				{#if keyframes.length === 0}
					<li class='empty'>{LOC('noKeyframes')}</li>
				{/if}
			</ul>
		</aside>

		<section class='ape-detail'>
			{#if selectedKf}
				<header class='detail-head'>
					<h4>{LOC('selectedHeader')}</h4>
					<button type='button' class='btn small danger' onclick={deleteSelected} title={LOC('deleteKeyframe')}>
						<i class='fas fa-trash'></i>
					</button>
				</header>
				<div class='detail-grid'>
					<label class='field stack'>
						<span>{LOC('timeMs')}</span>
						<input type='number' class='in' min='0' max={totalMs} value={selectedKf.time}
							onchange={e => patchSelected({ time: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
					</label>
					<label class='field stack'>
						<span>X</span>
						<input type='number' class='in' value={selectedKf.x}
							onchange={e => patchSelected({ x: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
					</label>
					<label class='field stack'>
						<span>Y</span>
						<input type='number' class='in' value={selectedKf.y}
							onchange={e => patchSelected({ y: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
					</label>
					<label class='field stack'>
						<span>{LOC('scale')}</span>
						<input type='number' class='in' step='0.05' min='0.01' value={selectedKf.scale}
							onchange={e => patchSelected({ scale: Number((e.currentTarget as HTMLInputElement).value) || 1 })} />
					</label>
					<label class='field stack span-2'>
						<span>{LOC('easing')}</span>
						<select class='in' value={typeof selectedKf.easing === 'string' ? selectedKf.easing : 'easeInOut'}
							onchange={e => patchSelected({ easing: (e.currentTarget as HTMLSelectElement).value as EasingKind })}>
							{#each NAMED_EASINGS as name (name)}
								<option value={name as string}>{name as string}</option>
							{/each}
						</select>
					</label>
				</div>
				<div class='detail-actions'>
					<button type='button' class='btn' onclick={captureFromViewport}>
						<i class='fas fa-camera'></i>
						<span>{LOC('captureFromViewport')}</span>
					</button>
				</div>
			{:else}
				<div class='detail-empty'>
					<i class='fas fa-mouse-pointer'></i>
					<p>{LOC('selectHint')}</p>
				</div>
			{/if}
		</section>
	</div>
</div>

<style lang='stylus'>
	.ape
		display flex
		flex-direction column
		height 100%
		min-height 0
		gap 8px
		outline none

	// ── toolbar ─────────────────────────────────────────────────────────────
	.ape-toolbar
		display flex
		align-items center
		gap 6px
		padding 6px 8px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		flex 0 0 auto

	.group
		display inline-flex
		align-items center
		gap 2px
		padding 2px 6px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.06)
		border-radius 4px

	// Loop selector: three icon-only segmented radios styled as .btn so the
	// row reads as the same family as the surrounding play/record/zoom buttons.
	.loop-group
		gap 2px

		input[type=radio]
			position absolute
			opacity 0
			pointer-events none
			width 0

		.loop-btn
			display inline-flex
			align-items center
			justify-content center
			min-width 24px
			height 22px
			padding 0 5px
			background rgba(255, 255, 255, 0.05)
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			font-size 11px
			cursor pointer

			&:hover
				background rgba(255, 255, 255, 0.12)

		input[type=radio]:checked + .loop-btn
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.5)

	.spacer
		flex 1 1 auto

	.time-readout
		font-family monospace
		font-size 13px
		padding 0 4px
		white-space nowrap

		.dim
			opacity 0.5
			margin-left 4px

	.zoom-readout
		font-family monospace
		min-width 38px

	.field
		display inline-flex
		align-items center
		gap 4px
		font-size 11px

		&.stack
			flex-direction column
			align-items stretch
			gap 4px

			span
				opacity 0.75
				font-size 10px
				text-transform uppercase
				letter-spacing 0.4px

		&.span-2
			grid-column span 2

	.in
		height 24px
		padding 0 5px
		font-size 12px
		background rgba(0, 0, 0, 0.3)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		color inherit

		&.narrow
			width 80px

		&.tiny
			width 50px

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

	// Duration field: input + lock toggle share a single rounded shell so the
	// lock reads as part of the control rather than a separate button.
	.duration-input-wrap
		display inline-flex
		align-items stretch
		background rgba(0, 0, 0, 0.3)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		overflow hidden

		&:focus-within
			border-color rgba(255, 144, 0, 0.5)

		.duration-input
			background transparent
			border none
			width 56px
			height 22px
			padding 0 5px
			font-size 12px
			color inherit

			&:focus
				outline none

		// Locked: text greys out (visual signal that the value is fixed for
		// the duration of recording) and the lock icon takes the theme color.
		&.locked .duration-input
			color rgba(255, 255, 255, 0.45)

	.duration-lock
		background transparent
		border none
		padding 0 6px
		color rgba(255, 255, 255, 0.4)
		cursor pointer
		display inline-flex
		align-items center
		justify-content center
		font-size 11px

		&:hover
			color rgba(255, 255, 255, 0.75)

		&.locked
			color rgba(255, 144, 0, 0.9)

			&:hover
				color rgba(255, 200, 80, 1)

	.btn
		display inline-flex
		align-items center
		justify-content center
		gap 4px
		min-width 24px
		height 22px
		padding 0 5px
		background rgba(255, 255, 255, 0.05)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		font-size 11px
		cursor pointer

		&:hover:not(:disabled)
			background rgba(255, 255, 255, 0.12)

		&:disabled
			opacity 0.4
			cursor not-allowed

		&.active
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.5)

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

		&.close
			margin-left 4px

		&.small
			min-width 22px
			height 22px
			padding 0 6px

		.rec-dot
			color #e44

			&--go
				color #e44
				font-size 14px
				animation rec-dot-pulse 600ms ease-in-out infinite alternate

	@keyframes rec-dot-pulse
		from
			opacity 0.45
			transform scale(0.85)
		to
			opacity 1
			transform scale(1.15)

	// ── timeline ────────────────────────────────────────────────────────────
	.ape-timeline-wrap
		position relative
		flex 0 0 auto
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow-x auto
		overflow-y hidden
		// Reserve a little horizontal padding so markers at t=0 / t=totalMs
		// don't get visually clipped by their negative left margin (-8px).
		padding 8px 12px

	.ape-timeline
		position relative
		height 90px
		cursor crosshair
		user-select none
		box-sizing border-box

	.ticks
		position absolute
		inset 0
		pointer-events none

	.tick
		position absolute
		top 0
		bottom 0
		width 1px
		background rgba(255, 255, 255, 0.05)

		&.major
			background rgba(255, 255, 255, 0.12)

		span
			position absolute
			top 0
			left 3px
			font-size 9px
			font-family monospace
			opacity 0.6
			white-space nowrap

		// Final tick (t=totalMs) — anchor its label to the LEFT of the line so
		// the timeline content never overhangs the right edge of the frame.
		&.tick-last span
			left auto
			right 3px

	.rail
		position absolute
		left 0
		right 0
		top 50%
		height 18px
		transform translateY(-50%)
		background rgba(255, 255, 255, 0.06)
		border-radius 3px

	.kf-dot
		position absolute
		top 1px
		width 16px
		height 16px
		margin-left -8px
		border-radius 50%
		background rgba(255, 144, 0, 0.85)
		border 1.5px solid rgba(255, 200, 80, 0.95)
		cursor grab

		&:active
			cursor grabbing

		&.selected
			background rgba(255, 200, 30, 1)
			border-color white
			border-width 2px
			box-shadow 0 0 0 3px rgba(255, 200, 30, 0.25)

	.kf-stack
		position absolute
		top -1px
		min-width 22px
		height 20px
		margin-left -11px
		padding 0 4px
		background rgba(255, 144, 0, 0.85)
		border 1.5px solid rgba(255, 200, 80, 0.95)
		border-radius 10px
		color white
		font-size 11px
		font-weight 600
		font-family monospace
		display inline-flex
		align-items center
		justify-content center
		cursor pointer

	.record-fill
		position absolute
		top 4px
		bottom 4px
		background linear-gradient(180deg, rgba(228, 70, 70, 0.18), rgba(228, 70, 70, 0.32))
		border-left 2px solid rgba(228, 70, 70, 0.6)
		border-right 1px dashed rgba(228, 70, 70, 0.45)
		pointer-events none

	// Lasso rectangle for ctrl+drag range selection. Cooler tone than the
	// record fill so the two overlays read as different operations.
	.lasso-fill
		position absolute
		top 4px
		bottom 4px
		background rgba(120, 180, 255, 0.18)
		border 1px dashed rgba(120, 180, 255, 0.65)
		pointer-events none

	.playhead-line
		position absolute
		top 4px
		bottom 4px
		width 2px
		margin-left -1px
		background rgba(255, 255, 255, 0.85)
		pointer-events none

	.playhead-handle
		position absolute
		top -2px
		width 14px
		height 14px
		margin-left -7px
		background white
		border 1.5px solid rgba(255, 200, 80, 0.95)
		border-radius 3px
		cursor grab

		&:active
			cursor grabbing

	// ── body ────────────────────────────────────────────────────────────────
	.ape-body
		flex 1 1 auto
		display grid
		grid-template-columns minmax(180px, 240px) minmax(0, 1fr)
		gap 8px
		min-height 0

	.ape-list
		display flex
		flex-direction column
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

		.list-head
			display flex
			align-items center
			gap 6px
			padding 6px 8px
			border-bottom 1px solid rgba(255, 255, 255, 0.08)
			flex 0 0 auto

			h4
				margin 0
				flex 1 1 auto
				font-size 11px
				font-weight 600
				text-transform uppercase
				letter-spacing 0.4px
				opacity 0.7

			.count
				font-size 11px
				opacity 0.6

			.list-add
				display inline-flex
				align-items center
				justify-content center
				width 20px
				height 20px
				padding 0
				background transparent
				border 1px solid rgba(255, 255, 255, 0.15)
				border-radius 3px
				color rgba(255, 255, 255, 0.7)
				cursor pointer
				font-size 10px

				&:hover
					background rgba(255, 144, 0, 0.18)
					border-color rgba(255, 144, 0, 0.45)
					color rgba(255, 200, 80, 1)

		ul
			list-style none
			margin 0
			padding 4px
			overflow-y auto
			flex 1 1 auto
			display flex
			flex-direction column
			gap 2px

			.empty
				padding 16px 8px
				font-size 11px
				opacity 0.5
				font-style italic
				text-align center

	.list-row
		display grid
		grid-template-columns 1fr auto auto
		gap 6px
		align-items center
		width 100%
		padding 6px 8px
		background transparent
		border 1px solid transparent
		border-radius 3px
		font-size 11px
		font-family monospace
		text-align left
		cursor pointer

		.kf-t
			color #ffce80

		.kf-pos
			opacity 0.75

		.kf-scale
			opacity 0.55

		&:hover
			background rgba(255, 255, 255, 0.05)

		&.selected
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.45)

	.ape-detail
		display flex
		flex-direction column
		gap 10px
		padding 10px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow-y auto

		.detail-head
			display flex
			align-items center
			justify-content space-between

			h4
				margin 0
				font-size 12px

		.detail-grid
			display grid
			grid-template-columns 1fr 1fr
			gap 8px

		.detail-actions
			display flex
			gap 6px

		.detail-empty
			flex 1 1 auto
			display flex
			flex-direction column
			align-items center
			justify-content center
			gap 8px
			opacity 0.55
			font-size 12px

			i
				font-size 24px
</style>
