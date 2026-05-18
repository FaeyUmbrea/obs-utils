<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData } from '../../utils/types.ts';
	import { SortableList } from '@jhubbardsf/svelte-sortablejs';
	import { tick } from 'svelte';
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
	let listEl: HTMLDivElement | null = $state(null);

	// Scroll the selected row into view when selection changes from the outside (e.g. canvas click)
	$effect(() => {
		if (selectedIndex === null || !listEl) return;
		tick().then(() => {
			const row = listEl?.querySelector<HTMLElement>(`[data-comp-index="${selectedIndex}"]`);
			row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
	});

	function typeLabel(type: string): string {
		const entry = getApi().overlayTypes.get(overlayType);
		const key = entry?.overlayComponentNames?.get(type);
		if (key) return game.i18n.localize(key);
		return type;
	}

	function typeIcon(type: string): string {
		switch (type) {
			case 'pt': return 'fas fa-font';
			case 'fai': return 'fas fa-icons';
			case 'img': return 'fas fa-image';
			case 'bav': return 'fas fa-toggle-on';
			case 'bavimg': return 'fas fa-image';
			case 'micoav': return 'fas fa-grip';
			case 'mimgav': return 'fas fa-images';
			case 'pb': return 'fas fa-chart-line';
			default: return 'fas fa-cube';
		}
	}

	function dataPreview(data: string | undefined | null): string {
		const v = (data ?? '').toString().trim();
		if (!v) return '(empty)';
		return v.length > 36 ? `${v.slice(0, 36)}…` : v;
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

</script>

<div class='component-list' bind:this={listEl}>
	<SortableList class='sortable' animation={150} handle='.grab' onEnd={handleReorder}>
		{#key rerender}
			{#each components as comp, index (comp?.id ?? `idx-${index}`)}
				{#if comp}
					<div
						class='comp-row'
						class:selected={selectedIndex === index}
						data-comp-index={index}
						onclick={e => selectRow(e, index)}
						onkeydown={e => (e.key === 'Enter' || e.key === ' ') && selectRow(e as any, index)}
						role='button'
						tabindex='0'
						aria-label={`${typeLabel(comp.type)} component`}
					>
						<span class='grab' aria-hidden='true' title={game.i18n?.localize('obs-utils.applications.overlayEditor.dragReorder')}>
							<i class='fas fa-grip-vertical'></i>
						</span>
						<span class='type-icon' title={typeLabel(comp.type)} aria-label={typeLabel(comp.type)}>
							<i class={typeIcon(comp.type)}></i>
						</span>
						<span class='data-preview' title={dataPreview(comp.data)}>{dataPreview(comp.data)}</span>
						<button
							type='button'
							class='delete'
							onclick={(e) => {
								e.stopPropagation();
								onRemove(index);
							}}
							title={game.i18n?.localize('obs-utils.applications.overlayEditor.removeComponentButton')}
							aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.removeComponentButton')}
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
			{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyComponents')}
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
		grid-template-columns 18px 22px 1fr 24px
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

		.type-icon
			display flex
			align-items center
			justify-content center
			width 22px
			height 24px
			color rgba(255, 144, 0, 0.85)
			font-size 13px

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
