<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayTrack } from '../../utils/types.ts';

	const { tracks, selectedTrackId, initialTrackId, canRemoveStandalone, onSelect, onAdd, onRemove }: {
		tracks: OverlayTrack[];
		selectedTrackId: string | null;
		initialTrackId: string;
		canRemoveStandalone: boolean;
		onSelect: (id: string) => void;
		onAdd: () => void;
		onRemove: (id: string) => void;
	} = $props();
</script>

<aside class='tracks-pane'>
	<header class='pane-head'>
		<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}</h3>
		<button type='button' class='add-btn' onclick={onAdd} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTrack')}>
			<i class='fas fa-plus'></i>
		</button>
	</header>
	<ul class='track-list'>
		{#each tracks as track (track.id)}
			<li class='track-row' class:selected={selectedTrackId === track.id}>
				<button type='button' class='track-pick' onclick={() => onSelect(track.id)}>
					{#if initialTrackId === track.id}
						<i class='fas fa-flag initial-flag' title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialTrack')}></i>
					{/if}
					<span class='track-name'>{track.name}</span>
					<span class='track-behavior'>{track.behavior.type}</span>
				</button>
				<button
					type='button'
					class='row-btn danger'
					title={canRemoveStandalone
						? (game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTrack') ?? 'Remove track')
						: (game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeLastTrackHint') ?? 'Remove animation')}
					onclick={() => onRemove(track.id)}
				>
					<i class='fas fa-trash'></i>
				</button>
			</li>
		{/each}
	</ul>
</aside>

<style lang='stylus'>
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
</style>
