<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import type { SvelteApplication } from '../../applications/mixin.svelte.ts';
	import { preventUndefinedNullInArray } from '../../utils/helpers.ts';
	import { settings } from '../../utils/settings.ts';
	import { OverlayComponentData, OverlayData } from '../../utils/types.ts';
	import Canvas from './Canvas.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import PropertiesPanel from './PropertiesPanel.svelte';

	const overlays = settings.getStore('streamOverlays');
	const actorIDs = settings.getReadableStore('overlayActors');

	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();

	let selectedLayerIndex = $state<number | null>(($overlays?.length ?? 0) > 0 ? 0 : null);
	let selectedComponentIndex = $state<number | null>(null);
	let previewActorID = $state<string | null>(null);

	$effect(() => {
		const list = $overlays ?? [];
		if (selectedLayerIndex !== null && selectedLayerIndex >= list.length) {
			selectedLayerIndex = list.length > 0 ? list.length - 1 : null;
			selectedComponentIndex = null;
		}
	});

	$effect(() => {
		if (previewActorID && !($actorIDs ?? []).includes(previewActorID)) {
			previewActorID = null;
		}
	});

	const previewIDs = $derived(
		previewActorID ? [previewActorID] : ($actorIDs ?? [])
	);

	function commit() {
		$overlays = preventUndefinedNullInArray($overlays);
	}

	function addLayer(type: string = 'wysiwyg') {
		const next = $overlays ?? [];
		const overlay = new OverlayData(type);
		if (type === 'wysiwyg') {
			overlay.config = { w: 300, h: 300 };
		}
		next.push(overlay);
		$overlays = preventUndefinedNullInArray(next);
		selectedLayerIndex = next.length - 1;
		selectedComponentIndex = null;
	}

	function removeLayer(index: number) {
		const next = ($overlays ?? []).slice();
		next.splice(index, 1);
		$overlays = preventUndefinedNullInArray(next);
		if (selectedLayerIndex === index) {
			selectedLayerIndex = next.length > 0 ? Math.max(0, index - 1) : null;
			selectedComponentIndex = null;
		} else if (selectedLayerIndex !== null && selectedLayerIndex > index) {
			selectedLayerIndex = selectedLayerIndex - 1;
		}
	}

	function reorderLayers(from: number, to: number) {
		const next = ($overlays ?? []).slice();
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		$overlays = preventUndefinedNullInArray(next);
		if (selectedLayerIndex === from) {
			selectedLayerIndex = to;
		} else if (selectedLayerIndex !== null) {
			const i = selectedLayerIndex;
			if (from < i && to >= i) selectedLayerIndex = i - 1;
			else if (from > i && to <= i) selectedLayerIndex = i + 1;
		}
	}

	function toggleLayerEnabled(index: number) {
		const layer = ($overlays ?? [])[index];
		if (!layer) return;
		layer.enabled = layer.enabled === false ? true : false;
		commit();
	}

	function renameLayer(index: number, name: string) {
		const layer = ($overlays ?? [])[index];
		if (!layer) return;
		layer.name = name;
		commit();
	}

	function changeLayerType(index: number, type: string) {
		const layer = ($overlays ?? [])[index];
		if (!layer) return;
		layer.type = type;
		if (type === 'wysiwyg' && (!layer.config?.w || !layer.config?.h)) {
			layer.config = { ...(layer.config ?? {}), w: 300, h: 300 };
		}
		selectedComponentIndex = null;
		commit();
	}

	function setLayer(index: number, value: OverlayData) {
		const list = $overlays ?? [];
		if (index < 0 || index >= list.length) return;
		list[index] = value;
		$overlays = preventUndefinedNullInArray(list);
	}

	function reorderComponents(layerIndex: number, from: number, to: number) {
		const layer = ($overlays ?? [])[layerIndex];
		if (!layer?.components) return;
		const next = layer.components.slice();
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		layer.components = next;
		// Keep selection on the moved component
		if (selectedComponentIndex === from) selectedComponentIndex = to;
		else if (selectedComponentIndex !== null) {
			const i = selectedComponentIndex;
			if (from < i && to >= i) selectedComponentIndex = i - 1;
			else if (from > i && to <= i) selectedComponentIndex = i + 1;
		}
		commit();
	}

	function removeComponent(layerIndex: number, compIndex: number) {
		const layer = ($overlays ?? [])[layerIndex];
		if (!layer?.components) return;
		layer.components = layer.components.filter((_: any, i: number) => i !== compIndex);
		if (selectedComponentIndex === compIndex) selectedComponentIndex = null;
		else if (selectedComponentIndex !== null && selectedComponentIndex > compIndex) {
			selectedComponentIndex = selectedComponentIndex - 1;
		}
		commit();
	}

	function addComponentToLayer(layerIndex: number, type: string) {
		const layer = ($overlays ?? [])[layerIndex];
		if (!layer) return;
		const comp = new OverlayComponentData(type, '', '');
		const refW = layer.config?.w ?? 300;
		const refH = layer.config?.h ?? 300;
		// New components default to ~half the canvas, centered
		comp.w = Math.min(200, Math.max(60, Math.round(refW * 0.6)));
		comp.h = Math.min(40, Math.max(20, Math.round(refH * 0.25)));
		comp.x = Math.round(refW / 2 - comp.w / 2);
		comp.y = Math.round(refH / 2 - comp.h / 2);
		layer.components = [...(layer.components ?? []), comp];
		selectedLayerIndex = layerIndex;
		selectedComponentIndex = layer.components.length - 1;
		commit();
	}

	const selectedLayer = $derived(
		selectedLayerIndex !== null ? (($overlays ?? [])[selectedLayerIndex] ?? null) : null
	);

	async function close() {
		await foundryApp.close();
	}

	const previewActors = $derived(
		($actorIDs ?? []).map((id: string) => ({
			id,
			name: (game as ReadyGame).actors?.get(id)?.name ?? id,
		}))
	);
