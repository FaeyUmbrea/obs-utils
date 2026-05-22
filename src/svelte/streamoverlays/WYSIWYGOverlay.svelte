<svelte:options runes={true} />
<script lang='ts'>
	import type { RenderedOverlay } from '../../utils/render.ts';
	import { getApi } from '../../utils/helpers.ts';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	const { overlay, overlayIndex }: {
		overlay: RenderedOverlay;
		overlayIndex: number;
	} = $props();

	const componentMap = getApi().overlayTypes.get('wysiwyg').overlayComponents;

	function getComponentClass(type: string) {
		if (!type) return EmptyComponent;
		return componentMap.get(type) ?? EmptyComponent;
	}

	/**
	 * Merge frame placement onto the component's own style. Layout slot is always
	 * reserved — triggered overlays toggle visibility via opacity, not mount/unmount,
	 * so sibling layout doesn't shift when triggers fire.
	 */
	function mergedStyle(c: import('../../utils/render.ts').RenderedComponent): string {
		const fx = c.frame?.x ?? 0;
		const fy = c.frame?.y ?? 0;
		const rot = (c.rotation ?? 0) + (c.frame?.rotation ?? 0);
		const sx = c.frame?.scaleX ?? 1;
		const sy = c.frame?.scaleY ?? 1;
		const opacity = c.frame?.opacity ?? 1;
		const transform = `translate(${fx}px, ${fy}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
		const prefix = `position: absolute; left: ${c.x}px; top: ${c.y}px; width: ${c.w}px; height: ${c.h}px; transform: ${transform}; opacity: ${opacity};`;
		const base = c.style ?? '';
		return base ? `${prefix} ${base}` : prefix;
	}
</script>

<div
	class='wysiwyg-overlay'
	id={`overlay${overlayIndex.toString()}`}
	data-overlay-id={overlay.overlayId}
	style={`position: relative; width: ${overlay.w}px; height: ${overlay.h}px; overflow: hidden; ${overlay.style ?? ''}`}
>
	{#each overlay.components as component (component.id)}
		{@const Component = getComponentClass(component.type)}
		<Component
			componentId={component.id}
			values={component.values}
			componentIndex={component.index}
			style={mergedStyle(component)}
		/>
	{/each}
</div>

<style lang='stylus'>
.wysiwyg-overlay
	box-sizing border-box
</style>
