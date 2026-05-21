<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import type { SvelteApplication } from '../../applications/mixin.svelte.ts';
	import { onDestroy, onMount } from 'svelte';
	import { activateCSSInjection, deactivateCSSInjection } from '../../utils/cssInjection.ts';
	import { getApi, preventUndefinedNullInArray } from '../../utils/helpers.ts';
	import { settings } from '../../utils/settings.ts';
	import { OverlayComponentData, OverlayData } from '../../utils/types.ts';
	import { getOverlayTemplates } from '../../utils/overlayTemplates.ts';
	import AnimationWorkspace from './AnimationWorkspace.svelte';
	import Canvas from './Canvas.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import PreviewWorkspace from './PreviewWorkspace.svelte';
	import SettingsWorkspace from './SettingsWorkspace.svelte';
	import PropertiesPanel from './PropertiesPanel.svelte';

	onMount(() => activateCSSInjection());
	onDestroy(() => deactivateCSSInjection());

	const overlays = settings.getStore('streamOverlays');
	const actorIDs = settings.getReadableStore('overlayActors');

	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();

	let selectedLayerIndex = $state<number | null>(($overlays?.length ?? 0) > 0 ? 0 : null);
	let selectedComponentIndex = $state<number | null>(null);
	let previewActorID = $state<string | null>(null);

	type WorkspaceMode = 'settings' | 'layout' | 'animation' | 'preview';
	let mode = $state<WorkspaceMode>('layout');

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
		previewActorID ? [previewActorID] : ($actorIDs ?? []),
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

	function addFromTemplate(templateKey: string) {
		const tpl = getOverlayTemplates().find(t => t.key === templateKey);
		if (!tpl) return;
		const next = $overlays ?? [];
		next.push(tpl.create());
		$overlays = preventUndefinedNullInArray(next);
		selectedLayerIndex = next.length - 1;
		selectedComponentIndex = null;
		mode = 'layout';
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
		layer.enabled = layer.enabled === false;
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

	function reorderComponents(layerIndex: number, from: number, to: number) {
		const layer = ($overlays ?? [])[layerIndex];
		if (!layer?.components) return;
		const next = layer.components.slice();
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		layer.components = next;
		// Keep selection on the moved component
		if (selectedComponentIndex === from) {
			selectedComponentIndex = to;
		} else if (selectedComponentIndex !== null) {
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
		if (selectedComponentIndex === compIndex) {
			selectedComponentIndex = null;
		} else if (selectedComponentIndex !== null && selectedComponentIndex > compIndex) {
			selectedComponentIndex = selectedComponentIndex - 1;
		}
		commit();
	}

	// Bumped whenever a new component is added; PropertiesPanel watches this
	// to auto-switch to the Component tab.
	let addedComponentTick = $state(0);

	function defaultStyleFor(type: string): string {
		// Plain Text labels look best centered horizontally + vertically in their box.
		if (type === 'pt') return 'text-align: center; display: flex; align-items: center; justify-content: center;';
		return '';
	}

	function addComponentToLayer(layerIndex: number, type: string) {
		const layer = ($overlays ?? [])[layerIndex];
		if (!layer) return;
		const comp = new OverlayComponentData(type, '', defaultStyleFor(type));
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
		addedComponentTick++;
		commit();
	}

	async function close() {
		await foundryApp.close();
	}

	const previewActors = $derived(
		($actorIDs ?? []).map((id: string) => ({
			id,
			name: (game as ReadyGame).actors?.get(id)?.name ?? id,
		})),
	);

	const isEmpty = $derived(($overlays ?? []).length === 0);
	const currentOverlay = $derived(
		selectedLayerIndex !== null ? ($overlays ?? [])[selectedLayerIndex] : null,
	);

	async function openManageActors() {
		const { default: OverlayActorSelect } = await import('../../applications/overlayactorselect.ts');
		new OverlayActorSelect({}).render(true);
	}

	async function openGlobalCSS() {
		const { default: GlobalCSSEditor } = await import('../../applications/globalcsseditor.ts');
		new GlobalCSSEditor({}).render(true);
	}
</script>

{#if isEmpty}
	<div class='empty-overlay-state'>
		<div class='empty-inner'>
			<header class='templates-head'>
				<h2>{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyTitle')}</h2>
				<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyDescription')}</p>
			</header>
			<div class='template-grid'>
				{#each getOverlayTemplates() as tpl (tpl.key)}
					<button type='button' class='template-card' onclick={() => addFromTemplate(tpl.key)}>
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
{:else}
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
			templates={getOverlayTemplates()}
			{addFromTemplate}
		/>
	</aside>

	<section class='pane workspace-pane'>
		<header class='breadcrumb'>
			<span class='current-overlay'>{currentOverlay?.name ?? game.i18n?.localize('obs-utils.applications.overlayEditor.unnamedOverlay')}</span>
			<nav class='mode-tabs' role='tablist'>
				<button type='button' role='tab' class:active={mode === 'settings'} onclick={() => (mode = 'settings')}>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.modeSettings') ?? 'Settings'}
				</button>
				<button type='button' role='tab' class:active={mode === 'layout'} onclick={() => (mode = 'layout')}>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.modeLayout')}
				</button>
				<button type='button' role='tab' class:active={mode === 'animation'} onclick={() => (mode = 'animation')}>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.modeAnimation')}
				</button>
				<button type='button' role='tab' class:active={mode === 'preview'} onclick={() => (mode = 'preview')}>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.modePreview')}
				</button>
			</nav>
		</header>

		{#if mode === 'settings' && currentOverlay && selectedLayerIndex !== null}
			<SettingsWorkspace
				layer={currentOverlay}
				layerIndex={selectedLayerIndex}
				{renameLayer}
				{changeLayerType}
				{commit}
			/>
		{:else if mode === 'layout' && currentOverlay}
			<div class='layout-body'>
				<section class='canvas-pane'>
					<header class='canvas-header'>
						<label class='preview-actor'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewActorLabel')}</span>
							<select bind:value={previewActorID}>
								<option value={null}>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewActorAll')}</option>
								{#each previewActors as actor (actor.id)}
									<option value={actor.id}>{actor.name}</option>
								{/each}
							</select>
						</label>
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

				<aside class='properties-pane'>
					<PropertiesPanel
						overlays={$overlays ?? []}
						selectedLayerIndex={selectedLayerIndex}
						bind:selectedComponentIndex={selectedComponentIndex}
						{addedComponentTick}
						{renameLayer}
						{changeLayerType}
						{addComponentToLayer}
						{reorderComponents}
						{removeComponent}
						{commit}
					/>
				</aside>
			</div>
		{:else if mode === 'animation' && currentOverlay}
			<AnimationWorkspace layer={currentOverlay} {commit} />
		{:else if mode === 'preview' && currentOverlay}
			<PreviewWorkspace />
		{/if}
	</section>
</div>
{/if}

<footer class='composer-footer'>
	<button type='button' class='footer-btn secondary' onclick={openManageActors}>
		<i class='fas fa-users'></i>
		<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.manageActors')}</span>
	</button>
	<button type='button' class='footer-btn secondary' onclick={openGlobalCSS}>
		<i class='fab fa-css3-alt'></i>
		<span>{game.i18n?.localize('obs-utils.applications.globalCSSEditor.menuLabel')}</span>
	</button>
	<span class='spacer'></span>
	<button type='button' class='footer-btn primary done' onclick={close}>
		{game.i18n?.localize('obs-utils.applications.overlayEditor.closeButton')}
	</button>
</footer>

<style lang='stylus'>
	// ── breadcrumb ──────────────────────────────────────────────────────────
	.breadcrumb
		display flex
		align-items center
		gap 6px
		padding 0 10px
		height 36px
		flex 0 0 auto
		background rgba(0, 0, 0, 0.18)
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

	.crumb
		display inline-flex
		align-items center
		gap 6px
		height 26px
		padding 0 10px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 4px
		font-size 12px
		cursor pointer
		opacity 0.75

		&:hover, &.active
			opacity 1
			background rgba(255, 144, 0, 0.12)
			border-color rgba(255, 144, 0, 0.4)

	.sep
		opacity 0.4
		font-size 12px

	.current-overlay
		font-weight 600
		font-size 12px

	.mode-tabs
		display inline-flex
		gap 2px
		margin-left auto

		button
			height 26px
			padding 0 12px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 4px
			font-size 12px
			cursor pointer
			opacity 0.7

			&:hover
				opacity 1

			&.active
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.5)
				color #ffce80

	// ── empty state (no overlays yet) ───────────────────────────────────────
	// Centered splash. The outer fills the editor pane and centers the
	// inner panel; the inner panel limits width so cards don't stretch
	// the full editor width on wide monitors.
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

	// ── layout: persistent layers pane + mode-switched workspace ────────────
	.composer
		container-type inline-size
		container-name composer
		display grid
		grid-template-columns minmax(160px, 220px) minmax(0, 1fr)
		grid-template-rows 1fr
		gap 6px
		height calc(100% - 44px)
		min-height 0
		padding 6px

	.workspace-pane
		display flex
		flex-direction column
		min-height 0
		min-width 0
		background rgba(0, 0, 0, 0.15)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	.workspace-pane .breadcrumb
		background transparent
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

	.layout-body
		flex 1 1 auto
		min-height 0
		display grid
		grid-template-columns minmax(0, 1fr) minmax(260px, 340px)
		gap 6px
		padding 6px

	.canvas-pane
		min-height 0
		min-width 0
		display flex
		flex-direction column
		background #1a1a1a
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	.properties-pane
		min-height 0
		min-width 0
		display flex
		flex-direction column
		background rgba(0, 0, 0, 0.15)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	// Below ~900px, collapse the layers pane into a narrow icon-only strip.
	@container composer (max-width: 900px)
		.composer
			grid-template-columns 60px minmax(0, 1fr)
		:global(.layers-pane .layers-header .title)
			display none
		:global(.layers-pane .layer .layer-body .type)
			display none

	// Below ~700px, drop the properties column inside the layout body.
	@container composer (max-width: 700px)
		.layout-body
			grid-template-columns 1fr
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

	.canvas-host
		flex 1 1 auto
		min-height 0
		position relative
		overflow hidden

	.empty-card
		max-width 480px
		text-align center
		padding 32px
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 8px

		.empty-icon
			font-size 36px
			opacity 0.4
			margin-bottom 16px

		h2
			margin 0 0 8px 0
			font-size 18px
			font-weight 600

		p
			margin 0 0 20px 0
			font-size 13px
			line-height 1.5
			opacity 0.7

		.empty-actions
			display grid
			grid-template-columns repeat(2, minmax(0, 1fr))
			gap 10px

			button
				display flex
				flex-direction column
				align-items center
				gap 8px
				padding 14px 8px
				height auto
				background rgba(255, 144, 0, 0.1)
				border 1px solid rgba(255, 144, 0, 0.4)
				border-radius 6px
				cursor pointer
				font-size 12px

				i
					font-size 18px
					opacity 0.8

				&:hover
					background rgba(255, 144, 0, 0.2)
					border-color rgba(255, 144, 0, 0.7)

	.composer-footer
		position absolute
		left 0
		right 0
		bottom 0
		height 44px
		display flex
		align-items center
		gap 8px
		padding 0 8px
		border-top 1px solid rgba(255, 255, 255, 0.08)

		.footer-btn
			height 30px
			padding 0 12px
			display inline-flex
			align-items center
			gap 6px
			font-size 12px
			border-radius 4px

			i
				font-size 11px
				opacity 0.8

			&.secondary
				background transparent
				border 1px solid rgba(255, 255, 255, 0.12)
				opacity 0.85

				&:hover
					opacity 1
					background rgba(255, 255, 255, 0.06)

			&.primary
				padding 0 18px

		.spacer
			flex 1 1 auto
</style>
