<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';
	import FallbackEditor from '../components/editors/FallbackEditor.svelte';
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

	let addMenuOpen = $state(false);
	let addBtnEl: HTMLButtonElement | null = $state(null);
	let addMenuStyle = $state('');

	function openAddMenu() {
		if (!addBtnEl) { addMenuOpen = true; return; }
		const rect = addBtnEl.getBoundingClientRect();
		addMenuStyle = `position: fixed; top: ${Math.round(rect.bottom + 4)}px; left: ${Math.round(rect.left)}px; width: ${Math.round(rect.width)}px;`;
		addMenuOpen = true;
	}
	function closeAddMenu() { addMenuOpen = false; }
	function onWindowClick(e: MouseEvent) {
		if (!addMenuOpen) return;
		const t = e.target as HTMLElement | null;
		if (!t) return;
		if (addBtnEl && addBtnEl.contains(t)) return;
		if (t.closest('[data-add-component-menu]')) return;
		closeAddMenu();
	}

	const componentTypes = $derived.by(() => {
		const entry = getApi().overlayTypes.get('sl');
		const names = entry?.overlayComponentNames;
		if (!names) return [] as Array<{ key: string; label: string }>;
		const out: Array<{ key: string; label: string }> = [];
		for (const [key, nameKey] of names) {
			if (key !== key.toLowerCase()) continue;
			out.push({ key, label: game.i18n?.localize(nameKey) ?? key });
		}
		return out;
	});

	function getComponentEditor(type: string) {
		const entry = getApi().overlayTypes.get('sl');
		return entry?.overlayComponentEditors?.get(type) ?? FallbackEditor;
	}

	function updateComponent(index: number, patch: Partial<OverlayData['components'][number]>) {
		const comp = layer.components[index];
		if (!comp) return;
		Object.assign(comp, patch);
		layer.components = [...layer.components];
		commit?.();
	}

	function addComponent(type: string) {
		closeAddMenu();
		addComponentToLayer(layerIndex, type);
	}

	const selectedComp = $derived(
		selectedComponentIndex !== null ? layer.components[selectedComponentIndex] : null
	);
	const selectedComponentEditor = $derived(
		selectedComp ? getComponentEditor(selectedComp.type) : null
	);

	function t(key: string, fallback: string) {
		return game.i18n?.localize(key) || fallback;
	}
</script>

