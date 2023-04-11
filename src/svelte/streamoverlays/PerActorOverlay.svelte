<script>
  import {getApi} from '../../utils/helpers.js';

  export let overlays;
    export let actorIDs;

    function getOverlayType(type) {
        return getApi().overlayTypes.get(type).overlayClass;
    }
</script>

<div class="obs-utils overlay">
  {#each actorIDs as actorID}
    <div class="actor" id={'actor' + actorID}>
      {#each overlays as overlay, index (overlays.indexOf(overlay))}
        <svelte:component this={getOverlayType(overlay.type)} overlayData={overlay} {actorID} overlayIndex={index} />
      {/each}
    </div>
  {/each}
</div>
