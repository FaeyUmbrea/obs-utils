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
