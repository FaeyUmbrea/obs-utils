<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayTemplate } from '../../utils/overlayTemplates.ts';
	import type { OverlayData } from '../../utils/types.ts';
	import { SortableList } from '@jhubbardsf/svelte-sortablejs';
	import { getApi } from '../../utils/helpers.ts';

	let {
		overlays,
		selectedLayerIndex = $bindable(),
		selectedComponentIndex = $bindable(),
		removeLayer,
		reorderLayers,
		toggleLayerEnabled,
		templates,
		addFromTemplate,
	} = $props<{
		overlays: OverlayData[];
		selectedLayerIndex: number | null;
		selectedComponentIndex: number | null;
		addLayer: (type?: string) => void;
		removeLayer: (index: number) => void;
		reorderLayers: (from: number, to: number) => void;
		toggleLayerEnabled: (index: number) => void;
		templates?: OverlayTemplate[];
		addFromTemplate?: (key: string) => void;
	}>();

	let rerender = $state(0);

	function onReorder(e: any) {
		const from = e.oldDraggableIndex;
		const to = e.newDraggableIndex;
		if (from === undefined || to === undefined || from === to) {
			rerender++;
			return;
		}
		reorderLayers(from, to);
		rerender++;
	}

	let addMenuOpen = $state(false);

	function typeLabel(type: string): string {
		const key = getApi().overlayTypeNames?.get(type);
		return key ? game.i18n.localize(key) : type;
	}

	function layerLabel(overlay: OverlayData, index: number): string {
		return overlay.name?.trim() || `#${index}`;
	}

	function selectLayer(index: number) {
		selectedLayerIndex = index;
		selectedComponentIndex = null;
	}

</script>

