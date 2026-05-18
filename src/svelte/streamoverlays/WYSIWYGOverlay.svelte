<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../../utils/helpers.ts';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	let { overlayData = $bindable(), actorID = $bindable(), overlayIndex = $bindable() } = $props();

	const overlayComponents = getApi().overlayTypes.get('wysiwyg').overlayComponents;

	const w = $derived(overlayData.config?.w ?? 300);
	const h = $derived(overlayData.config?.h ?? 300);

	function getComponentClass(type: string) {
		if (!type) return EmptyComponent;
		return overlayComponents.get(type) ?? EmptyComponent;
	}
</script>

<div
	class='wysiwyg-overlay'
	id={`overlay${overlayIndex.toString()}`}
	data-overlay-id={overlayData.id ?? ''}
	style={`position: relative; width: ${w}px; height: ${h}px; overflow: hidden; ${overlayData.style ?? ''}`}
>
	{#each overlayData.components as component, index (overlayData.components.indexOf(component))}
		{#if component !== null && component !== undefined}
			{@const Component = getComponentClass(component.type)}
			<div
				id={`wysiwyg-component-${overlayIndex}-${index}`}
				data-component-id={component.id ?? ''}
				style={`position: absolute; left: ${component.x ?? 0}px; top: ${component.y ?? 0}px; width: ${component.w ?? 100}px; height: ${component.h ?? 30}px; transform: rotate(${component.rotation ?? 0}deg);`}
			>
				<Component
					data={component.data}
					componentIndex={index}
					actorID={actorID}
					style={component.style}
				/>
			</div>
		{/if}
	{/each}
</div>

<style lang='stylus'>
.wysiwyg-overlay
	box-sizing border-box
</style>
