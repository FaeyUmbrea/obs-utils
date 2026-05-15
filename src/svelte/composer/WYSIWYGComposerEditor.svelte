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
		// Position below the trigger, anchor by viewport (escapes overflow:hidden ancestors)
		addMenuStyle = `position: fixed; top: ${Math.round(rect.bottom + 4)}px; left: ${Math.round(rect.left)}px; width: ${Math.round(rect.width)}px;`;
		addMenuOpen = true;
	}
	function closeAddMenu() {
		addMenuOpen = false;
	}
	function onWindowClick(e: MouseEvent) {
		if (!addMenuOpen) return;
		const t = e.target as HTMLElement | null;
		if (!t) return;
		if (addBtnEl && addBtnEl.contains(t)) return;
		if (t.closest('[data-add-component-menu]')) return;
		closeAddMenu();
	}

	const componentTypes = $derived.by(() => {
		const entry = getApi().overlayTypes.get('wysiwyg');
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
		const entry = getApi().overlayTypes.get('wysiwyg');
		return entry?.overlayComponentEditors?.get(type) ?? FallbackEditor;
	}

	function setConfig(key: string, value: any) {
		layer.config = { ...layer.config, [key]: value };
		commit?.();
	}

	function updateComponent(index: number, patch: Partial<OverlayData['components'][number]>) {
		const comp = layer.components[index];
		if (!comp) return;
		Object.assign(comp, patch);
		layer.components = [...layer.components];
		commit?.();
	}

	function addComponent(type: string) {
		addMenuOpen = false;
		addComponentToLayer(layerIndex, type);
	}

	function removeSelectedComponent() {
		if (selectedComponentIndex === null) return;
		const idx = selectedComponentIndex;
		layer.components = layer.components.filter((_: any, i: number) => i !== idx);
		selectedComponentIndex = null;
		commit?.();
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

<div class='wysiwyg-pane'>
	{#if view === 'layer'}
		<section>
			<h4>{t('obs-utils.applications.overlayEditor.overlaySize', 'Size')}</h4>
			<div class='row two-col'>
				<label class='field'>
					<span>W</span>
					<input
						type='number'
						min='1'
						value={layer.config?.w ?? 300}
						onchange={(e) => setConfig('w', parseInt((e.currentTarget as HTMLInputElement).value) || 300)}
					/>
				</label>
				<label class='field'>
					<span>H</span>
					<input
						type='number'
						min='1'
						value={layer.config?.h ?? 300}
						onchange={(e) => setConfig('h', parseInt((e.currentTarget as HTMLInputElement).value) || 300)}
					/>
				</label>
			</div>
			<p class='size-hint'>{t('obs-utils.applications.overlayEditor.sizeHint', 'For backgrounds, add an Image component sized to the overlay.')}</p>
		</section>

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
			<h4>
				{t('obs-utils.applications.overlayEditor.componentsHeader', 'Components')}
				<span class='order-hint'>{t('obs-utils.applications.overlayEditor.drawOrderHint', '(top of list = drawn first)')}</span>
			</h4>
			<ComponentList
				components={layer.components ?? []}
				overlayType='wysiwyg'
				bind:selectedIndex={selectedComponentIndex}
				onReorder={(from, to) => reorderComponents(layerIndex, from, to)}
				onRemove={(i) => removeComponent(layerIndex, i)}
			/>
		</section>
	{:else if view === 'component'}
		{#if selectedComp && selectedComponentIndex !== null}
			<section class='comp-config'>
				<header>
					<h4>
						<i class='fas fa-vector-square'></i>
						{t('obs-utils.applications.overlayEditor.componentHeader', 'Component')}
						<span class='comp-index'>#{selectedComponentIndex}</span>
					</h4>
					<button
						type='button'
						class='delete-comp'
						onclick={removeSelectedComponent}
						title={t('obs-utils.applications.overlayEditor.removeComponentButton', 'Remove Component')}
						aria-label={t('obs-utils.applications.overlayEditor.removeComponentButton', 'Remove Component')}
					>
						<i class='fas fa-trash'></i>
					</button>
				</header>

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

				<div class='row two-col'>
					<label class='field'>
						<span>X</span>
						<input
							type='number'
							value={selectedComp.x ?? 0}
							onchange={(e) => updateComponent(selectedComponentIndex!, { x: parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
						/>
					</label>
					<label class='field'>
						<span>Y</span>
						<input
							type='number'
							value={selectedComp.y ?? 0}
							onchange={(e) => updateComponent(selectedComponentIndex!, { y: parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
						/>
					</label>
				</div>
				<div class='row two-col'>
					<label class='field'>
						<span>W</span>
						<input
							type='number'
							min='1'
							value={selectedComp.w ?? 100}
							onchange={(e) => updateComponent(selectedComponentIndex!, { w: parseInt((e.currentTarget as HTMLInputElement).value) || 100 })}
						/>
					</label>
					<label class='field'>
						<span>H</span>
						<input
							type='number'
							min='1'
							value={selectedComp.h ?? 30}
							onchange={(e) => updateComponent(selectedComponentIndex!, { h: parseInt((e.currentTarget as HTMLInputElement).value) || 30 })}
						/>
					</label>
				</div>
				<div class='row two-col'>
					<label class='field'>
						<span>Rotation</span>
						<input
							type='number'
							value={selectedComp.rotation ?? 0}
							onchange={(e) => updateComponent(selectedComponentIndex!, { rotation: parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
						/>
					</label>
					<label class='field locked'>
						<input
							type='checkbox'
							checked={!!selectedComp.locked}
							onchange={(e) => updateComponent(selectedComponentIndex!, { locked: (e.currentTarget as HTMLInputElement).checked })}
						/>
						<span>Locked</span>
					</label>
				</div>

				<header>
					<h4>{t('obs-utils.applications.overlayEditor.componentData', 'Data')}</h4>
				</header>
				<div class='component-editor'>
					{#key `${selectedComp?.id ?? selectedComponentIndex}-${selectedComp?.type ?? ''}`}
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
				<p>{t('obs-utils.applications.overlayEditor.selectComponentHint', 'Click a component on the canvas or add one from the panel.')}</p>
			</div>
		{/if}
	{/if}
</div>

<svelte:window onclick={onWindowClick} />

{#if addMenuOpen}
	<div class='add-menu' role='menu' data-add-component-menu style={addMenuStyle}>
		{#each componentTypes as opt}
			<button type='button' role='menuitem' onclick={() => { closeAddMenu(); addComponent(opt.key); }}>
				<span class='menu-key'>{opt.key}</span>
				<span class='menu-name'>{opt.label}</span>
			</button>
		{/each}
	</div>
{/if}

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

		i
			font-size 10px
			opacity 0.7

	section
		padding 0
		margin 0
		border none

	.row
		display flex
		gap 6px
		margin-bottom 6px

		&.two-col
			display grid
			grid-template-columns 1fr 1fr

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

		&.locked
			flex-direction row
			align-items center
			gap 6px
			padding-top 16px

			input
				width auto

	.size-hint
		margin 6px 0 0 0
		font-size 11px
		opacity 0.55
		font-style italic
		line-height 1.4

	.components-section
		.order-hint
			font-weight 400
			font-size 10px
			text-transform none
			letter-spacing normal
			opacity 0.5
			margin-left auto

	.comp-config header
		display flex
		align-items center
		gap 6px

		h4
			margin 0

		.comp-index
			font-family monospace
			opacity 0.5

		.delete-comp
			margin-left auto
			width 26px
			height 24px
			padding 0
			display flex
			align-items center
			justify-content center
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			opacity 0.65

			&:hover
				opacity 1
				background rgba(220, 60, 60, 0.15)
				border-color rgba(220, 60, 60, 0.4)

	.component-editor
		padding 6px
		background rgba(255, 255, 255, 0.04)
		border-radius 4px
		min-height 40px

	.add-component
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

	:global(.add-menu[data-add-component-menu])
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
