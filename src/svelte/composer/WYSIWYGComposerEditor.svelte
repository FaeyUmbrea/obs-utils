<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';
	import AddComponentMenu from './AddComponentMenu.svelte';
	import ComponentConfigPane from './ComponentConfigPane.svelte';
	import ComponentList from './ComponentList.svelte';

	let {
		layer,
		layerIndex,
		view = 'layer',
		selectedComponentIndex = $bindable(),
		addComponentToLayer,
		reorderComponents,
		removeComponent,
		commit,
	} = $props<{
		layer: OverlayData;
		layerIndex: number;
		view?: 'layer' | 'component';
		selectedComponentIndex: number | null;
		addComponentToLayer: (layerIndex: number, type: string) => void;
		reorderComponents: (layerIndex: number, from: number, to: number) => void;
		removeComponent: (layerIndex: number, compIndex: number) => void;
		commit: () => void;
	}>();

	const componentTypes = $derived.by(() => {
		const entry = getApi().overlayTypes.get('wysiwyg');
		const names = entry?.overlayComponentNames;
		if (!names) return [] as Array<{ key: string; label: string }>;
		const out: Array<{ key: string; label: string }> = [];
		for (const [key, nameKey] of names) {
			if (key !== key.toLowerCase()) continue;
			out.push({ key, label: game.i18n.localize(nameKey) });
		}
		return out;
	});

	const selectedComp = $derived(
		selectedComponentIndex !== null ? layer.components[selectedComponentIndex] : null,
	);

	function addComponent(type: string) {
		addComponentToLayer(layerIndex, type);
	}

	function removeSelectedComponent() {
		if (selectedComponentIndex === null) return;
		const idx = selectedComponentIndex;
		layer.components = layer.components.filter((_: unknown, i: number) => i !== idx);
		selectedComponentIndex = null;
		commit?.();
	}
</script>

<div class='wysiwyg-pane'>
	{#if view === 'layer'}
		<section class='add-component'>
			<AddComponentMenu types={componentTypes} onPick={addComponent} />
		</section>

		<section class='components-section'>
			<h4>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.componentsHeader')}
				<span class='order-hint'>{game.i18n?.localize('obs-utils.applications.overlayEditor.drawOrderHint')}</span>
			</h4>
			<ComponentList
				components={layer.components ?? []}
				overlayType='wysiwyg'
				bind:selectedIndex={selectedComponentIndex}
				onReorder={(from, to) => reorderComponents(layerIndex, from, to)}
				onRemove={i => removeComponent(layerIndex, i)}
			/>
		</section>
	{:else if view === 'component'}
		{#if selectedComp && selectedComponentIndex !== null}
			<ComponentConfigPane
				component={selectedComp}
				componentIndex={selectedComponentIndex}
				{layer}
				{layerIndex}
				{commit}
				onRemove={removeSelectedComponent}
			/>
		{:else}
			<div class='no-selection'>
				<i class='fas fa-hand-pointer'></i>
				<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.selectComponentHint')}</p>
			</div>
		{/if}
	{/if}
</div>

<style lang='stylus'>
	.wysiwyg-pane
		display flex
		flex-direction column
		flex 1 1 auto
		min-height 0
		height 100%
		overflow-y auto
		gap 10px

	h4
		font-size 11px
		font-weight 600
		text-transform uppercase
		letter-spacing 0.5px
		opacity 0.65
		margin 0 0 6px 0
		padding 0
		border none
		display flex
		align-items center
		gap 6px

	section
		padding 0
		margin 0
		border none

	.components-section
		.order-hint
			font-weight 400
			font-size 10px
			text-transform none
			letter-spacing normal
			opacity 0.5
			margin-left auto

	.no-selection
		display flex
		flex-direction column
		align-items center
		justify-content center
		text-align center
		padding 20px
		opacity 0.5
		gap 8px
		font-size 12px

		i
			font-size 18px

		p
			margin 0
</style>
