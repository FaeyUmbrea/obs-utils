<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy, onMount } from 'svelte';
	import { activateCSSInjection, deactivateCSSInjection } from '../utils/cssInjection.ts';
	import { getApi } from '../utils/helpers';
	import { settings } from '../utils/settings.ts';
	import OverlayHost from './streamoverlays/OverlayHost.svelte';
	import ExternalComponent from './utilities/ExternalComponent.svelte';
	import LegacyExternalComponent from './utilities/LegacyExternalComponent.svelte';

	const overlays = settings.getReadableStore('streamOverlays');
	const actors = settings.getReadableStore('overlayActors');

	const singleTimeOverlaysLegacy = getApi().singleInstanceOverlays;
	const singleTimeOverlaysSvelte5 = getApi().singleInstanceOverlaysSvelte5;

	onMount(() => activateCSSInjection());
	onDestroy(() => deactivateCSSInjection());
</script>

<div class='overlay-renderer'>
	<OverlayHost actorIDs={$actors} overlays={$overlays} />
	{#each [...singleTimeOverlaysLegacy] as overlay (overlay)}
		<LegacyExternalComponent ExternalClass={overlay} />
	{/each}
	{#each [...singleTimeOverlaysSvelte5] as overlay (overlay)}
		<ExternalComponent ExternalClass={overlay} />
	{/each}
</div>
