<svelte:options runes={true} />
<script lang='ts'>
	import type { RenderedComponent, RenderedOverlay } from '../../utils/render.ts';
	import { getApi } from '../../utils/helpers.ts';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	const { overlay, overlayIndex }: {
		overlay: RenderedOverlay;
		overlayIndex: number;
	} = $props();

	const componentMap = getApi().overlayTypes.get('sl').overlayComponents;

	function getComponentType(type: string) {
		const resolved = componentMap.get(type);
		return resolved ?? EmptyComponent;
	}

	function frameStyle(c: RenderedComponent): string {
		const fx = c.frame?.x ?? 0;
		const fy = c.frame?.y ?? 0;
		const rot = (c.rotation ?? 0) + (c.frame?.rotation ?? 0);
		const sx = c.frame?.scaleX ?? 1;
		const sy = c.frame?.scaleY ?? 1;
		const opacity = c.frame?.opacity ?? 1;
		// display:contents keeps the flex layout intact when no frame applies; switch
		// to inline-block once anything non-identity needs to render.
		const hasIdentity = fx === 0 && fy === 0 && rot === 0 && sx === 1 && sy === 1;
		if (hasIdentity && opacity === 1) return 'display: contents;';
		const transform = `translate(${fx}px, ${fy}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
		return `display: inline-block; transform: ${transform}; opacity: ${opacity};`;
	}
</script>

<div
	class='single-line-overlay'
	id={`overlay${overlayIndex.toString()}`}
	data-overlay-id={overlay.overlayId}
	style={overlay.style}
>
	{#each overlay.components as component (component.id)}
		{@const Component = getComponentType(component.type)}
		<div data-component-id={component.id} style={frameStyle(component)}>
			<Component
				values={component.values}
				componentIndex={component.index}
				style={component.style}
			/>
		</div>
	{/each}
</div>

<style>
	/* Anchor the flex layout on the component so the composer preview matches /stream. */
	.single-line-overlay {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
	}
</style>
