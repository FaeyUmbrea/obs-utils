<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../../utils/helpers.ts';

	let { overlays = $bindable(), actorIDs = $bindable() } = $props();

	function getOverlayType(type) {
		return getApi().overlayTypes.get(type).overlayClass;
	}
</script>

<div class='obs-utils overlay'>
	{#each actorIDs as actorID}
		<div class='actor' id={`actor${actorID}`}>
			{#each overlays as overlay, index (overlays.indexOf(overlay))}
				{@const Component = getOverlayType(overlay.type)}
				<Component
					overlayData={overlay}
					actorID={actorID}
					overlayIndex={index}
				/>
			{/each}
		</div>
	{/each}
</div>
