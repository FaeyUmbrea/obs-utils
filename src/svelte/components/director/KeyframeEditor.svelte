<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraKeyframe, CameraPreset, EasingKind, LoopMode } from '../../../utils/cameraPresets.ts';
	import type { SequenceController } from '../../../utils/cameraSequencePlayer.ts';
	import { onDestroy } from 'svelte';
	import {
		convertLegacyPreset,
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
		scene: any;
		onClose: () => void;
		onPresetsChange: (next: CameraPreset[]) => void;
	}

	const { preset, presets, scene, onClose, onPresetsChange }: Props = $props();

	// ─── derived view of keyframes ────────────────────────────────────────────

	const isKeyframed = $derived(Array.isArray(preset.keyframes) && preset.keyframes.length > 0);
	const keyframes = $derived(
		isKeyframed ? sortKeyframesByTime(preset.keyframes!) : [],
	);

	// ─── timeline geometry ────────────────────────────────────────────────────

	const TIMELINE_PADDING_MS = 500;
	const MIN_DURATION_MS = 2000;

	const totalMs = $derived(
		Math.max(MIN_DURATION_MS, maxKeyframeTime(keyframes) + TIMELINE_PADDING_MS),
	);

	// ─── playhead ─────────────────────────────────────────────────────────────

	let playheadMs = $state(0);

	// ─── selection ────────────────────────────────────────────────────────────

	let selectedIndex = $state<number | null>(null);

	const selectedKf = $derived(
		selectedIndex !== null ? keyframes[selectedIndex] ?? null : null,
	);

	// ─── playback ─────────────────────────────────────────────────────────────

	let controller = $state<SequenceController | null>(null);
	let isPlaying = $state(false);
	let rafId: number | null = null;
	// Initialized before startPlayheadPoll reads it; declared here for hoisting.
	let playStartWall = 0;

	function startPlayheadPoll() {
		function tick() {
			if (!controller || !controller.isPlaying()) {
				isPlaying = false;
				rafId = null;
				return;
			}
			// The controller doesn't expose a currentTime getter, so we track
			// elapsed wall time from play start and wrap at duration.
			const elapsed = performance.now() - playStartWall;
			const dur = controller.duration();
			if (dur > 0) {
				playheadMs = elapsed % dur;
			}
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);
	}

	function play() {
		if (controller) {
			controller.stop();
			controller = null;
		}
		controller = playSequence(preset);
		isPlaying = true;
		playStartWall = performance.now();
		startPlayheadPoll();
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
	});

	// ─── debounced write ──────────────────────────────────────────────────────

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

	// ─── convert legacy ───────────────────────────────────────────────────────

	function handleConvert() {
		const converted = convertLegacyPreset(preset);
		const next = presets.map(p => p.id === preset.id ? converted : p);
		onPresetsChange(next);
		writePresets(scene, next).catch(() => {});
	}

	// ─── keyframe mutations ───────────────────────────────────────────────────

	function addAtPlayhead() {
		const vp = getLocalViewport();
		if (!vp) return;
		const kf = makeKeyframe(vp, Math.round(playheadMs));
		const next = insertKeyframe(keyframes, kf);
		patchPreset({ keyframes: next });
		// Select the newly inserted frame.
		const newIdx = next.findIndex(k => k.time === kf.time && k.x === kf.x && k.y === kf.y);
		selectedIndex = newIdx;
	}

	function captureFromViewport() {
		if (selectedIndex === null || !selectedKf) return;
		const vp = getLocalViewport();
		if (!vp) return;
		const updated: CameraKeyframe = {
			...selectedKf,
			x: Math.round(vp.x),
			y: Math.round(vp.y),
			scale: vp.scale,
		};
		const next = updateKeyframeAt(keyframes, selectedIndex, updated);
		// After sort, find the updated frame to re-select it.
		const newIdx = next.findIndex(k => k === updated || (k.time === updated.time && k.x === updated.x));
		selectedIndex = newIdx >= 0 ? newIdx : null;
		patchPreset({ keyframes: next });
	}

	function deleteSelected() {
		if (selectedIndex === null) return;
		const next = removeKeyframeAt(keyframes, selectedIndex);
		selectedIndex = null;
		// Clamp playhead to new range.
		const maxT = maxKeyframeTime(next);
		if (playheadMs > maxT) playheadMs = maxT;
		patchPreset({ keyframes: next });
	}

	function updateSelectedTime(timeMs: number) {
		if (selectedIndex === null || !selectedKf) return;
		const updated: CameraKeyframe = { ...selectedKf, time: timeMs };
		const next = updateKeyframeAt(keyframes, selectedIndex, updated);
		const newIdx = next.findIndex(k => k.time === timeMs && k.x === updated.x && k.y === updated.y);
		selectedIndex = newIdx >= 0 ? newIdx : null;
		patchPreset({ keyframes: next });
	}

	function updateSelectedField(field: 'x' | 'y' | 'scale', value: number) {
		if (selectedIndex === null || !selectedKf) return;
		const updated: CameraKeyframe = { ...selectedKf, [field]: value };
		const next = updateKeyframeAt(keyframes, selectedIndex, updated);
		selectedIndex = next.findIndex(k => k === updated || (k.time === updated.time && k[field] === updated[field]));
		patchPreset({ keyframes: next });
	}

	function updateSelectedEasing(easing: EasingKind) {
		if (selectedIndex === null || !selectedKf) return;
		const updated: CameraKeyframe = { ...selectedKf, easing };
		const next = updateKeyframeAt(keyframes, selectedIndex, updated);
		selectedIndex = next.findIndex(k => k.time === updated.time && k.x === updated.x);
		patchPreset({ keyframes: next });
	}

	function updateLoop(loop: LoopMode) {
		patchPreset({ loop });
	}

	// ─── timeline interaction ─────────────────────────────────────────────────

	let timelineEl = $state<SVGSVGElement | null>(null);

	function timelineWidth(): number {
		return timelineEl?.clientWidth ?? 400;
	}

	function msToX(ms: number): number {
		return (ms / totalMs) * timelineWidth();
	}

	function xToMs(x: number): number {
		return Math.max(0, Math.min(totalMs, (x / timelineWidth()) * totalMs));
	}

	function handleTimelineClick(e: MouseEvent) {
		if (!timelineEl) return;
		playheadMs = xToMs(e.clientX - timelineEl.getBoundingClientRect().left);
	}

	// ─── keyframe drag ────────────────────────────────────────────────────────

	let draggingIndex = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartMs = 0;

	function startDrag(e: MouseEvent, idx: number) {
		e.preventDefault();
		e.stopPropagation();
		draggingIndex = idx;
		selectedIndex = idx;
		dragStartX = e.clientX;
		dragStartMs = keyframes[idx].time;
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (draggingIndex === null || !timelineEl) return;
		const dx = e.clientX - dragStartX;
		const dMs = (dx / timelineWidth()) * totalMs;
		const newMs = Math.max(0, Math.round(dragStartMs + dMs));
		const updated: CameraKeyframe = { ...keyframes[draggingIndex], time: newMs };
		const next = updateKeyframeAt(keyframes, draggingIndex, updated);
		// Re-locate the dragged frame after sort to keep draggingIndex valid.
		const newIdx = next.findIndex(k => k === updated || (k.time === newMs && k.x === updated.x && k.y === updated.y));
		draggingIndex = newIdx >= 0 ? newIdx : draggingIndex;
		selectedIndex = draggingIndex;
		patchPreset({ keyframes: next });
	}

	function onWindowMouseUp() {
		draggingIndex = null;
	}

	const LOC = (key: string) => game.i18n?.localize(`obs-utils.applications.director.keyframeEditor.${key}`) ?? key;

	const NAMED_EASINGS: EasingKind[] = [
		'linear',
		'easeIn',
		'easeOut',
		'easeInOut',
		'power1.in',
		'power1.out',
		'power1.inOut',
		'power2.in',
		'power2.out',
		'power2.inOut',
		'power3.in',
		'power3.out',
		'power3.inOut',
		'sine.in',
		'sine.out',
		'sine.inOut',
		'back.in',
		'back.out',
		'back.inOut',
	];

