<script lang="ts">
  import { OverlayType, type OverlayData } from "../utils/stream";
  import SingleLineOverlay from "./streamoverlays/SingleLineOverlay.svelte";
  export let overlays: Array<OverlayData>;
  export let actorIDs: Array<string>;
  export let hooks: Array<number>;
</script>
<div class="stream-overlay">
    {#each overlays as overlay, index}
        {#if overlay.type == OverlayType.SINGLELINE}
            <div class="obsutils overlay overlay{index}">
                <SingleLineOverlay overlayData={overlay} actorIDs={actorIDs} bind:hooks={hooks}></SingleLineOverlay>
            </div>
        {/if}
    {/each}
</div>