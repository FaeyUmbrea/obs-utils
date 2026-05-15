<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';
	import PlayerRollOverlayEditor from '../components/editors/PlayerRollOverlayEditor.svelte';
	import SimpleComposerEditor from './SimpleComposerEditor.svelte';
	import StyleTab from './StyleTab.svelte';
	import WYSIWYGComposerEditor from './WYSIWYGComposerEditor.svelte';

	let {
		overlays,
		selectedLayerIndex,
		selectedComponentIndex = $bindable(),
		renameLayer,
		changeLayerType,
		setLayer,
		removeLayer,
		addComponentToLayer,
		reorderComponents,
		removeComponent,
		commit,
	} = $props<{
		overlays: OverlayData[];
		selectedLayerIndex: number | null;
		selectedComponentIndex: number | null;
		renameLayer: (index: number, name: string) => void;
		changeLayerType: (index: number, type: string) => void;
		setLayer: (index: number, value: OverlayData) => void;
		removeLayer: (index: number) => void;
		addComponentToLayer: (layerIndex: number, type: string) => void;
		reorderComponents: (layerIndex: number, from: number, to: number) => void;
		removeComponent: (layerIndex: number, compIndex: number) => void;
		commit: () => void;
	}>();

	type TabKey = 'layer' | 'component' | 'style';
	let activeTab = $state<TabKey>('layer');

	const selectedLayer = $derived(
		selectedLayerIndex !== null ? overlays[selectedLayerIndex] : null
	);
	const selectedComponent = $derived(
		selectedLayer && selectedComponentIndex !== null
			? selectedLayer.components?.[selectedComponentIndex] ?? null
			: null
	);
	const styleTarget = $derived(selectedComponent ?? selectedLayer);

	// Auto-switch to Component tab when a component is picked from the canvas
	$effect(() => {
		if (selectedComponentIndex !== null && activeTab === 'layer') {
			activeTab = 'component';
		}
	});

	const overlayTypeOptions = $derived.by(() => {
		const types = getApi().overlayTypes;
		if (!types) return [] as Array<{ key: string; label: string }>;
		return Array.from(types.keys())
			.filter(k => k === 'sl' || k === 'wysiwyg' || k === 'roll')
			.map((k) => {
				const nameKey = getApi().overlayTypeNames?.get(k);
				return { key: k, label: nameKey ? (game.i18n?.localize(nameKey) ?? k) : k };
			});
	});

	function onRename(e: Event) {
		if (selectedLayerIndex === null) return;
		renameLayer(selectedLayerIndex, (e.currentTarget as HTMLInputElement).value);
	}
	function onTypeChange(e: Event) {
		if (selectedLayerIndex === null) return;
		changeLayerType(selectedLayerIndex, (e.currentTarget as HTMLSelectElement).value);
	}
	function getLayer() {
		return selectedLayerIndex !== null ? overlays[selectedLayerIndex] : null as any;
	}
	function setSelectedLayer(value: OverlayData) {
		if (selectedLayerIndex === null) return;
		setLayer(selectedLayerIndex, value);
	}

	function t(key: string, fallback: string) {
		return game.i18n?.localize(key) || fallback;
	}
</script>

