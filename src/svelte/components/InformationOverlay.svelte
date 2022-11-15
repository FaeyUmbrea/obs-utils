<script lang="ts">
  import { OverlayType, type OverlayData } from '../../utils/stream';
  import SingleLineOverlay from '../streamoverlays/SingleLineOverlay.svelte';
  export let overlays: Array<OverlayData>;
  export let actorIDs: Array<string>;
  export let additionalClasses: string = '';
</script>

<div class="obs-utils overlay {additionalClasses}">
  {#each overlays as overlay, index (overlays.indexOf(overlay))}
    {#if overlay.type == OverlayType.SINGLELINE}
      <SingleLineOverlay overlayData={overlay} {actorIDs} overlayIndex={index} />
    {/if}
  {/each}
</div>
