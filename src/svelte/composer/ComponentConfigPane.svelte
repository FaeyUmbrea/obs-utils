<svelte:options runes={true} />
<script lang='ts'>
	import type { AnimatablePropertyKey } from '../../utils/overlayAnimation.ts';
	import type { OverlayData } from '../../utils/types.ts';
	import { getContext } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { ensureComponentId } from '../../utils/types.ts';
	import FallbackEditor from '../components/editors/FallbackEditor.svelte';

	let {
		component,
		componentIndex,
		layer,
		commit,
		onRemove,
	} = $props<{
		component: OverlayData['components'][number];
		componentIndex: number;
		layer: OverlayData;
		layerIndex: number;
		commit: () => void;
		onRemove: () => void;
	}>();

	const animWorkspace = getContext<{
		playheadT: number;
		togglePropertyKeyframe: (componentId: string, prop: AnimatablePropertyKey, currentValue: number) => void;
		chevronStateFor: (componentId: string, prop: AnimatablePropertyKey) => 'none' | 'between' | 'on';
	} | undefined>('obs-utils.animWorkspace');

	function chevronState(prop: AnimatablePropertyKey): 'none' | 'between' | 'on' {
		if (!animWorkspace) return 'none';
		const id = ensureComponentId(component);
		return animWorkspace.chevronStateFor(id, prop);
	}

	function onChevronClick(prop: AnimatablePropertyKey, currentValue: number) {
		if (!animWorkspace) return;
		const id = ensureComponentId(component);
		animWorkspace.togglePropertyKeyframe(id, prop, currentValue);
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

	function updateComponent(patch: Partial<OverlayData['components'][number]>) {
		const comp = layer.components[componentIndex];
		if (!comp) return;
		Object.assign(comp, patch);
		layer.components = [...layer.components];
		commit?.();
	}

	const selectedComponentEditor = $derived(getComponentEditor(component.type));
</script>

<section class='comp-config'>
	<header>
		<h4>
			<i class='fas fa-vector-square'></i>
			{game.i18n?.localize('obs-utils.applications.overlayEditor.componentHeader')}
			<span class='comp-index'>#{componentIndex}</span>
		</h4>
		<button
			type='button'
			class='delete-comp'
			onclick={onRemove}
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
				value={component.type}
				onchange={e => updateComponent({ type: (e.currentTarget as HTMLSelectElement).value })}
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
						onclick={() => onChevronClick('x', component.x ?? 0)}
					><i class='fas fa-diamond'></i></button>
				{/if}
			</div>
			<input
				type='number'
				value={component.x ?? 0}
				onchange={e => updateComponent({ x: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
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
						onclick={() => onChevronClick('y', component.y ?? 0)}
					><i class='fas fa-diamond'></i></button>
				{/if}
			</div>
			<input
				type='number'
				value={component.y ?? 0}
				onchange={e => updateComponent({ y: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
			/>
		</div>
	</div>
	<div class='row two-col'>
		<label class='field'>
			<span>W</span>
			<input
				type='number'
				min='1'
				value={component.w ?? 100}
				onchange={e => updateComponent({ w: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 100 })}
			/>
		</label>
		<label class='field'>
			<span>H</span>
			<input
				type='number'
				min='1'
				value={component.h ?? 30}
				onchange={e => updateComponent({ h: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 30 })}
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
						onclick={() => onChevronClick('rotation', component.rotation ?? 0)}
					><i class='fas fa-diamond'></i></button>
				{/if}
			</div>
			<input
				type='number'
				value={component.rotation ?? 0}
				onchange={e => updateComponent({ rotation: Number.parseInt((e.currentTarget as HTMLInputElement).value) || 0 })}
			/>
		</div>
		<label class='field locked'>
			<input
				type='checkbox'
				checked={!!component.locked}
				onchange={e => updateComponent({ locked: (e.currentTarget as HTMLInputElement).checked })}
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
		{#key `${component.id ?? componentIndex}-${component.type ?? ''}`}
			{#if selectedComponentEditor}
				{@const Editor = selectedComponentEditor}
				<Editor
					bind:data={() => layer.components[componentIndex]?.data ?? '', v => updateComponent({ data: v })}
				/>
			{/if}
		{/key}
	</div>
</section>

<style lang='stylus'>
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

		&.kf-none
			opacity 0.3
			i
				color rgba(255, 255, 255, 0.6)

		&.kf-between
			opacity 0.8
			i
				color rgba(255, 200, 30, 0.8)

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
</style>
