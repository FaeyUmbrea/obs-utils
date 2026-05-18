<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../../utils/helpers.ts';

	let { overlays = $bindable(), actorIDs = $bindable() } = $props();

	function getOverlayType(type) {
		const entry = getApi().overlayTypes.get(type);
		if (!entry || !entry.perActor) return null;
		return entry.overlayClass;
	}
</script>

<div class='obs-utils overlay'>
	{#each actorIDs as actorID}
		{@const actorName = (game as any).actors?.get?.(actorID)?.name ?? actorID}
		<div class='actor' id={`actor${actorID}`} data-actor-name={actorName}>
			{#each overlays as overlay, index (overlays.indexOf(overlay))}
				{@const Component = getOverlayType(overlay.type)}
				{#if Component !== null && Component !== undefined && overlay?.enabled !== false}
					<div class='actor-layer' data-actor-name={actorName}>
						<Component
							overlayData={overlay}
							actorID={actorID}
							overlayIndex={index}
						/>
					</div>
				{/if}
			{/each}
		</div>
	{/each}
</div>