</script>

<div class='composer'>
	<aside class='pane layers-pane'>
		<LayersPanel
			overlays={$overlays ?? []}
			bind:selectedLayerIndex={selectedLayerIndex}
			bind:selectedComponentIndex={selectedComponentIndex}
			{addLayer}
			{removeLayer}
			{reorderLayers}
			{toggleLayerEnabled}
		/>
	</aside>

	<section class='pane canvas-pane'>
		<header class='canvas-header'>
			<label class='preview-actor'>
				<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewActorLabel')}</span>
				<select bind:value={previewActorID}>
					<option value={null}>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewActorAll')}</option>
					{#each previewActors as actor}
						<option value={actor.id}>{actor.name}</option>
					{/each}
				</select>
			</label>
			<button
				type='button'
				class='full-preview'
				title={game.i18n?.localize('obs-utils.applications.overlayEditor.showFullPreview')}
				onclick={async () => {
					const { openOverlayPreview } = await import('../../utils/ui.ts');
					await openOverlayPreview();
				}}
			>
				<i class='fas fa-expand'></i>
				<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.showFullPreview')}</span>
			</button>
		</header>
		<div class='canvas-host'>
			<Canvas
				overlays={$overlays ?? []}
				actorIDs={previewIDs}
				bind:selectedLayerIndex={selectedLayerIndex}
				bind:selectedComponentIndex={selectedComponentIndex}
				{commit}
			/>
		</div>
	</section>

	<aside class='pane properties-pane'>
		<PropertiesPanel
			overlays={$overlays ?? []}
			selectedLayerIndex={selectedLayerIndex}
			bind:selectedComponentIndex={selectedComponentIndex}
			{renameLayer}
			{changeLayerType}
			{setLayer}
			{removeLayer}
			{addComponentToLayer}
			{reorderComponents}
			{removeComponent}
			{commit}
		/>
	</aside>
</div>

<footer class='composer-footer'>
	<button type='button' class='done' onclick={close}>
		{game.i18n?.localize('obs-utils.applications.overlayEditor.closeButton')}
	</button>
</footer>

<style lang='stylus'>
	.composer
		container-type inline-size
		container-name composer
		display grid
		grid-template-columns minmax(160px, 220px) minmax(0, 1fr) minmax(260px, 340px)
		grid-template-rows 1fr
		gap 6px
		height calc(100% - 44px)
		min-height 0
		padding 6px

	// Below ~900px Foundry windows, collapse the layers pane into a narrow icon-only strip
	@container composer (max-width: 900px)
		.composer
			grid-template-columns 60px minmax(0, 1fr) minmax(220px, 280px)
		:global(.layers-pane .layers-header .title)
			display none
		:global(.layers-pane .layer .layer-body .type)
			display none

	// Below ~700px, hide the properties pane entirely and use full width for canvas
	@container composer (max-width: 700px)
		.composer
			grid-template-columns 60px 1fr
		.properties-pane
			display none

	.pane
		min-height 0
		min-width 0
		display flex
		flex-direction column
		background rgba(0, 0, 0, 0.15)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	.layers-pane
		// list scrolls internally

	.canvas-pane
		background #1a1a1a

	.canvas-header
		display flex
		align-items center
		justify-content space-between
		gap 8px
		padding 6px 8px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)
		flex 0 0 auto

	.preview-actor
		display flex
		align-items center
		gap 6px
		min-width 0
		flex 1 1 auto

		span
			font-size 11px
			opacity 0.8
			white-space nowrap

		select
			min-width 0
			flex 1 1 auto

	.full-preview
		display flex
		align-items center
		gap 4px
		flex 0 0 auto
		height 28px
		padding 0 10px

	.canvas-host
		flex 1 1 auto
		min-height 0
		position relative
		overflow hidden

	.properties-pane
		// editor panel scrolls internally

	.composer-footer
		position absolute
		left 0
		right 0
		bottom 0
		height 44px
		display flex
		align-items center
		justify-content flex-end
		gap 8px
		padding 0 8px
		border-top 1px solid rgba(255, 255, 255, 0.08)

		.done
			height 30px
			padding 0 16px
</style>
