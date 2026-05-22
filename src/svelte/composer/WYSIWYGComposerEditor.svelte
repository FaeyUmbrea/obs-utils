<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { getContext, setContext } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { ensureComponentId } from '../../utils/types.ts';
	import type { AnimatablePropertyKey } from '../../utils/overlayAnimation.ts';
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

	// Animation workspace context — present when this editor is rendered under
	// the Animation tab, absent (undefined) otherwise.
	const animWorkspace = getContext<{
		playheadT: number;
		togglePropertyKeyframe: (componentId: string, prop: AnimatablePropertyKey, currentValue: number) => void;
		chevronStateFor: (componentId: string, prop: AnimatablePropertyKey) => 'none' | 'between' | 'on';
	} | undefined>('obs-utils.animWorkspace');

	function chevronState(prop: AnimatablePropertyKey): 'none' | 'between' | 'on' {
		if (!animWorkspace || !selectedComp) return 'none';
		const id = ensureComponentId(selectedComp);
		return animWorkspace.chevronStateFor(id, prop);
	}

	function onChevronClick(prop: AnimatablePropertyKey, currentValue: number) {
		if (!animWorkspace || !selectedComp) return;
		const id = ensureComponentId(selectedComp);
		animWorkspace.togglePropertyKeyframe(id, prop, currentValue);
	}

	let addMenuOpen = $state(false);
	let addBtnEl: HTMLButtonElement | null = $state(null);
	let addMenuStyle = $state('');

	// Surface the overlay's active trigger keys to descendant data-field editors
	// so they can warn when the user picks a `trigger.<key>.*` path for a
	// trigger the overlay doesn't actually register.
	const activeTriggerKeys = $state(new Set<string>());
	setContext('obs-utils.activeTriggerKeys', activeTriggerKeys);
	$effect(() => {
		activeTriggerKeys.clear();
		for (const tr of layer.animation?.transitions ?? []) {
			activeTriggerKeys.add(tr.triggerKey);
		}
	});

	// Portal action: relocate the node to document.body so position:fixed isn't
	// affected by transformed ancestors (Foundry ApplicationV2 uses transforms).
	function portalToBody(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			},
		};
	}

	function openAddMenu() {
		if (!addBtnEl) {
			addMenuOpen = true;
			return;
		}
		const rect = addBtnEl.getBoundingClientRect();
		// Viewport-relative — valid once portalled out of any transformed ancestor.
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
	function onAddBtnClick(e: MouseEvent) {
		e.stopPropagation();
		if (addMenuOpen) closeAddMenu();
		else openAddMenu();
	}

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
		selectedComponentIndex !== null ? layer.components[selectedComponentIndex] : null,
	);
	const selectedComponentEditor = $derived(
		selectedComp ? getComponentEditor(selectedComp.type) : null,
	);

</script>

