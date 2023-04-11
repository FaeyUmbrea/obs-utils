<script>
  import {onDestroy} from 'svelte';
  import {getSetting} from '../utils/settings';
  import InformationOverlay from './streamoverlays/PerActorOverlay.svelte';
  import ExternalComponent from './utilities/ExternalComponent.svelte';
  import {getApi} from '../utils/helpers';

  let overlays = getSetting('streamOverlays');
  let actors = getSetting('overlayActors');

  let hook = Hooks.on('updateSetting', (setting, change) => {
    if (setting.key === 'obs-utils.streamOverlays') {
      overlays = JSON.parse(change.value);
    } else if (setting.key === 'obs-utils.overlayActors') {
      actors = JSON.parse(change.value);
    }
  });

  onDestroy(() => {
    Hooks.off('updateSettings', hook);
  });

  const singleTimeOverlays = getApi().singleInstanceOverlays;
</script>

<div class="overlay-renderer">
  <InformationOverlay {overlays} actorIDs={actors} />
  {#each [...singleTimeOverlays] as overlay}
    <ExternalComponent externalClass={overlay} />
  {/each}
</div>
