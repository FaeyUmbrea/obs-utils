<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraKeyframe, CameraPreset, LoopMode } from '../../../utils/cameraPresets.ts';
	import type { SequenceController } from '../../../utils/cameraSequencePlayer.ts';
	import { onDestroy, onMount, untrack } from 'svelte';
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
	import AnimationPresetKeyframeInspector from './AnimationPresetKeyframeInspector.svelte';
	import AnimationPresetKeyframeList from './AnimationPresetKeyframeList.svelte';
	import { RecordingController } from './animationPresetRecording.svelte.ts';
	import AnimationPresetTimeline from './AnimationPresetTimeline.svelte';
	import AnimationPresetToolbar from './AnimationPresetToolbar.svelte';

	interface Props {
		preset: CameraPreset;
		presets: CameraPreset[];
		scene: unknown;
		onClose: () => void;
		onPresetsChange: (next: CameraPreset[]) => void;
	}

	const { preset, presets, scene, onPresetsChange }: Props = $props();

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
	let totalMs = $state(untrack(() => preset.durationMs
		?? Math.max(MIN_DURATION_MS, maxKeyframeTime(preset.keyframes ?? []) + TIMELINE_PADDING_MS)));

	/** Persist the composition duration onto the preset so the play path bounces / holds against it. */
	function setTotalMs(v: number) {
		const next = Math.max(MIN_DURATION_MS, Math.round(v));
		totalMs = next;
		if (preset.durationMs !== next) patchPreset({ durationMs: next });
	}

	let zoom = $state(1);
	function setZoom(z: number) {
		zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
	}

	let playheadMs = $state(0);
	// Multi-select model — `selectedIndices` is the source of truth (sorted,
	// may be empty). Drag, inspector and the scrub-to-viewport effect treat
	// the first entry as the "primary" selection, exposed as `selectedIndex`.
	let selectedIndices = $state<number[]>([]);
	const selectedIndex = $derived<number | null>(selectedIndices.length > 0 ? selectedIndices[0] : null);
	const selectedKf = $derived<CameraKeyframe | null>(selectedIndex !== null ? keyframes[selectedIndex] ?? null : null);

	// rootEl is bound for the selection auto-scroll effect (querySelector
	// scope). Kept even though the editor no longer registers any keybindings.
	let rootEl = $state<HTMLDivElement | null>(null);

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
			const a = kfs[i];
			const b = kfs[i + 1];
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

	let isPlaying = $state(false);
	let smoothingWindow = $state(3);
	// Duration lock: when on, recording auto-stops at the duration mark and
	// never extends totalMs. When off, recording past the end pushes totalMs
	// out to fit the new keyframes.
	let durationLocked = $state(true);

	const recordingController = new RecordingController({
		getViewport: getLocalViewport,
		getKeyframes: () => keyframes,
		getPlayheadMs: () => playheadMs,
		setPlayheadMs: (v) => { playheadMs = v; },
		getTotalMs: () => totalMs,
		setTotalMs,
		getSmoothingWindow: () => smoothingWindow,
		getDurationLocked: () => durationLocked,
		timelinePaddingMs: TIMELINE_PADDING_MS,
		onKeyframesCommit: (next) => { patchPreset({ keyframes: next }); },
	});

	// Snap the editor user's local viewport to the interpolated position at the
	// current playhead so scrubbing/stepping/jumping previews what the
	// animation will look like. Suppressed during recording (the user *is*
	// driving the viewport — we mustn't fight them) and during playback (GSAP
	// already drives the canvas via clampAndApplyExternal).
	$effect(() => {
		if (recordingController.recording || isPlaying) return;
		const pos = interpolateAt(playheadMs);
		if (!pos) return;
		(canvas as any)?.pan?.(pos);
	});

	// ─── playback ─────────────────────────────────────────────────────────────

	let controller = $state<SequenceController | null>(null);
	let rafId: number | null = null;
	let playStartWall = 0;

	function tickPlay() {
		if (!controller) {
			isPlaying = false;
			rafId = null;
			return;
		}
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
		if (controller) {
			controller.stop();
			controller = null;
		}
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
		if (controller) {
			controller.stop();
			controller = null;
		}
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		isPlaying = false;
	}

	onDestroy(() => {
		stop();
		recordingController.dispose();
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
		const LOC = (key: string) => game.i18n?.localize(`obs-utils.applications.director.keyframeEditor.${key}`) ?? key;
		const v = Math.max(MIN_DURATION_MS, Math.round(raw));
		const lostKfs = keyframes.filter(k => k.time > v);
		if (lostKfs.length === 0) {
			setTotalMs(v);
			return;
		}
		const DialogV2 = (foundry as any)?.applications?.api?.DialogV2;
		const shortenMsg = LOC('shortenWarning') ?? `This will delete ${lostKfs.length} keyframe${lostKfs.length === 1 ? '' : 's'} past the new duration. Continue?`;
		const confirmed = await DialogV2?.confirm?.({
			window: { title: LOC('shortenTitle') ?? 'Shorten duration' },
			content: `<p>${shortenMsg}</p>`,
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
			selectedIndices = [edgeIdx];
			return;
		}
		if (direction > 0) {
			const nextIdx = keyframes.findIndex(k => k.time > playheadMs + 1);
			if (nextIdx >= 0) {
				playheadMs = keyframes[nextIdx].time;
				selectedIndices = [nextIdx];
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
				selectedIndices = [prevIdx];
			} else {
				playheadMs = 0;
			}
		}
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
</script>

<div class='ape' bind:this={rootEl} role='application'>
	<AnimationPresetToolbar
		{isPlaying}
		recording={recordingController.recording}
		countdown={recordingController.countdown}
		recordElapsedMs={recordingController.recordElapsedMs}
		hasEnoughKeyframes={keyframes.length >= 2}
		{playheadMs}
		{totalMs}
		minDurationMs={MIN_DURATION_MS}
		{durationLocked}
		loopMode={preset.loop ?? 'none'}
		{smoothingWindow}
		{zoom}
		zoomMin={ZOOM_MIN}
		zoomMax={ZOOM_MAX}
		onStepFrame={stepFrame}
		onJumpKeyframe={jumpKeyframe}
		onPlay={play}
		onStop={stop}
		onStartRecord={() => recordingController.start()}
		onStopRecord={() => recordingController.stop()}
		onDurationChange={raw => void tryUpdateDuration(raw)}
		onDurationLockToggle={() => (durationLocked = !durationLocked)}
		onLoopChange={updateLoop}
		onSmoothingChange={n => (smoothingWindow = n)}
		onZoomChange={setZoom}
	/>
	<AnimationPresetTimeline
		{keyframes}
		{totalMs}
		{zoom}
		bind:playheadMs
		bind:selectedIndices
		recording={recordingController.recording}
		recordStartTimelineMs={recordingController.recordStartTimelineMs}
		recordElapsedMs={recordingController.recordElapsedMs}
		onKeyframesChange={next => patchPreset({ keyframes: next })}
		onZoomChange={setZoom}
	/>
	<div class='ape-body'>
		<AnimationPresetKeyframeList
			{keyframes}
			bind:selectedIndices
			onAdd={addAtPlayhead}
		/>
		<AnimationPresetKeyframeInspector
			{selectedKf}
			{totalMs}
			onPatch={patchSelected}
			onCapture={captureFromViewport}
			onDelete={deleteSelected}
		/>
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

	// ── body ────────────────────────────────────────────────────────────────
	.ape-body
		flex 1 1 auto
		display grid
		grid-template-columns minmax(180px, 240px) minmax(0, 1fr)
		gap 8px
		min-height 0
</style>