<div class='wysiwyg-pane'>
	{#if view === 'layer'}
		<!-- Overlay-level fields (width/height/tileBy/customCSS) live in the
		     Settings tab now. The Layout view is for managing components only. -->
		<section class='add-component'>
			<button
				type='button'
				class='add-toggle'
				bind:this={addBtnEl}
				onclick={onAddBtnClick}
				aria-expanded={addMenuOpen}
			>
				<i class='fas fa-plus'></i>
				<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.addComponent')}</span>
				<i class='fas fa-caret-down'></i>
			</button>
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
			<section class='comp-config'>
				<header>
					<h4>
						<i class='fas fa-vector-square'></i>
						{game.i18n?.localize('obs-utils.applications.overlayEditor.componentHeader')}
						<span class='comp-index'>#{selectedComponentIndex}</span>
					</h4>
					<button
						type='button'
						class='delete-comp'
						onclick={removeSelectedComponent}
						title={game.i18n?.localize('obs-utils.applications.overlayEditor.removeComponentButton')}
						aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.removeComponentButton')}
					>
						<i class='fas fa-trash'></i>
					</button>
				</header>

				<div class='row'>
					<label class='field'>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.componentType')}</span>
						<select
							value={selectedComp.type}
							onchange={e => updateComponent(selectedComponentIndex!, { type: (e.currentTarget as HTMLSelectElement).value })}
						>
							{#each componentTypes as opt (opt.key)}
								<option value={opt.key}>{opt.label}</option>
							{/each}
						</select>
					</label>
				</div>

				<div class='row two-col'>
					<div class='field anim-field'>
						<div class='field-label-row'>
							<span>X</span>
							{#if animWorkspace}
								<button
									type='button'
									class='kf-chevron'
									class:kf-none={chevronState('x') === 'none'}
									class:kf-between={chevronState('x') === 'between'}
									class:kf-on={chevronState('x') === 'on'}
									title={chevronState('x') === 'on' ? 'Remove keyframe' : 'Add keyframe at playhead'}
									onclick={() => onChevronClick('x', selectedComp?.x ?? 0)}
								><i class='fas fa-diamond'></i></button>
							{/if}
						</div>
						<input
							type='number'
							value={selectedComp.x ?? 0}
							onchange={e => updateComponent(selectedComponentIndex!, { x: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
						/>
					</div>
					<div class='field anim-field'>
						<div class='field-label-row'>
							<span>Y</span>
							{#if animWorkspace}
								<button
									type='button'
									class='kf-chevron'
									class:kf-none={chevronState('y') === 'none'}
									class:kf-between={chevronState('y') === 'between'}
									class:kf-on={chevronState('y') === 'on'}
									title={chevronState('y') === 'on' ? 'Remove keyframe' : 'Add keyframe at playhead'}
									onclick={() => onChevronClick('y', selectedComp?.y ?? 0)}
								><i class='fas fa-diamond'></i></button>
							{/if}
						</div>
						<input
							type='number'
							value={selectedComp.y ?? 0}
							onchange={e => updateComponent(selectedComponentIndex!, { y: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
						/>
					</div>
				</div>
				<div class='row two-col'>
					<label class='field'>
						<span>W</span>
						<input
							type='number'
							min='1'
							value={selectedComp.w ?? 100}
							onchange={e => updateComponent(selectedComponentIndex!, { w: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 100 })}
						/>
					</label>
					<label class='field'>
						<span>H</span>
						<input
							type='number'
							min='1'
							value={selectedComp.h ?? 30}
							onchange={e => updateComponent(selectedComponentIndex!, { h: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 30 })}
						/>
					</label>
				</div>
				<div class='row two-col'>
					<div class='field anim-field'>
						<div class='field-label-row'>
							<span>Rotation</span>
							{#if animWorkspace}
								<button
									type='button'
									class='kf-chevron'
									class:kf-none={chevronState('rotation') === 'none'}
									class:kf-between={chevronState('rotation') === 'between'}
									class:kf-on={chevronState('rotation') === 'on'}
									title={chevronState('rotation') === 'on' ? 'Remove keyframe' : 'Add keyframe at playhead'}
									onclick={() => onChevronClick('rotation', selectedComp?.rotation ?? 0)}
								><i class='fas fa-diamond'></i></button>
							{/if}
						</div>
						<input
							type='number'
							value={selectedComp.rotation ?? 0}
							onchange={e => updateComponent(selectedComponentIndex!, { rotation: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
						/>
					</div>
					<label class='field locked'>
						<input
							type='checkbox'
							checked={!!selectedComp.locked}
							onchange={e => updateComponent(selectedComponentIndex!, { locked: (e.currentTarget as HTMLInputElement).checked })}
						/>
						<span>Locked</span>
					</label>
				</div>
				{#if animWorkspace}
					<div class='row anim-extras'>
						{#each (['opacity', 'scaleX', 'scaleY'] as AnimatablePropertyKey[]) as prop}
							<div class='field anim-field'>
								<div class='field-label-row'>
									<span>{prop}</span>
									<button
										type='button'
										class='kf-chevron'
										class:kf-none={chevronState(prop) === 'none'}
										class:kf-between={chevronState(prop) === 'between'}
										class:kf-on={chevronState(prop) === 'on'}
										title={chevronState(prop) === 'on' ? 'Remove keyframe' : 'Add keyframe at playhead'}
										onclick={() => onChevronClick(prop, prop === 'opacity' ? 1 : 1)}
									><i class='fas fa-diamond'></i></button>
								</div>
								<input
									type='number'
									step={prop === 'opacity' ? '0.05' : '0.1'}
									min={prop === 'opacity' ? '0' : undefined}
									max={prop === 'opacity' ? '1' : undefined}
									value={prop === 'opacity' ? 1 : 1}
									disabled
									title='Edit via animation keyframe'
								/>
							</div>
						{/each}
					</div>
				{/if}

				<header>
					<h4>{game.i18n?.localize('obs-utils.applications.overlayEditor.componentData')}</h4>
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
				<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.selectComponentHint')}</p>
			</div>
		{/if}
	{/if}
</div>

<svelte:window onclick={onWindowClick} />

{#if addMenuOpen}
	<div use:portalToBody class='add-menu' role='menu' data-add-component-menu style={addMenuStyle}>
		{#each componentTypes as opt (opt.key)}
			<button type='button' role='menuitem' onclick={() => {
				closeAddMenu();
				addComponent(opt.key);
			}}>
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

	// ── animation keyframe chevrons ──────────────────────────────────────────

	.anim-field
		position relative

	.field-label-row
		display flex
		align-items center
		justify-content space-between
		gap 4px

		span
			font-size 10px
			opacity 0.7

	.kf-chevron
		width 16px
		height 14px
		padding 0
		background transparent
		border none
		cursor pointer
		display flex
		align-items center
		justify-content center
		flex 0 0 auto

		i
			font-size 8px

		// outline = no track for this property
		&.kf-none
			opacity 0.3
			i
				color rgba(255, 255, 255, 0.6)

		// filled = track exists, playhead between keyframes
		&.kf-between
			opacity 0.8
			i
				color rgba(255, 200, 30, 0.8)

		// bright = playhead exactly on a keyframe
		&.kf-on
			opacity 1
			i
				color rgba(255, 144, 0, 1)
				filter drop-shadow(0 0 3px rgba(255, 144, 0, 0.8))

		&:hover
			opacity 1 !important

	.anim-extras
		flex-wrap wrap
		gap 4px

		.anim-field
			flex 1 1 80px
			min-width 72px

			input:disabled
				opacity 0.4
				cursor not-allowed

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

	.trigger-section
		border-top 1px solid rgba(255, 255, 255, 0.08)
		padding-top 8px

	.trigger-header
		cursor pointer
		user-select none
		display flex
		align-items center
		gap 6px
		margin-bottom 0
		font-size 11px
		font-weight 600
		text-transform uppercase
		letter-spacing 0.5px
		opacity 0.65

		&[aria-expanded="true"]
			margin-bottom 8px
			opacity 1

		.trigger-title
			opacity 1

		.trigger-caret
			margin-left auto
			font-size 10px

	.conditions-header
		font-size 10px
		font-weight 600
		text-transform uppercase
		letter-spacing 0.5px
		opacity 0.55
		margin-bottom 4px

	.trigger-enable
		display flex
		flex-direction row
		align-items center
		gap 4px
		font-size 10px
		font-weight 400
		text-transform none
		letter-spacing normal
		opacity 1
		margin-left auto

		input
			width auto
			height auto

	.trigger-body
		display flex
		flex-direction column
		gap 0

	.condition-row
		align-items flex-end

		.field
			flex 1 1 auto

		.clear-condition
			flex 0 0 auto
			width 24px
			height 24px
			padding 0
			display flex
			align-items center
			justify-content center
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			opacity 0.55
			margin-bottom 6px

			&:hover
				opacity 1
				background rgba(220, 60, 60, 0.15)
				border-color rgba(220, 60, 60, 0.4)

	.test-trigger
		width 100%
		height 28px
		display flex
		align-items center
		justify-content center
		gap 6px
		background rgba(80, 160, 80, 0.12)
		border 1px solid rgba(80, 160, 80, 0.4)
		border-radius 4px
		font-size 12px
		cursor pointer
		margin-top 2px

		&:hover
			background rgba(80, 160, 80, 0.22)
			border-color rgba(80, 160, 80, 0.7)
</style>
