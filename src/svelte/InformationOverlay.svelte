<script lang="ts">
  import { TextOverlayData, type OverlayData } from "../utils/stream";
  import TextOverlay from "./streamoverlays/TextOverlay.svelte";
  export let overlays: Array<OverlayData>;
  export let actors: Array<Actor>;
</script>
<div class="stream-overlay">
    {#each overlays as overlay, index}
        {#if (overlay instanceof TextOverlayData)}
            <div class="obsutils overlay overlay{index}">
                <TextOverlay bind:overlayData={overlay} bind:actors={actors}></TextOverlay>
            </div>
        {/if}
    {/each}
</div>