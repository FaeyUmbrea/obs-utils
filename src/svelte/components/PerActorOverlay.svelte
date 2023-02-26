<script lang="ts">
  import { type OverlayData } from '../../utils/stream';
  export let overlays: Array<OverlayData>;
  export let actorIDs: Array<string>;
  export let additionalClasses: string = '';

  function getOverlayType(type: string) {
    return window.obsutils.overlayTypes.get(type).overlayClass;
  }
</script>

<div class="obs-utils overlay {additionalClasses}">
  {#each actorIDs as actorID}
    <div class="actor" id={'actor' + actorID}>
      {#each overlays as overlay, index (overlays.indexOf(overlay))}
        <svelte:component this={getOverlayType(overlay.type)} overlayData={overlay} {actorID} overlayIndex={index} />
      {/each}
    </div>
  {/each}
</div>
