<svelte:options runes={true} />
<script lang='ts'>
	import type { Selection } from '../../utils/keyframeTimelineRefs.ts';
	import type { OverlayComponentData, OverlayData, OverlayTrack } from '../../utils/types.ts';
	import { SvelteSet } from 'svelte/reactivity';
	import { USER_ANIMATABLE_PROPERTIES } from '../../utils/keyframeTimelineRefs.ts';
	import { lanePropertyKeyframes } from '../../utils/overlayAnimation.ts';
	import { ensureComponentId } from '../../utils/types.ts';

	let {
		layer,
		track,
		selection = $bindable(),
		expandedComponents,
		onAddKeyframeAtPlayhead,
		componentLabel,
	}: {
		layer: OverlayData;
		track: OverlayTrack;
		selection: Selection | null;
		expandedComponents: SvelteSet<string>;
		onAddKeyframeAtPlayhead: (c: OverlayComponentData) => void;
		componentLabel: (c: OverlayComponentData) => string;
	} = $props();

	function toggleExpanded(componentId: string) {
		if (expandedComponents.has(componentId)) {
			expandedComponents.delete(componentId);
		} else {
			expandedComponents.add(componentId);
		}
	}
</script>

<div class='lane-heads'>
	{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
		{@const componentId = ensureComponentId(comp)}
		{@const isExpanded = expandedComponents.has(componentId)}
		{@const lane = track.lanes.find(l => l.componentId === componentId)}

		<div
			class='lane-head comp-header'
			class:selected={selection?.kind === 'component' && selection.componentId === componentId}
			role='button'
			tabindex='0'
			onclick={() => {
				selection = { kind: 'component', componentId };
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					selection = { kind: 'component', componentId };
				}
			}}
		>
			<button
				type='button'
				class='expand-btn'
				onclick={(e) => {
					e.stopPropagation();
					toggleExpanded(componentId);
				}}
				title={isExpanded ? 'Collapse' : 'Expand properties'}
				aria-expanded={isExpanded}
			>
				<i class={isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'}></i>
			</button>
			<span class='lane-name'>{componentLabel(comp)}</span>
			<button
				type='button'
				class='lane-add'
				title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addKeyframe')}
				onclick={(e) => {
					e.stopPropagation();
					onAddKeyframeAtPlayhead(comp);
				}}
			><i class='fas fa-plus'></i></button>
		</div>

		{#if isExpanded}
			{#each USER_ANIMATABLE_PROPERTIES as prop (prop)}
				{@const pkf = lane ? lanePropertyKeyframes(lane)[prop] : []}
				<div
					class='lane-head prop-row'
					class:selected={selection?.kind === 'property' && selection.componentId === componentId && selection.prop === prop}
					role='button'
					tabindex='0'
					onclick={() => {
						selection = { kind: 'property', componentId, prop };
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							selection = { kind: 'property', componentId, prop };
						}
					}}
				>
					<span class='prop-indent'></span>
					<span class='lane-name prop-name'>{prop}</span>
					<span class='prop-kf-count' class:has-kf={pkf.length > 0}>{pkf.length > 0 ? pkf.length : ''}</span>
				</div>
			{/each}
		{/if}
	{/each}
</div>

<style lang='stylus'>
	.lane-heads
		display flex
		flex-direction column
		gap 2px

	.lane-head
		display flex
		align-items center
		gap 4px
		height 20px
		font-size 11px
		border-radius 3px
		cursor pointer

		&:hover
			background rgba(255, 255, 255, 0.05)

		&.selected
			background rgba(255, 144, 0, 0.15)

		&.comp-header
			font-weight 600
			border-top 1px solid rgba(255, 255, 255, 0.06)
			margin-top 2px
			padding-left 2px

		&.prop-row
			padding-left 0
			opacity 0.8

			&:hover
				opacity 1

		.lane-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.prop-name
			font-size 10px
			font-family monospace
			opacity 0.75

		.prop-indent
			width 12px
			flex 0 0 auto

		.prop-kf-count
			font-size 9px
			opacity 0.5
			font-family monospace
			min-width 12px
			text-align right

			&.has-kf
				opacity 1
				color rgba(255, 200, 30, 0.85)

		.lane-add
			width 22px
			height 18px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			cursor pointer
			opacity 0.7
			font-size 10px

			&:hover
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.45)

	.expand-btn
		width 16px
		height 16px
		background transparent
		border none
		cursor pointer
		opacity 0.6
		display flex
		align-items center
		justify-content center
		flex 0 0 auto
		padding 0
		font-size 9px

		&:hover
			opacity 1
</style>
