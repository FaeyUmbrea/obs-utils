<svelte:options runes={true} />
<script>
	import { getApi } from '../../utils/helpers';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	let { overlayData = $bindable(), actorID = $bindable(), overlayIndex = $bindable() } = $props();

	const overlayTypes = getApi().overlayTypes.get('sl').overlayComponents;

	function getComponentType(type) {
		if (!type) {
			console.warn('Your overlay could not be rendered.');
			return;
		}
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
		{@const Component = getComponentType(component.type)}
		<Component
			data={component.data}
			componentIndex={index}
			actorID={actorID}
			style={component.style}
		/>
	{/each}
</div>
