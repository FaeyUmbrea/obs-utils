<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';
	import SimpleComposerEditor from './SimpleComposerEditor.svelte';
	import StyleTab from './StyleTab.svelte';
	import WYSIWYGComposerEditor from './WYSIWYGComposerEditor.svelte';

	let {
		overlays,
		selectedLayerIndex,
		selectedComponentIndex = $bindable(),
		addedComponentTick = 0,
		renameLayer,
		changeLayerType,
		addComponentToLayer,
		reorderComponents,
		removeComponent,
		commit,
	} = $props<{
		overlays: OverlayData[];
		selectedLayerIndex: number | null;
		selectedComponentIndex: number | null;
		addedComponentTick?: number;
		renameLayer: (index: number, name: string) => void;
		changeLayerType: (index: number, type: string) => void;
		addComponentToLayer: (layerIndex: number, type: string) => void;
		reorderComponents: (layerIndex: number, from: number, to: number) => void;
		removeComponent: (layerIndex: number, compIndex: number) => void;
		commit: () => void;
	}>();

	// Style tab can target either the layer or the selected component.
	// Default: component when one is selected, layer otherwise.
	let styleTargetKind = $state<'layer' | 'component'>('component');

	type TabKey = 'layer' | 'component' | 'style';
	let activeTab = $state<TabKey>('layer');

	const selectedLayer = $derived(
		selectedLayerIndex !== null ? overlays[selectedLayerIndex] : null,
	);
	const selectedComponent = $derived(
		selectedLayer && selectedComponentIndex !== null
			? selectedLayer.components?.[selectedComponentIndex] ?? null
			: null,
	);
	// The Style tab respects the user's explicit kind choice, falling back to
	// whichever target actually exists (component if selected, otherwise layer).
	const styleTarget = $derived(
		styleTargetKind === 'component'
			? (selectedComponent ?? selectedLayer)
			: selectedLayer,
	);

	// Auto-switch to Component tab only on the null → non-null transition
	// (don't read activeTab here, so the user can freely click back to Overlay)
	let prevSelectedComponentIndex: number | null = null;
	$effect(() => {
		const current = selectedComponentIndex;
		if (current !== null && prevSelectedComponentIndex === null) {
			activeTab = 'component';
			styleTargetKind = 'component';
		}
		if (current === null) styleTargetKind = 'layer';
		prevSelectedComponentIndex = current;
	});

	// When Composer signals a freshly-added component, force the Component tab
	// regardless of any prior selection state.
	let prevAddedTick: number | undefined;
	$effect(() => {
		const tick = addedComponentTick;
		if (prevAddedTick === undefined) {
			prevAddedTick = tick;
			return;
		}
		if (tick !== prevAddedTick) {
			prevAddedTick = tick;
			activeTab = 'component';
			styleTargetKind = 'component';
		}
	});

	const overlayTypeOptions = $derived.by(() => {
		const types = getApi().overlayTypes;
		if (!types) return [] as Array<{ key: string; label: string }>;
		return Array.from(types.keys())
			.filter(k => k === 'sl' || k === 'wysiwyg')
			.map((k) => {
				const nameKey = getApi().overlayTypeNames?.get(k);
				return { key: k, label: nameKey ? game.i18n.localize(nameKey) : k };
			});
	});

	function onRename(e: Event) {
		if (selectedLayerIndex === null) return;
		renameLayer(selectedLayerIndex, (e.currentTarget as HTMLInputElement).value);
	}
	async function onTypeChange(e: Event) {
		if (selectedLayerIndex === null) return;
		const newType = (e.currentTarget as HTMLSelectElement).value;
		const current = overlays[selectedLayerIndex]?.type;
		if (newType === current) return;
		// Changing type can drop positioning data (sl <-> wysiwyg) or render config (roll).
		// Only confirm when there are components to lose meaning from.
		const hasComponents = (overlays[selectedLayerIndex]?.components?.length ?? 0) > 0;
		if (hasComponents) {
			const proceed = await foundry.applications.api.DialogV2.confirm({
				content: game.i18n.localize('obs-utils.applications.overlayEditor.confirmTypeChange'),
			});
			if (!proceed) {
				// Revert the visual selection
				(e.currentTarget as HTMLSelectElement).value = current;
				return;
			}
		}
		changeLayerType(selectedLayerIndex, newType);
	}

	const componentCount = $derived(selectedLayer?.components?.length ?? 0);
	const styleHasCustomCSS = $derived(
		!!(styleTarget && (styleTarget as any).customCSS && (styleTarget as any).customCSS.trim().length),
	);

	let styleDrawerOpen = $state(false);
</script>

