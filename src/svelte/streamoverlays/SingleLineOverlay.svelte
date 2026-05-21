<svelte:options runes={true} />
<script lang='ts'>
	import type { RenderedOverlay } from '../../utils/render.ts';
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
</script>

<div
	class='single-line-overlay'
	id={`overlay${overlayIndex.toString()}`}
	data-overlay-id={overlay.overlayId}
	style={overlay.style}
>
	{#each overlay.components as component (component.id)}
		{@const Component = getComponentType(component.type)}
		<div data-component-id={component.id} style:display='contents'>
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
