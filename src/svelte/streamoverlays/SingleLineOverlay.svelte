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

	/**
	 * Apply the animation frame to the inline-overlay wrapper around each
	 * component. WYSIWYG has its own variant in `WYSIWYGOverlay.svelte`; the
	 * inline overlay used to render `display: contents` and so completely
	 * dropped opacity/transform animations — that's why opacity tracks on
	 * inline overlays appeared to do nothing.
	 */
	function frameStyle(c: RenderedComponent): string {
		const fx = c.frame?.x ?? 0;
		const fy = c.frame?.y ?? 0;
		const rot = (c.rotation ?? 0) + (c.frame?.rotation ?? 0);
		const sx = c.frame?.scaleX ?? 1;
		const sy = c.frame?.scaleY ?? 1;
		const opacity = c.frame?.opacity ?? 1;
		const transform = `translate(${fx}px, ${fy}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
		const hasIdentity = fx === 0 && fy === 0 && rot === 0 && sx === 1 && sy === 1;
		// Keep display:contents (which makes the wrapper transparent to the
		// flex layout) for components with no animation frame, so inline
		// layout stays exactly as it was. Once any animation kicks in, switch
		// to inline-block so the transform / opacity actually apply.
		if (hasIdentity && opacity === 1) return 'display: contents;';
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
	/* Production CSS in src/less/streamoverlay.styl scopes the flex layout to
	   `.obs-utils.overlay .actor .single-line-overlay`. The composer preview
	   doesn't render inside that path, so without a component-scoped default
	   the children stack as plain block elements — making the preview look
	   vertical while /stream renders horizontal. Anchor the row layout on the
	   component itself so both surfaces agree. */
	.single-line-overlay {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
	}
</style>