<div class='properties'>
	{#if !selectedLayer}
		<div class='empty'>
			<i class='fas fa-arrow-left'></i>
			<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.noLayerSelected')}</span>
		</div>
	{:else}
		<!-- Single combined inspector — components list at the top, the selected
		     component's editor below, and a collapsed CSS section at the bottom.
		     Overlay-level fields (name, type, tileBy, w/h, customCSS for the
		     overlay) live in the Settings tab. -->
		<section class='inspector-body'>
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
			{:else}
				<div class='empty'>
					<i class='fas fa-question-circle'></i>
					<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.unknownType')}</span>
				</div>
			{/if}

			{#if selectedComponentIndex !== null && (selectedLayer.components?.length ?? 0) > 0}
				<div class='component-section'>
					{#if (selectedLayer.components?.length ?? 0) > 1}
						<nav class='component-nav' aria-label='Cycle components'>
							<button
								type='button'
								class='nav-btn'
								disabled={selectedComponentIndex === 0}
								onclick={() => (selectedComponentIndex = Math.max(0, (selectedComponentIndex ?? 0) - 1))}
								title={game.i18n?.localize('obs-utils.applications.overlayEditor.previousComponent')}
								aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.previousComponent')}
							><i class='fas fa-chevron-left'></i></button>
							<span class='nav-label'>
								{game.i18n?.localize('obs-utils.applications.overlayEditor.componentNavLabel')
									?.replace('{current}', String((selectedComponentIndex ?? 0) + 1))
									?.replace('{total}', String(selectedLayer.components?.length ?? 0))}
							</span>
							<button
								type='button'
								class='nav-btn'
								disabled={selectedComponentIndex >= (selectedLayer.components?.length ?? 0) - 1}
								onclick={() => (selectedComponentIndex = Math.min((selectedLayer.components?.length ?? 0) - 1, (selectedComponentIndex ?? 0) + 1))}
								title={game.i18n?.localize('obs-utils.applications.overlayEditor.nextComponent')}
								aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.nextComponent')}
							><i class='fas fa-chevron-right'></i></button>
						</nav>
					{/if}
					{#if selectedLayer.type === 'wysiwyg'}
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
					{:else if selectedLayer.type === 'sl'}
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
					{/if}

					<button
						type='button'
						class='style-toggle'
						class:has-css={styleHasCustomCSS}
						class:active={styleDrawerOpen}
						onclick={() => (styleDrawerOpen = !styleDrawerOpen)}
					>
						<i class='fas fa-paint-brush'></i>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.tabStyle')}</span>
						{#if styleHasCustomCSS}<span class='dot' title='Custom CSS is set'></span>{/if}
					</button>
				</div>
			{/if}
		</section>

		{#if styleDrawerOpen}
			<div class='style-drawer-backdrop' onclick={() => (styleDrawerOpen = false)} role='presentation'></div>
			<div class='style-drawer' role='dialog' aria-modal='true'>
				<header class='style-drawer-head'>
					<h3>
						<i class='fas fa-paint-brush'></i>
						{game.i18n?.localize('obs-utils.applications.overlayEditor.tabStyle')}
					</h3>
					<button type='button' class='close-btn' onclick={() => (styleDrawerOpen = false)} title={game.i18n?.localize('obs-utils.strings.done')}>
						<i class='fas fa-times'></i>
					</button>
				</header>
				<div class='style-drawer-body'>
					<StyleTab
						target={styleTarget}
						hasComponent={selectedComponent !== null}
						bind:targetKind={styleTargetKind}
						{commit}
					/>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style lang='stylus'>
	.properties
		height 100%
		min-height 0
		display flex
		flex-direction column
		overflow hidden
		position relative

	.style-toggle
		display flex
		align-items center
		gap 6px
		padding 8px 10px
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 4px
		background rgba(255, 255, 255, 0.03)
		cursor pointer
		font-size 11px
		text-transform uppercase
		letter-spacing 0.4px
		opacity 0.85
		color inherit
		width 100%

		&:hover
			opacity 1
			background rgba(255, 255, 255, 0.06)

		i
			font-size 10px

		.dot
			display inline-block
			width 6px
			height 6px
			border-radius 50%
			background #ff9000
			margin-left auto

		&.active
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.5)
			color #ffce80
			opacity 1

	.style-drawer-backdrop
		position absolute
		inset 0
		background rgba(0, 0, 0, 0.35)
		z-index 5

	.style-drawer
		position absolute
		top 8px
		right 8px
		bottom 8px
		left 8px
		background #1c1c1c
		border 1px solid rgba(255, 255, 255, 0.15)
		border-radius 6px
		box-shadow 0 8px 24px rgba(0, 0, 0, 0.5)
		display flex
		flex-direction column
		z-index 6

	.style-drawer-head
		display flex
		align-items center
		justify-content space-between
		gap 8px
		padding 8px 10px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		h3
			margin 0
			font-size 13px
			font-weight 600
			display flex
			align-items center
			gap 8px

		.close-btn
			background transparent
			border none
			color inherit
			cursor pointer
			width 24px
			height 24px
			border-radius 3px
			opacity 0.7

			&:hover
				opacity 1
				background rgba(255, 255, 255, 0.08)

	.style-drawer-body
		flex 1 1 auto
		padding 10px
		overflow-y auto

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

	.inspector-body
		flex 1 1 auto
		min-height 0
		overflow-y auto
		display flex
		flex-direction column
		padding 6px 10px
		gap 10px

	.component-section
		display flex
		flex-direction column
		gap 8px
		padding-top 8px
		border-top 1px solid rgba(255, 255, 255, 0.08)

	.css-section
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		background rgba(255, 255, 255, 0.02)

		summary
			display flex
			align-items center
			gap 6px
			padding 6px 8px
			cursor pointer
			font-size 11px
			text-transform uppercase
			letter-spacing 0.4px
			opacity 0.75

			&:hover
				opacity 1

			i
				font-size 10px

			.dot
				display inline-block
				width 6px
				height 6px
				border-radius 50%
				background #ff9000
				margin-left auto

		&[open] summary
			border-bottom 1px solid rgba(255, 255, 255, 0.08)

	.component-nav
		display grid
		grid-template-columns 28px 1fr 28px
		gap 6px
		align-items center
		padding 4px 0 8px 0
		border-bottom 1px solid rgba(255, 255, 255, 0.06)
		margin-bottom 8px

		.nav-btn
			width 28px
			height 24px
			padding 0
			display flex
			align-items center
			justify-content center
			background transparent
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			opacity 0.75
			font-size 11px
			cursor pointer

			&:hover:not(:disabled)
				opacity 1
				background rgba(255, 255, 255, 0.06)

			&:disabled
				opacity 0.25
				cursor not-allowed

		.nav-label
			font-size 11px
			text-align center
			opacity 0.7
			letter-spacing 0.3px
</style>