<div class='simple-pane'>
	{#if view === 'layer'}
		<p class='intro-hint'>
			{t('obs-utils.applications.overlayEditor.simpleIntro', 'Simple overlays render components inline. Reorder to change layout order.')}
		</p>

		<section class='add-component'>
			<button
				type='button'
				class='add-toggle'
				bind:this={addBtnEl}
				onclick={() => (addMenuOpen ? closeAddMenu() : openAddMenu())}
				aria-expanded={addMenuOpen}
			>
				<i class='fas fa-plus'></i>
				<span>{t('obs-utils.applications.overlayEditor.addComponent', 'Add Component')}</span>
				<i class='fas fa-caret-down'></i>
			</button>
		</section>

		<section class='components-section'>
			<h4>{t('obs-utils.applications.overlayEditor.componentsHeader', 'Components')}</h4>
			<ComponentList
				components={layer.components ?? []}
				overlayType='sl'
				bind:selectedIndex={selectedComponentIndex}
				onReorder={(from, to) => reorderComponents(layerIndex, from, to)}
				onRemove={(i) => removeComponent(layerIndex, i)}
			/>
		</section>
	{:else if view === 'component'}
		{#if selectedComp && selectedComponentIndex !== null}
			<section class='comp-config'>
				<h4>
					<i class='fas fa-vector-square'></i>
					{t('obs-utils.applications.overlayEditor.componentHeader', 'Component')}
					<span class='comp-index'>#{selectedComponentIndex}</span>
				</h4>

				<div class='row'>
					<label class='field'>
						<span>{t('obs-utils.applications.overlayEditor.componentType', 'Component type')}</span>
						<select
							value={selectedComp.type}
							onchange={(e) => updateComponent(selectedComponentIndex!, { type: (e.currentTarget as HTMLSelectElement).value })}
						>
							{#each componentTypes as opt}
								<option value={opt.key}>{opt.label}</option>
							{/each}
						</select>
					</label>
				</div>

				<header><h4>{t('obs-utils.applications.overlayEditor.componentData', 'Data')}</h4></header>
				<div class='component-editor'>
					{#key `${selectedComp.id ?? selectedComponentIndex}-${selectedComp.type}`}
						{#if selectedComponentEditor}
							{@const Editor = selectedComponentEditor}
							<Editor
								bind:data={() => layer.components[selectedComponentIndex!]?.data ?? '', v => updateComponent(selectedComponentIndex!, { data: v })}
							/>
						{/if}
					{/key}
				</div>
			</section>
		{:else}
			<div class='no-selection'>
				<i class='fas fa-hand-pointer'></i>
				<p>{t('obs-utils.applications.overlayEditor.selectComponentHintSimple', 'Pick a component from the list in the Overlay tab.')}</p>
			</div>
		{/if}
	{/if}
</div>

<svelte:window onclick={onWindowClick} />

{#if addMenuOpen}
	<div class='add-menu-simple' role='menu' data-add-component-menu style={addMenuStyle}>
		{#each componentTypes as opt}
			<button type='button' role='menuitem' onclick={() => addComponent(opt.key)}>
				<span class='menu-key'>{opt.key}</span>
				<span class='menu-name'>{opt.label}</span>
			</button>
		{/each}
	</div>
{/if}

<style lang='stylus'>
	.simple-pane
		display flex
		flex-direction column
		flex 1 1 auto
		min-height 0
		height 100%
		overflow-y auto
		gap 10px

	.intro-hint
		margin 0
		font-size 11px
		opacity 0.55
		font-style italic
		line-height 1.4

	h4
		font-size 11px
		font-weight 600
		text-transform uppercase
		letter-spacing 0.5px
		opacity 0.65
		margin 0 0 6px 0
		display flex
		align-items center
		gap 6px

	section
		padding 0
		margin 0

	.row
		display flex
		gap 6px
		margin-bottom 6px

	.field
		display flex
		flex-direction column
		gap 2px
		flex 1 1 auto
		min-width 0

		span
			font-size 10px
			opacity 0.7

		input, select
			width 100%
			height 24px
			padding 0 6px
			font-size 12px

	.comp-config
		.comp-index
			font-family monospace
			opacity 0.5

	.component-editor
		padding 6px
		background rgba(255, 255, 255, 0.04)
		border-radius 4px
		min-height 40px

	.add-toggle
		width 100%
		height 30px
		display flex
		align-items center
		justify-content center
		gap 8px
		background rgba(255, 144, 0, 0.12)
		border 1px solid rgba(255, 144, 0, 0.4)
		border-radius 4px
		font-size 12px
		cursor pointer

		&:hover
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.7)

		i.fa-caret-down
			margin-left auto

	:global(.add-menu-simple[data-add-component-menu])
		background #2a2a2a
		border 1px solid rgba(255, 255, 255, 0.2)
		border-radius 4px
		z-index 10000
		display flex
		flex-direction column
		padding 4px
		gap 2px
		max-height 320px
		overflow-y auto
		box-shadow 0 6px 24px rgba(0, 0, 0, 0.5)

		button
			display flex
			align-items center
			gap 8px
			text-align left
			background transparent
			border none
			padding 6px 10px
			font-size 12px
			cursor pointer
			color inherit

			&:hover
				background rgba(255, 255, 255, 0.08)

			.menu-key
				font-family monospace
				font-size 10px
				opacity 0.5
				min-width 36px

			.menu-name
				flex 1 1 auto

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
