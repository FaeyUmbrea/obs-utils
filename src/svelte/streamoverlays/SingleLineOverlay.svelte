<svelte:options runes={true} />
<script>
	import { getApi } from '../../utils/helpers';
	import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';

	let { overlayData = $bindable(), actorID = $bindable(), overlayIndex = $bindable() } = $props();

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
		{@const Component = getComponentType(component.type.toString())}
		<Component
			data={component.data}
			componentIndex={index}
			actorID={actorID}
			style={component.style}
		/>
	{/each}
</div>
