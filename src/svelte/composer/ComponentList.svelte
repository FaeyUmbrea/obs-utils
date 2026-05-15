<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData } from '../../utils/types.ts';
	import { SortableList } from '@jhubbardsf/svelte-sortablejs';
	import { getApi } from '../../utils/helpers.ts';

	let {
		components,
		overlayType,
		selectedIndex = $bindable(),
		onReorder,
		onRemove,
	} = $props<{
		components: OverlayComponentData[];
		overlayType: string;
		selectedIndex: number | null;
		onReorder: (from: number, to: number) => void;
		onRemove: (index: number) => void;
	}>();

	let rerender = $state(0);

	function typeLabel(type: string): string {
		const entry = getApi().overlayTypes.get(overlayType);
		const key = entry?.overlayComponentNames?.get(type);
		if (key) return game.i18n?.localize(key) ?? type;
		return type;
	}

	function dataPreview(data: string | undefined | null): string {
		const v = (data ?? '').toString().trim();
		if (!v) return '(empty)';
		return v.length > 36 ? v.slice(0, 36) + '…' : v;
	}

	function handleReorder(e: any) {
		const from = e.oldDraggableIndex;
		const to = e.newDraggableIndex;
		rerender++;
		if (from === undefined || to === undefined || from === to) return;
		onReorder(from, to);
	}

	function selectRow(e: MouseEvent, index: number) {
		const target = e.target as HTMLElement;
		if (target.closest('button')) return;
		if (target.closest('.grab')) return;
		selectedIndex = index;
	}

	function t(key: string, fallback: string) {
		return game.i18n?.localize(key) || fallback;
	}
</script>

<div class='component-list'>
	<SortableList class='sortable' animation={150} handle='.grab' onEnd={handleReorder}>
		{#key rerender}
			{#each components as comp, index (comp?.id ?? `idx-${index}`)}
				{#if comp}
					<div
						class='comp-row'
						class:selected={selectedIndex === index}
						onclick={(e) => selectRow(e, index)}
						role='button'
						tabindex='0'
						aria-label={`${typeLabel(comp.type)} component`}
					>
						<span class='grab' aria-hidden='true' title={t('obs-utils.applications.overlayEditor.dragReorder', 'Drag to reorder')}>
							<i class='fas fa-grip-vertical'></i>
						</span>
						<span class='type-tag'>{comp.type}</span>
						<span class='data-preview'>{dataPreview(comp.data)}</span>
						<button
							type='button'
							class='delete'
							onclick={(e) => { e.stopPropagation(); onRemove(index); }}
							title={t('obs-utils.applications.overlayEditor.removeComponentButton', 'Remove Component')}
							aria-label={t('obs-utils.applications.overlayEditor.removeComponentButton', 'Remove Component')}
						>
							<i class='fas fa-trash'></i>
						</button>
					</div>
				{/if}
			{/each}
		{/key}
	</SortableList>
	{#if components.length === 0}
		<div class='empty'>
			{t('obs-utils.applications.overlayEditor.emptyComponents', 'No components yet. Add one above.')}
		</div>
	{/if}
</div>

<style lang='stylus'>
	.component-list
		display flex
		flex-direction column
		gap 2px

	.empty
		padding 12px
		text-align center
		font-size 11px
		opacity 0.5

	.comp-row
		display grid
		grid-template-columns 18px 60px 1fr 24px
		align-items center
		gap 6px
		padding 4px 6px
		border 1px solid transparent
		border-radius 4px
		background rgba(0, 0, 0, 0.15)
		cursor pointer
		min-height 32px

		&:hover
			background rgba(255, 255, 255, 0.04)

		&.selected
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)

		.grab
			display flex
			align-items center
			justify-content center
			width 18px
			height 24px
			opacity 0.4
			cursor grab
			font-size 10px

			&:hover
				opacity 0.8

		&:hover .grab
			opacity 0.7

		.type-tag
			font-family monospace
			font-size 10px
			padding 2px 5px
			background rgba(255, 255, 255, 0.06)
			border-radius 2px
			opacity 0.85
			text-align center
			text-transform lowercase

		.data-preview
			font-size 11px
			opacity 0.7
			white-space nowrap
			overflow hidden
			text-overflow ellipsis

		.delete
			width 24px
			height 24px
			padding 0
			display flex
			align-items center
			justify-content center
			background transparent
			border 1px solid transparent
			opacity 0.4
			cursor pointer

			&:hover
				opacity 1
				background rgba(220, 60, 60, 0.15)
				border-color rgba(220, 60, 60, 0.4)
</style>
