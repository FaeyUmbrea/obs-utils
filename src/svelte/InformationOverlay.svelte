<script lang="ts">
  import { OverlayType, type OverlayData } from "../utils/stream";
  import SingleLineOverlay from "./streamoverlays/SingleLineOverlay.svelte";
  export let overlays: Array<OverlayData>;
  export let actors: Array<string>;
</script>
<div class="stream-overlay">
    {#each overlays as overlay, index}
        {#if overlay.type == OverlayType.SINGLELINE}
            <div class="obsutils overlay overlay{index}">
                <SingleLineOverlay bind:overlayData={overlay} bind:actors={actors}></SingleLineOverlay>
            </div>
        {/if}
    {/each}
</div>