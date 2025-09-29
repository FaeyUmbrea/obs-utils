<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../utils/helpers';
	import { settings } from '../utils/settings.ts';
	import PerActorOverlay from './streamoverlays/PerActorOverlay.svelte';
	import ExternalComponent from './utilities/ExternalComponent.svelte';
	import LegacyExternalComponent from './utilities/LegacyExternalComponent.svelte';

	const overlays = settings.getReadableStore('streamOverlays');
	const actors = settings.getReadableStore('overlayActors');

	const singleTimeOverlaysLegacy = getApi().singleInstanceOverlays;
	const singleTimeOverlaysSvelte5 = getApi().singleInstanceOverlaysSvelte5;
</script>

<div class='overlay-renderer'>
	<PerActorOverlay actorIDs={$actors} overlays={$overlays} />
	{#each [...singleTimeOverlaysLegacy] as overlay}
		<LegacyExternalComponent ExternalClass={overlay} />
	{/each}
	{#each [...singleTimeOverlaysSvelte5] as overlay}
		<ExternalComponent ExternalClass={overlay} />
	{/each}
</div>
