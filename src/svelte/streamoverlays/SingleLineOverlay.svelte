<script>
	import { getApi } from '../../utils/helpers';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	export let overlayData;
	export let actorID;
	export let overlayIndex;

	const overlayTypes = getApi().overlayTypes.get('sl').overlayComponents;

	function getComponentType(type) {
		const resolvedType = overlayTypes.get(type);
		if (resolvedType !== undefined) {
			return resolvedType;
		} else {
			return EmptyComponent;
		}
	}
</script>

<div
	class='single-line-overlay'
	id={`overlay${overlayIndex.toString()}`}
	style={overlayData.style}
>
	{#each overlayData.components as component, index (overlayData.components.indexOf(component))}
		<svelte:component
			this={getComponentType(component.type.toString())}
			data={component.data}
			componentIndex={index}
			actorID={actorID}
			style={component.style}
		/>
	{/each}
</div>