</script>

<svelte:window on:mousemove={onWindowMouseMove} on:mouseup={onWindowMouseUp} />

<div class='kfe'>
	{#if !isKeyframed}
		<!-- ── Legacy preset: convert prompt ───────────────────────────────── -->
		<div class='kfe-convert'>
			<p>{LOC('noKeyframes')}</p>
			<button type='button' class='btn-convert' onclick={handleConvert}>
				<i class='fas fa-film'></i>
				<span>{LOC('convert')}</span>
			</button>
		</div>
	{:else}
		<!-- ── Full keyframe editor ────────────────────────────────────────── -->

		<!-- toolbar -->
		<div class='kfe-toolbar'>
			<span class='kfe-total'>
				{LOC('total')}: <strong>{totalMs}ms</strong>
			</span>

			<label class='kfe-label'>
				{LOC('loop')}
				<select
					class='kfe-select'
					value={preset.loop ?? 'none'}
					onchange={e => updateLoop((e.currentTarget as HTMLSelectElement).value as LoopMode)}
				>
					<option value='none'>{LOC('loopNone')}</option>
					<option value='restart'>{LOC('loopRestart')}</option>
					<option value='pingpong'>{LOC('loopPingPong')}</option>
				</select>
			</label>

			<div class='kfe-playback'>
				{#if !isPlaying}
					<button
						type='button'
						class='kfe-btn'
						onclick={play}
						title={LOC('play')}
						disabled={keyframes.length < 2}
					><i class='fas fa-play'></i> {LOC('play')}</button>
				{:else}
					<button type='button' class='kfe-btn kfe-btn--active' onclick={stop} title={LOC('stop')}>
						<i class='fas fa-stop'></i> {LOC('stop')}
					</button>
				{/if}
			</div>

			<button type='button' class='kfe-btn kfe-btn--close' onclick={onClose} title={LOC('close')}>
				<i class='fas fa-times'></i>
			</button>
		</div>

		<!-- timeline strip -->
		<div class='kfe-timeline-wrap'>
			<svg
				bind:this={timelineEl}
				class='kfe-timeline'
				onclick={handleTimelineClick}
				role='presentation'
			>
				<!-- track background -->
				<rect x='0' y='20' width='100%' height='8' rx='3' class='kfe-track' />

				<!-- keyframe markers -->
				{#each keyframes as kf, idx (`${kf.time}-${idx}`)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						cx={msToX(kf.time)}
						cy='24'
						r='7'
						class='kfe-marker'
						class:kfe-marker--selected={selectedIndex === idx}
						onmousedown={e => startDrag(e, idx)}
					/>
				{/each}

				<!-- playhead -->
				<line
					x1={msToX(playheadMs)}
					y1='0'
					x2={msToX(playheadMs)}
					y2='52'
					class='kfe-playhead'
				/>
			</svg>

			<!-- time labels -->
			<div class='kfe-time-labels'>
				<span>0ms</span>
				<span>{Math.round(totalMs / 2)}ms</span>
				<span>{totalMs}ms</span>
			</div>
		</div>

		<!-- add keyframe button -->
		<button type='button' class='kfe-add-btn' onclick={addAtPlayhead}>
			<i class='fas fa-plus'></i>
			<span>{LOC('addAtPlayhead')}</span>
		</button>

		<!-- selected keyframe detail -->
		{#if selectedKf !== null && selectedIndex !== null}
			<div class='kfe-detail'>
				<div class='kfe-detail-header'>
					<i class='fas fa-circle kfe-detail-dot'></i>
					<span>{LOC('selectedHeader')}: t={selectedKf.time}ms</span>
				</div>
				<div class='kfe-detail-fields'>
					<label class='kfe-field'>
						<span>{LOC('timeMs')}</span>
						<input
							type='number'
							class='kfe-input'
							value={selectedKf.time}
							min='0'
							onchange={e => updateSelectedTime(Number((e.currentTarget as HTMLInputElement).value))}
						/>
					</label>
					<label class='kfe-field'>
						<span>X</span>
						<input
							type='number'
							class='kfe-input'
							value={selectedKf.x}
							onchange={e => updateSelectedField('x', Number((e.currentTarget as HTMLInputElement).value))}
						/>
					</label>
					<label class='kfe-field'>
						<span>Y</span>
						<input
							type='number'
							class='kfe-input'
							value={selectedKf.y}
							onchange={e => updateSelectedField('y', Number((e.currentTarget as HTMLInputElement).value))}
						/>
					</label>
					<label class='kfe-field'>
						<span>Scale</span>
						<input
							type='number'
							class='kfe-input'
							value={selectedKf.scale}
							step='0.01'
							min='0.01'
							onchange={e => updateSelectedField('scale', Number((e.currentTarget as HTMLInputElement).value))}
						/>
					</label>
				</div>
				<label class='kfe-easing-row'>
					<span>{LOC('easing')}</span>
					<select
						class='kfe-select'
						value={typeof selectedKf.easing === 'string' ? selectedKf.easing : 'easeInOut'}
						onchange={e => updateSelectedEasing((e.currentTarget as HTMLSelectElement).value as EasingKind)}
					>
						{#each NAMED_EASINGS as name (name)}
							<option value={name as string}>{name as string}</option>
						{/each}
					</select>
				</label>
				<div class='kfe-detail-actions'>
					<button type='button' class='kfe-btn' onclick={captureFromViewport}>
						<i class='fas fa-camera'></i>
						<span>{LOC('captureFromViewport')}</span>
					</button>
					<button
						type='button'
						class='kfe-btn kfe-btn--danger'
						onclick={deleteSelected}
						disabled={keyframes.length <= 1}
					>
						<i class='fas fa-trash'></i>
						<span>{LOC('deleteKeyframe')}</span>
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style lang='stylus'>
	.kfe
		display flex
		flex-direction column
		gap 6px
		padding 8px
		background rgba(0, 0, 0, 0.2)
		border 1px solid rgba(255, 144, 0, 0.2)
		border-top none
		border-radius 0 0 4px 4px

	// ── convert prompt ──────────────────────────────────────────────────────

	.kfe-convert
		display flex
		flex-direction column
		align-items center
		gap 8px
		padding 12px 0

		p
			margin 0
			font-size 11px
			opacity 0.7

		.btn-convert
			display inline-flex
			align-items center
			gap 6px
			height 28px
			padding 0 12px
			font-size 11px
			background rgba(255, 144, 0, 0.15)
			border 1px solid rgba(255, 144, 0, 0.4)
			border-radius 3px
			cursor pointer

			&:hover
				background rgba(255, 144, 0, 0.28)
				border-color rgba(255, 144, 0, 0.7)

	// ── toolbar ─────────────────────────────────────────────────────────────

	.kfe-toolbar
		display flex
		align-items center
		gap 8px
		flex-wrap wrap

		.kfe-total
			font-size 11px
			opacity 0.8
			flex 1 1 auto

		.kfe-label
			display flex
			align-items center
			gap 4px
			font-size 11px

		.kfe-playback
			margin-left auto

	.kfe-btn
		display inline-flex
		align-items center
		gap 5px
		height 24px
		padding 0 8px
		font-size 11px
		background rgba(255, 255, 255, 0.06)
		border 1px solid rgba(255, 255, 255, 0.13)
		border-radius 3px
		cursor pointer

		&:hover:not(:disabled)
			background rgba(255, 255, 255, 0.12)

		&:disabled
			opacity 0.4
			cursor not-allowed

		&--active
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.5)

		&--close
			padding 0 7px

		&--danger:hover:not(:disabled)
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

	.kfe-select
		height 22px
		padding 0 4px
		font-size 11px
		background rgba(0, 0, 0, 0.3)
		border 1px solid rgba(255, 255, 255, 0.13)
		border-radius 3px
		color inherit
		cursor pointer

	// ── timeline ─────────────────────────────────────────────────────────────

	.kfe-timeline-wrap
		display flex
		flex-direction column
		gap 2px
		user-select none

	.kfe-timeline
		width 100%
		height 52px
		cursor crosshair
		overflow visible

	.kfe-track
		fill rgba(255, 255, 255, 0.08)
		stroke rgba(255, 255, 255, 0.12)
		stroke-width 1

	.kfe-marker
		fill rgba(255, 144, 0, 0.7)
		stroke rgba(255, 200, 80, 0.9)
		stroke-width 1.5
		cursor grab

		&:active
			cursor grabbing

		&--selected
			fill rgba(255, 200, 30, 0.95)
			stroke white
			stroke-width 2

	.kfe-playhead
		stroke rgba(255, 255, 255, 0.75)
		stroke-width 1.5
		stroke-dasharray 3 2
		pointer-events none

	.kfe-time-labels
		display flex
		justify-content space-between
		font-size 10px
		opacity 0.5
		padding 0 2px

	// ── add button ───────────────────────────────────────────────────────────

	.kfe-add-btn
		align-self flex-start
		display inline-flex
		align-items center
		gap 5px
		height 24px
		padding 0 10px
		font-size 11px
		background rgba(255, 144, 0, 0.12)
		border 1px solid rgba(255, 144, 0, 0.35)
		border-radius 3px
		cursor pointer

		&:hover
			background rgba(255, 144, 0, 0.22)
			border-color rgba(255, 144, 0, 0.6)

	// ── detail panel ─────────────────────────────────────────────────────────

	.kfe-detail
		display flex
		flex-direction column
		gap 6px
		padding 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px

		.kfe-detail-header
			display flex
			align-items center
			gap 6px
			font-size 11px
			font-weight 600

			.kfe-detail-dot
				font-size 8px
				color rgba(255, 200, 30, 0.9)

	.kfe-detail-fields
		display grid
		grid-template-columns repeat(4, 1fr)
		gap 6px

	.kfe-field
		display flex
		flex-direction column
		gap 2px
		font-size 11px

		span
			opacity 0.65

	.kfe-input
		height 22px
		padding 0 5px
		font-size 11px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 3px
		color inherit
		width 100%

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

	.kfe-easing-row
		display flex
		align-items center
		gap 8px
		font-size 11px

		.kfe-select
			flex 1 1 auto

	.kfe-detail-actions
		display flex
		gap 6px
		flex-wrap wrap
</style>
