<svelte:options runes={true} />
<script lang='ts'>
	import type { LoopMode } from '../../../utils/cameraPresets.ts';

	interface Props {
		isPlaying: boolean;
		recording: boolean;
		countdown: number | null;
		recordElapsedMs: number;
		hasEnoughKeyframes: boolean;
		playheadMs: number;
		totalMs: number;
		minDurationMs: number;
		durationLocked: boolean;
		loopMode: LoopMode;
		smoothingWindow: number;
		zoom: number;
		zoomMin: number;
		zoomMax: number;
		onStepFrame: (direction: 1 | -1) => void;
		onJumpKeyframe: (direction: 1 | -1, toEdge: boolean) => void;
		onPlay: (fromStart: boolean) => void;
		onStop: () => void;
		onStartRecord: () => void;
		onStopRecord: () => void;
		onDurationChange: (raw: number) => void;
		onDurationLockToggle: () => void;
		onLoopChange: (loop: LoopMode) => void;
		onSmoothingChange: (n: number) => void;
		onZoomChange: (z: number) => void;
	}

	const {
		isPlaying,
		recording,
		countdown,
		recordElapsedMs,
		hasEnoughKeyframes,
		playheadMs,
		totalMs,
		minDurationMs,
		durationLocked,
		loopMode,
		smoothingWindow,
		zoom,
		zoomMin,
		zoomMax,
		onStepFrame,
		onJumpKeyframe,
		onPlay,
		onStop,
		onStartRecord,
		onStopRecord,
		onDurationChange,
		onDurationLockToggle,
		onLoopChange,
		onSmoothingChange,
		onZoomChange,
	}: Props = $props();

	const LOC = (key: string) => game.i18n?.localize(`obs-utils.applications.director.keyframeEditor.${key}`) ?? key;

	function formatSeconds(ms: number): string {
		return `${(ms / 1000).toFixed(2)}s`;
	}

	// Loop modes — Off (single shot), Restart (jump back to t=0), Ping-pong
	// (reverse on every cycle). Titles fall back to plain English so the row
	// stays usable before i18n keys are added.
	const loopOptions: Array<{ value: LoopMode; icon: string; title: string }> = [
		{ value: 'none', icon: 'fas fa-arrow-right', title: LOC('loopNone') ?? 'Loop off' },
		{ value: 'restart', icon: 'fas fa-rotate-right', title: LOC('loopRestart') ?? 'Restart' },
		{ value: 'pingpong', icon: 'fas fa-arrows-left-right', title: LOC('loopPingPong') ?? 'Ping-pong' },
	];
</script>

<header class='ape-toolbar'>
	<div class='group'>
		<button type='button' class='btn' onclick={e => onJumpKeyframe(-1, e.ctrlKey || e.metaKey)} title={LOC('prevKeyframe')}>
			<i class='fas fa-backward-step'></i>
		</button>
		<button type='button' class='btn' onclick={() => onStepFrame(-1)} title={LOC('prevFrame')}>
			<i class='fas fa-caret-left'></i>
		</button>
		{#if !isPlaying}
			<button type='button' class='btn primary' onclick={e => onPlay(e.ctrlKey || e.metaKey)} disabled={!hasEnoughKeyframes} title={LOC('play')}>
				<i class='fas fa-play'></i>
			</button>
		{:else}
			<button type='button' class='btn active' onclick={onStop} title={LOC('stop')}>
				<i class='fas fa-stop'></i>
			</button>
		{/if}
		<button type='button' class='btn' onclick={() => onStepFrame(1)} title={LOC('nextFrame')}>
			<i class='fas fa-caret-right'></i>
		</button>
		<button type='button' class='btn' onclick={e => onJumpKeyframe(1, e.ctrlKey || e.metaKey)} title={LOC('nextKeyframe')}>
			<i class='fas fa-forward-step'></i>
		</button>
	</div>

	<div class='group'>
		{#if countdown !== null}
			<button type='button' class='btn active countdown-btn' onclick={onStopRecord} title={LOC('recordStop')}>
				{#if countdown > 0}
					<span class='countdown-num'>{countdown}</span>
				{:else}
					<i class='fas fa-circle rec-dot rec-dot--go'></i>
				{/if}
			</button>
		{:else if !recording}
			<button type='button' class='btn' onclick={onStartRecord} title={LOC('record')}>
				<i class='fas fa-circle rec-dot'></i>
			</button>
		{:else}
			<button type='button' class='btn active' onclick={onStopRecord} title={LOC('recordStop')}>
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
					min={minDurationMs}
					step='100'
					value={totalMs}
					onchange={(e) => {
						const v = Number((e.currentTarget as HTMLInputElement).value) || 0;
						onDurationChange(v);
					}}
				/>
				<button
					type='button'
					class='duration-lock'
					class:locked={durationLocked}
					onclick={onDurationLockToggle}
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
				checked={loopMode === opt.value}
				onchange={() => onLoopChange(opt.value)}
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
				onchange={(e) => { onSmoothingChange(Math.max(1, Math.min(15, Number((e.currentTarget as HTMLInputElement).value) || 1))); }}
			/>
		</label>
	</div>

	<div class='group'>
		<button type='button' class='btn' onclick={() => onZoomChange(zoom / 1.5)} disabled={zoom <= zoomMin} title={LOC('zoomOut')}>
			<i class='fas fa-minus'></i>
		</button>
		<button type='button' class='btn zoom-readout' onclick={() => onZoomChange(1)} title={LOC('zoomReset')}>{zoom.toFixed(1)}×</button>
		<button type='button' class='btn' onclick={() => onZoomChange(zoom * 1.5)} disabled={zoom >= zoomMax} title={LOC('zoomIn')}>
			<i class='fas fa-plus'></i>
		</button>
	</div>
</header>

<style lang='stylus'>
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
</style>