<div class='layers'>
	<header class='layers-header'>
		<span class='title'>{game.i18n?.localize('obs-utils.applications.overlayEditor.layersHeader')}</span>
		<div class='add'>
			<button
				type='button'
				class='add-button'
				aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.addOverlayButton')}
				title={game.i18n?.localize('obs-utils.applications.overlayEditor.addOverlayButton')}
				onclick={() => (addMenuOpen = !addMenuOpen)}
			>
				<i class='fas fa-plus'></i>
				<i class='fas fa-caret-down'></i>
			</button>
			{#if addMenuOpen}
				<div class='add-menu' role='menu'>
					{#if templates && addFromTemplate && templates.length > 0}
						{#each templates as tpl (tpl.key)}
							<button
								type='button'
								role='menuitem'
								class='template-item'
								onclick={() => {
									addMenuOpen = false;
									addFromTemplate(tpl.key);
								}}
							>
								<i class={tpl.icon}></i>
								<span>{game.i18n?.localize(tpl.label) ?? tpl.label}</span>
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<div class='layer-list'>
		<SortableList class='sortable' animation={150} handle='.grab' onEnd={onReorder}>
			{#key rerender}
				{#each overlays as overlay, index (overlay?.id ?? `idx-${index}`)}
					{@const active = selectedLayerIndex === index}
					{@const disabled = overlay?.enabled === false}
					<div class='layer' class:active class:disabled>
						<span class='grab' aria-hidden='true' title='Drag to reorder'>
							<i class='fas fa-grip-vertical'></i>
						</span>
						<button
							type='button'
							class='visibility'
							aria-label={disabled
								? game.i18n?.localize('obs-utils.applications.overlayEditor.showLayer')
								: game.i18n?.localize('obs-utils.applications.overlayEditor.hideLayer')}
							title={disabled
								? game.i18n?.localize('obs-utils.applications.overlayEditor.showLayer')
								: game.i18n?.localize('obs-utils.applications.overlayEditor.hideLayer')}
							onclick={(e) => {
								e.stopPropagation();
								toggleLayerEnabled(index);
							}}
						>
							<i class={disabled ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
						</button>
						<button
							type='button'
							class='layer-body'
							onclick={() => selectLayer(index)}
						>
							<span class='name'>
								{layerLabel(overlay, index)}
								{#if disabled}<span class='hidden-tag'>·&nbsp;hidden</span>{/if}
							</span>
							<span class='type'>{typeLabel(overlay.type)}</span>
						</button>
						<button
							type='button'
							class='delete'
							aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.removeButton')}
							title={game.i18n?.localize('obs-utils.applications.overlayEditor.removeButton')}
							onclick={(e) => {
								e.stopPropagation();
								removeLayer(index);
							}}
						>
							<i class='fas fa-trash'></i>
						</button>
					</div>
				{/each}
			{/key}
		</SortableList>
		{#if overlays.length === 0}
			<div class='empty'>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyLayers')}
			</div>
		{/if}
	</div>
</div>

<style lang='stylus'>
	.layers
		display flex
		flex-direction column
		height 100%
		min-height 0

	.layers-header
		display flex
		align-items center
		justify-content space-between
		padding 6px 8px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		.title
			font-size 12px
			font-weight 600
			text-transform uppercase
			opacity 0.7
			letter-spacing 0.5px

	.add
		position relative

		.add-button
			width auto
			height 24px
			padding 0 6px
			display inline-flex
			align-items center
			gap 4px
			font-size 11px

		.add-menu
			position absolute
			top calc(100% + 4px)
			right 0
			min-width 180px
			background #2a2a2a
			border 1px solid rgba(255, 255, 255, 0.15)
			border-radius 4px
			z-index 10
			display flex
			flex-direction column
			padding 4px
			gap 2px

			button
				text-align left
				background transparent
				border none
				padding 6px 10px
				font-size 12px
				display flex
				align-items center
				gap 8px

				i
					opacity 0.7
					font-size 11px
					min-width 12px

				&:hover:not(:disabled)
					background rgba(255, 255, 255, 0.08)

				&:disabled
					opacity 0.4
					cursor not-allowed

			.template-item i
				color #ffce80

	.layer-list
		margin 0
		padding 4px
		flex 1 1 auto
		min-height 0
		overflow-y auto

		:global(.sortable)
			display flex
			flex-direction column
			gap 2px

	.empty
		padding 12px
		text-align center
		font-size 11px
		opacity 0.5

	.layer
		display grid
		grid-template-columns 18px 24px 1fr 24px
		align-items center
		padding 0
		border-radius 4px
		border 1px solid transparent

		.grab
			display flex
			align-items center
			justify-content center
			width 18px
			height 32px
			opacity 0.4
			cursor grab
			font-size 10px

			&:hover
				opacity 0.8

		&:hover .grab
			opacity 0.7

		&.active
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)

		&.disabled .layer-body .name
			opacity 0.55
			text-decoration line-through
			text-decoration-color rgba(255, 255, 255, 0.35)

		&.disabled .layer-body .type
			opacity 0.35

		&.disabled .layer-body .name .hidden-tag
			text-decoration none
			font-size 9px
			font-weight 500
			opacity 0.7
			color #ff9000
			text-transform uppercase
			letter-spacing 0.5px
			margin-left 4px

		.visibility, .delete
			background transparent
			border none
			width 24px
			height 32px
			display flex
			align-items center
			justify-content center
			opacity 0.7
			cursor pointer
			pointer-events auto

			&:hover
				opacity 1

		.layer-body
			display flex
			flex-direction column
			align-items flex-start
			justify-content center
			gap 2px
			background transparent
			border none
			padding 4px 6px
			min-width 0
			height 32px
			text-align left
			cursor pointer

			.name
				font-size 12px
				font-weight 500
				white-space nowrap
				overflow hidden
				text-overflow ellipsis
				width 100%

			.type
				font-size 10px
				opacity 0.6
				white-space nowrap
				overflow hidden
				text-overflow ellipsis
				width 100%
</style>
