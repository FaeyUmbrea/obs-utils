<script>
	import { getApi } from '../utils/helpers';
	import { settings } from '../utils/settings.js';
	import InformationOverlay from './streamoverlays/PerActorOverlay.svelte';
	import ExternalComponent from './utilities/ExternalComponent.svelte';

	const overlays = settings.getReadableStore('streamOverlays');
	const actors = settings.getReadableStore('overlayActors');

	const singleTimeOverlays = getApi().singleInstanceOverlays;
</script>

<div class='overlay-renderer'>
	<InformationOverlay actorIDs={$actors} overlays={$overlays} />
	{#each [...singleTimeOverlays] as overlay}
		<ExternalComponent externalClass={overlay} />
	{/each}
</div>
