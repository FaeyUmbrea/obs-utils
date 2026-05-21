<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import type { SvelteApplication } from '../../applications/mixin.svelte.ts';
	import { onDestroy, onMount } from 'svelte';
	import { activateCSSInjection, deactivateCSSInjection } from '../../utils/cssInjection.ts';
	import { getApi, preventUndefinedNullInArray } from '../../utils/helpers.ts';
	import { settings } from '../../utils/settings.ts';
	import { OverlayComponentData, OverlayData } from '../../utils/types.ts';
	import AnimationWorkspace from './AnimationWorkspace.svelte';
	import Canvas from './Canvas.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import PropertiesPanel from './PropertiesPanel.svelte';

	onMount(() => activateCSSInjection());
	onDestroy(() => deactivateCSSInjection());

	const overlays = settings.getStore('streamOverlays');
	const actorIDs = settings.getReadableStore('overlayActors');

	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();

	let selectedLayerIndex = $state<number | null>(null);
	let selectedComponentIndex = $state<number | null>(null);
	let previewActorID = $state<string | null>(null);

	type WorkspaceMode = 'overview' | 'layout' | 'animation' | 'preview';
	let mode = $state<WorkspaceMode>('overview');

	function enterOverlay(index: number) {
		selectedLayerIndex = index;
		selectedComponentIndex = null;
		mode = 'layout';
	}

	function goOverview() {
		mode = 'overview';
		selectedComponentIndex = null;
	}

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

