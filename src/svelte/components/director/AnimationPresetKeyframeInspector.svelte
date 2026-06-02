<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraKeyframe, EasingKind } from '../../../utils/cameraPresets.ts';
	import { NAMED_EASINGS } from '../../../utils/animationPresetRecording.ts';

	interface Props {
		selectedKf: CameraKeyframe | null;
		totalMs: number;
		onPatch: (patch: Partial<CameraKeyframe>) => void;
		onCapture: () => void;
		onDelete: () => void;
	}
	const { selectedKf, totalMs, onPatch, onCapture, onDelete }: Props = $props();

	const LOC = (key: string) => game.i18n?.localize(`obs-utils.applications.director.keyframeEditor.${key}`) ?? key;
</script>

<section class='ape-detail'>
	{#if selectedKf}
		<header class='detail-head'>
			<h4>{LOC('selectedHeader')}</h4>
			<button type='button' class='btn small danger' onclick={onDelete} title={LOC('deleteKeyframe')}>
				<i class='fas fa-trash'></i>
			</button>
		</header>
		<div class='detail-grid'>
			<label class='field stack'>
				<span>{LOC('timeMs')}</span>
				<input type='number' class='in' min='0' max={totalMs} value={selectedKf.time}
					onchange={e => onPatch({ time: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
			</label>
			<label class='field stack'>
				<span>X</span>
				<input type='number' class='in' value={selectedKf.x}
					onchange={e => onPatch({ x: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
			</label>
			<label class='field stack'>
				<span>Y</span>
				<input type='number' class='in' value={selectedKf.y}
					onchange={e => onPatch({ y: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
			</label>
			<label class='field stack'>
				<span>{LOC('scale')}</span>
				<input type='number' class='in' step='0.05' min='0.01' value={selectedKf.scale}
					onchange={e => onPatch({ scale: Number((e.currentTarget as HTMLInputElement).value) || 1 })} />
			</label>
			<label class='field stack span-2'>
				<span>{LOC('easing')}</span>
				<select class='in' value={typeof selectedKf.easing === 'string' ? selectedKf.easing : 'easeInOut'}
					onchange={e => onPatch({ easing: (e.currentTarget as HTMLSelectElement).value as EasingKind })}>
					{#each NAMED_EASINGS as name (name)}
						<option value={name as string}>{name as string}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class='detail-actions'>
			<button type='button' class='btn' onclick={onCapture}>
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

<style lang='stylus'>
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

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.5)

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

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

		&.small
			min-width 22px
			height 22px
			padding 0 6px
</style>