<div class='properties'>
	{#if !selectedLayer}
		<div class='empty'>
			<i class='fas fa-arrow-left'></i>
			<span>{t('obs-utils.applications.overlayEditor.noLayerSelected', 'Select a layer to edit its properties.')}</span>
		</div>
	{:else}
		<header class='layer-summary'>
			<input
				class='layer-name'
				type='text'
				value={selectedLayer.name ?? ''}
				placeholder={`#${selectedLayerIndex} ${selectedLayer.type}`}
				onchange={onRename}
				aria-label={t('obs-utils.applications.overlayEditor.layerName', 'Name')}
			/>
			<select class='layer-type' value={selectedLayer.type} onchange={onTypeChange} aria-label={t('obs-utils.applications.overlayEditor.layerType', 'Type')}>
				{#each overlayTypeOptions as opt}
					<option value={opt.key}>{opt.label}</option>
				{/each}
			</select>
		</header>

		<nav class='tabs' role='tablist'>
			<button
				type='button'
				role='tab'
				aria-selected={activeTab === 'layer'}
				class:active={activeTab === 'layer'}
				onclick={() => (activeTab = 'layer')}
			>
				<i class='fas fa-layer-group'></i>
				<span>{t('obs-utils.applications.overlayEditor.tabLayer', 'Layer')}</span>
			</button>
			<button
				type='button'
				role='tab'
				aria-selected={activeTab === 'component'}
				class:active={activeTab === 'component'}
				class:dim={selectedComponentIndex === null}
				onclick={() => (activeTab = 'component')}
			>
				<i class='fas fa-vector-square'></i>
				<span>{t('obs-utils.applications.overlayEditor.tabComponent', 'Component')}</span>
				{#if selectedComponentIndex !== null}
					<span class='badge'>#{selectedComponentIndex}</span>
				{/if}
			</button>
			<button
				type='button'
				role='tab'
				aria-selected={activeTab === 'style'}
				class:active={activeTab === 'style'}
				onclick={() => (activeTab = 'style')}
			>
				<i class='fas fa-paint-brush'></i>
				<span>{t('obs-utils.applications.overlayEditor.tabStyle', 'Style')}</span>
			</button>
		</nav>

		<section class='tab-body'>
			{#key `${selectedLayerIndex}-${selectedLayer.type}-${activeTab}-${activeTab === 'component' ? selectedComponentIndex : ''}`}
				{#if activeTab === 'layer'}
					{#if selectedLayer.type === 'wysiwyg'}
						<WYSIWYGComposerEditor
							layer={selectedLayer}
							layerIndex={selectedLayerIndex}
							view='layer'
							bind:selectedComponentIndex={selectedComponentIndex}
							{addComponentToLayer}
							{reorderComponents}
							{removeComponent}
							{commit}
						/>
					{:else if selectedLayer.type === 'sl'}
						<SimpleComposerEditor
							layer={selectedLayer}
							layerIndex={selectedLayerIndex}
							view='layer'
							bind:selectedComponentIndex={selectedComponentIndex}
							{addComponentToLayer}
							{reorderComponents}
							{removeComponent}
							{commit}
						/>
					{:else if selectedLayer.type === 'roll'}
						<div class='legacy-host'>
							<PlayerRollOverlayEditor
								bind:overlay={getLayer, setSelectedLayer}
								refreshFn={commit}
							/>
						</div>
					{:else}
						<div class='empty'>
							<i class='fas fa-question-circle'></i>
							<span>{t('obs-utils.applications.overlayEditor.unknownType', 'Unknown overlay type.')}</span>
						</div>
					{/if}
				{:else if activeTab === 'component'}
					{#if selectedLayer.type === 'wysiwyg' && selectedComponentIndex !== null}
						<WYSIWYGComposerEditor
							layer={selectedLayer}
							layerIndex={selectedLayerIndex}
							view='component'
							bind:selectedComponentIndex={selectedComponentIndex}
							{addComponentToLayer}
							{reorderComponents}
							{removeComponent}
							{commit}
						/>
					{:else if selectedLayer.type === 'sl' && selectedComponentIndex !== null}
						<SimpleComposerEditor
							layer={selectedLayer}
							layerIndex={selectedLayerIndex}
							view='component'
							bind:selectedComponentIndex={selectedComponentIndex}
							{addComponentToLayer}
							{reorderComponents}
							{removeComponent}
							{commit}
						/>
					{:else}
						<div class='empty'>
							<i class='fas fa-hand-pointer'></i>
							<span>{t('obs-utils.applications.overlayEditor.selectComponentHint', 'Click a component on the canvas or add one from the panel.')}</span>
						</div>
					{/if}
				{:else if activeTab === 'style'}
					<StyleTab target={styleTarget} {commit} />
				{/if}
			{/key}
		</section>
	{/if}
</div>

<style lang='stylus'>
	.properties
		height 100%
		min-height 0
		display flex
		flex-direction column
		overflow hidden

	.empty
		flex 1 1 auto
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 8px
		padding 24px
		text-align center
		opacity 0.5
		font-size 12px

	.layer-summary
		display flex
		gap 4px
		padding 6px 10px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)
		flex 0 0 auto

		.layer-name
			flex 1 1 auto
			min-width 0
			height 26px
			font-size 12px

		.layer-type
			flex 0 0 auto
			width 140px
			height 26px
			font-size 12px

	.tabs
		display flex
		gap 2px
		padding 4px 6px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)
		flex 0 0 auto

		button
			flex 1 1 auto
			height 28px
			display flex
			align-items center
			justify-content center
			gap 5px
			background transparent
			border 1px solid transparent
			border-radius 4px
			font-size 11px
			cursor pointer
			color inherit
			padding 0 8px
			opacity 0.7

			i
				font-size 10px
				opacity 0.7

			.badge
				font-family monospace
				font-size 9px
				opacity 0.5
				padding 0 4px
				border-radius 2px
				background rgba(255, 255, 255, 0.1)

			&:hover
				opacity 1
				background rgba(255, 255, 255, 0.04)

			&.active
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.5)
				font-weight 600

			&.dim:not(.active)
				opacity 0.4

	.tab-body
		flex 1 1 auto
		min-height 0
		overflow hidden
		display flex
		flex-direction column
		padding 6px 10px

	.legacy-host
		height 100%
		overflow auto
		position relative

		:global(.remove-tab), :global(.remove-only)
			display none

		:global(footer)
			position absolute
			left 0
			right 0
			bottom 0
</style>
