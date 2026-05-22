<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayTrack, TrackBehavior } from '../../utils/types.ts';

	const {
		track,
		isInitial,
		isPlaying,
		playheadT,
		transitionsCount,
		canTransition,
		transitionsOpen,
		onRename,
		onBehavior,
		onDuration,
		onInitial,
		onPlay,
		onStop,
		onStepFrame,
		onJumpKeyframe,
		onSetPlayhead,
		onToggleTransitions,
	}: {
		track: OverlayTrack;
		isInitial: boolean;
		isPlaying: boolean;
		playheadT: number;
		transitionsCount: number;
		canTransition: boolean;
		transitionsOpen: boolean;
		onRename: (name: string) => void;
		onBehavior: (type: TrackBehavior['type']) => void;
		onDuration: (ms: number) => void;
		onInitial: () => void;
		onPlay: () => void;
		onStop: () => void;
		onStepFrame: (direction: 1 | -1) => void;
		onJumpKeyframe: (direction: 1 | -1, toEdge: boolean) => void;
		onSetPlayhead: (t: number) => void;
		onToggleTransitions: () => void;
	} = $props();

	const behaviorOptions: Array<{ value: TrackBehavior['type']; icon: string; labelKey: string }> = [
		{ value: 'static', icon: 'fas fa-pause', labelKey: 'obs-utils.applications.overlayEditor.animation.behaviorStatic' },
		{ value: 'looping', icon: 'fas fa-rotate', labelKey: 'obs-utils.applications.overlayEditor.animation.behaviorLooping' },
		{ value: 'transition-on-end', icon: 'fas fa-arrow-right-from-bracket', labelKey: 'obs-utils.applications.overlayEditor.animation.behaviorTransitionOnEnd' },
	];
</script>

<header class='track-bar'>
	<input
		type='text'
		class='track-name-input'
		value={track.name}
		onchange={e => onRename((e.currentTarget as HTMLInputElement).value)}
		placeholder={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}
	/>
	<div class='behavior-group' role='radiogroup' aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behavior')}>
		{#each behaviorOptions as opt (opt.value)}
			<button
				type='button'
				class='behavior-btn'
				class:active={track.behavior.type === opt.value}
				title={game.i18n?.localize(opt.labelKey) ?? opt.value}
				aria-label={game.i18n?.localize(opt.labelKey) ?? opt.value}
				onclick={() => onBehavior(opt.value)}
			>
				<i class={opt.icon}></i>
			</button>
		{/each}
	</div>
	{#if track.behavior.type !== 'static'}
		<label class='inline-field'>
			<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.duration')}</span>
			<input
				type='number'
				class='narrow'
				min='0'
				value={track.durationMs}
				onchange={e => onDuration(Number((e.currentTarget as HTMLInputElement).value) || 0)}
			/>
		</label>
	{/if}
	<button
		type='button'
		class='initial-btn'
		class:active={isInitial}
		onclick={onInitial}
		title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.useAsInitial')}
	>
		<i class='fas fa-flag'></i>
		<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialShort')}</span>
	</button>
	<button
		type='button'
		class='tx-btn'
		onclick={onToggleTransitions}
		class:active={transitionsOpen}
		disabled={!canTransition}
		title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')}
	>
		<i class='fas fa-diagram-project'></i>
		<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.transitions')}</span>
		{#if transitionsCount > 0}
			<span class='tx-count'>{transitionsCount}</span>
		{/if}
	</button>
</header>

<div class='timeline-controls'>
	<div class='nav-buttons'>
		<button type='button' class='small-btn' onclick={e => onJumpKeyframe(-1, e.ctrlKey || e.metaKey)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.prevKeyframe')}>
			<i class='fas fa-backward-step'></i>
		</button>
		<button type='button' class='small-btn' onclick={() => onStepFrame(-1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.prevFrame')}>
			<i class='fas fa-caret-left'></i>
		</button>
		{#if !isPlaying}
			<button type='button' class='small-btn primary' onclick={onPlay} disabled={track.durationMs <= 0} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.play') ?? 'Play'}>
				<i class='fas fa-play'></i>
			</button>
		{:else}
			<button type='button' class='small-btn active' onclick={onStop} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.stop') ?? 'Stop'}>
				<i class='fas fa-stop'></i>
			</button>
		{/if}
		<button type='button' class='small-btn' onclick={() => onStepFrame(1)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.nextFrame')}>
			<i class='fas fa-caret-right'></i>
		</button>
		<button type='button' class='small-btn' onclick={e => onJumpKeyframe(1, e.ctrlKey || e.metaKey)} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.nextKeyframe')}>
			<i class='fas fa-forward-step'></i>
		</button>
	</div>
	<label class='inline-field'>
		<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.playhead')}</span>
		<input
			type='number'
			class='narrow'
			min='0'
			max={track.durationMs}
			value={Math.round(playheadT)}
			onchange={e => onSetPlayhead(Math.max(0, Math.min(track.durationMs, Number((e.currentTarget as HTMLInputElement).value) || 0)))}
		/>
		<span class='units'>/ {track.durationMs} ms</span>
	</label>
</div>

<style lang='stylus'>
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

		input
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

	.timeline-controls
		display flex
		align-items center
		gap 8px
		flex 0 0 auto

	.nav-buttons
		display inline-flex
		gap 2px

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
</style>
