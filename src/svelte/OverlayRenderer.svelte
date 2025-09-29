<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../utils/helpers';
	import { settings } from '../utils/settings.ts';
	import InformationOverlay from './streamoverlays/PerActorOverlay.svelte';
	import ExternalComponent from './utilities/ExternalComponent.svelte';

	const overlays = settings.getReadableStore('streamOverlays');
	const actors = settings.getReadableStore('overlayActors');

	const singleTimeOverlays = getApi().singleInstanceOverlays;
</script>

<div class='overlay-renderer'>
	<InformationOverlay actorIDs={$actors} overlays={$overlays} />
	{#each [...singleTimeOverlays] as overlay}
		<ExternalComponent ExternalClass={overlay} />
	{/each}
</div>