<header class='breadcrumb'>
	<button
		type='button'
		class='crumb home'
		class:active={mode === 'overview'}
		onclick={goOverview}
	>
		<i class='fas fa-layer-group'></i>
		<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.overviewCrumb')}</span>
	</button>
	{#if mode !== 'overview' && currentOverlay}
		<span class='sep'>/</span>
		<span class='current-overlay'>{currentOverlay.name ?? game.i18n?.localize('obs-utils.applications.overlayEditor.unnamedOverlay')}</span>
		<span class='sep'>/</span>
		<nav class='mode-tabs' role='tablist'>
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
	{/if}
</header>

{#if mode === 'overview'}
	<div class='overview'>
		{#if isEmpty}
			<div class='empty-card'>
				<div class='empty-icon'>
					<i class='fas fa-layer-group'></i>
				</div>
				<h2>{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyTitle')}</h2>
				<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.emptyDescription')}</p>
				<div class='empty-actions'>
					<button type='button' onclick={() => { addLayer('wysiwyg'); enterOverlay(($overlays ?? []).length - 1); }}>
						<i class='fas fa-vector-square'></i>
						<span>{game.i18n?.localize('obs-utils.overlays.wysiwygOverlay.name')}</span>
					</button>
					<button type='button' onclick={() => { addLayer('sl'); enterOverlay(($overlays ?? []).length - 1); }}>
						<i class='fas fa-grip-lines'></i>
						<span>{game.i18n?.localize('obs-utils.overlays.simpleOverlay.name')}</span>
					</button>
				</div>
			</div>
		{:else}
			<div class='overview-list'>
				<header class='overview-list-head'>
					<h2>{game.i18n?.localize('obs-utils.applications.overlayEditor.overviewListTitle')}</h2>
					<div class='create-actions'>
						<button type='button' onclick={() => { addLayer('wysiwyg'); enterOverlay(($overlays ?? []).length - 1); }}>
							<i class='fas fa-plus'></i>
							<span>{game.i18n?.localize('obs-utils.overlays.wysiwygOverlay.name')}</span>
						</button>
						<button type='button' onclick={() => { addLayer('sl'); enterOverlay(($overlays ?? []).length - 1); }}>
							<i class='fas fa-plus'></i>
							<span>{game.i18n?.localize('obs-utils.overlays.simpleOverlay.name')}</span>
						</button>
					</div>
				</header>
				<ul class='overlay-rows'>
					{#each ($overlays ?? []) as overlay, index (overlay.id ?? index)}
						<li class='overlay-row' class:disabled={overlay.enabled === false}>
							<button
								type='button'
								class='overlay-pick'
								onclick={() => enterOverlay(index)}
							>
								<i class={overlay.type === 'wysiwyg' ? 'fas fa-vector-square type-icon' : 'fas fa-grip-lines type-icon'}></i>
								<span class='overlay-name'>{overlay.name ?? game.i18n?.localize('obs-utils.applications.overlayEditor.unnamedOverlay')}</span>
								<span class='overlay-type-tag'>{overlay.type === 'wysiwyg' ? 'WYSIWYG' : 'SL'}</span>
								{#if overlay.animation}<i class='fas fa-film anim-tag' title='Has animation'></i>{/if}
							</button>
							<button
								type='button'
								class='row-btn'
								title={game.i18n?.localize('obs-utils.applications.overlayEditor.toggleEnabled')}
								onclick={() => toggleLayerEnabled(index)}
							>
								<i class={overlay.enabled === false ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
							</button>
							<button
								type='button'
								class='row-btn danger'
								title={game.i18n?.localize('obs-utils.applications.overlayEditor.removeLayer')}
								onclick={() => removeLayer(index)}
							>
								<i class='fas fa-trash'></i>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{:else if mode === 'layout' && currentOverlay}
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
						{#each previewActors as actor (actor.id)}
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
	<div class='workspace-stub'>
		<i class='fas fa-eye'></i>
		<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewStub')}</p>
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

	// ── overview ────────────────────────────────────────────────────────────
	.overview
		display flex
		flex-direction column
		min-height 0
		height calc(100% - 36px - 44px)
		padding 12px
		overflow auto

	.overview-list
		display flex
		flex-direction column
		gap 10px

	.overview-list-head
		display flex
		align-items center
		justify-content space-between
		gap 8px

		h2
			margin 0
			font-size 16px
			font-weight 600

	.create-actions
		display inline-flex
		gap 6px

		button
			display inline-flex
			align-items center
			gap 6px
			height 28px
			padding 0 10px
			font-size 12px
			background rgba(255, 144, 0, 0.12)
			border 1px solid rgba(255, 144, 0, 0.4)
			border-radius 4px
			cursor pointer

			&:hover
				background rgba(255, 144, 0, 0.22)

	.overlay-rows
		list-style none
		padding 0
		margin 0
		display flex
		flex-direction column
		gap 4px

	.overlay-row
		display flex
		align-items center
		gap 4px
		background rgba(255, 255, 255, 0.04)
		border 1px solid rgba(255, 255, 255, 0.06)
		border-radius 4px
		padding 4px 6px

		&.disabled .overlay-name
			opacity 0.5
			text-decoration line-through

	.overlay-pick
		flex 1 1 auto
		display flex
		align-items center
		gap 8px
		background transparent
		border 0
		color inherit
		text-align left
		padding 4px 4px
		cursor pointer
		font-size 13px
		min-width 0

		&:hover
			background rgba(255, 255, 255, 0.06)
			border-radius 3px

		.type-icon
			opacity 0.65
			font-size 12px

		.overlay-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.overlay-type-tag
			font-size 10px
			padding 1px 5px
			background rgba(255, 255, 255, 0.08)
			border-radius 3px
			opacity 0.7

		.anim-tag
			font-size 11px
			opacity 0.6
			color #ffce80

	.row-btn
		width 28px
		height 24px
		display inline-flex
		align-items center
		justify-content center
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		cursor pointer
		opacity 0.75
		font-size 11px

		&:hover
			opacity 1

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

	// ── workspace stubs ─────────────────────────────────────────────────────
	.workspace-stub
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 12px
		height calc(100% - 36px - 44px)
		opacity 0.55
		font-size 13px

		i
			font-size 32px

	// ── existing 3-pane layout (Layout mode) ────────────────────────────────
	.composer
		container-type inline-size
		container-name composer
		display grid
		grid-template-columns minmax(160px, 220px) minmax(0, 1fr) minmax(260px, 340px)
		grid-template-rows 1fr
		gap 6px
		height calc(100% - 36px - 44px)
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
