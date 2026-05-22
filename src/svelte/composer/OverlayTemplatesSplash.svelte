<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayTemplate } from '../../utils/overlayTemplates.ts';

	let { templates, onPick } = $props<{
		templates: OverlayTemplate[];
		onPick: (key: string) => void;
	}>();
</script>

<div class='empty-overlay-state'>
	<div class='empty-inner'>
		<header class='templates-head'>
			<h2>{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyTitle')}</h2>
			<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyDescription')}</p>
		</header>
		<div class='template-grid'>
			{#each templates as tpl (tpl.key)}
				<button type='button' class='template-card' onclick={() => onPick(tpl.key)}>
					<div class='card-icon'><i class={tpl.icon}></i></div>
					<div class='card-text'>
						<span class='template-label'>{game.i18n?.localize(tpl.label) ?? tpl.label}</span>
						<span class='template-desc'>{game.i18n?.localize(tpl.description) ?? tpl.description}</span>
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>

<style lang='stylus'>
	.empty-overlay-state
		display flex
		align-items center
		justify-content center
		height calc(100% - 44px)
		padding 24px
		overflow auto

	.empty-inner
		width 100%
		max-width 720px
		display flex
		flex-direction column
		gap 18px

	.templates-head
		text-align center

		h2
			margin 0 0 6px 0
			font-size 18px
			font-weight 600

		p
			margin 0
			font-size 12px
			opacity 0.65
			line-height 1.5

	.template-grid
		display grid
		grid-template-columns repeat(auto-fill, minmax(200px, 1fr))
		gap 10px

	.template-card
		display flex
		align-items center
		gap 10px
		padding 12px 14px
		min-height 64px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 6px
		cursor pointer
		text-align left
		transition background 120ms ease, border-color 120ms ease

		&:hover
			background rgba(255, 144, 0, 0.12)
			border-color rgba(255, 144, 0, 0.4)

		.card-icon
			flex 0 0 36px
			display flex
			align-items center
			justify-content center
			width 36px
			height 36px
			background rgba(255, 144, 0, 0.12)
			border-radius 4px

			i
				font-size 18px
				color #ffce80

		.card-text
			display flex
			flex-direction column
			gap 2px
			min-width 0

		.template-label
			font-size 13px
			font-weight 600

		.template-desc
			font-size 11px
			opacity 0.65
			line-height 1.35
</style>
