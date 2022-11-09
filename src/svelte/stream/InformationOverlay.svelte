<script lang="ts">
  import { SimpleTextOverlayData, type OverlayData } from "../../utils/stream";
  import SimpleTextOverlay from "./SimpleTextOverlay.svelte";
  export let overlays: Array<OverlayData>;
  export let actors: Array<Actor>;
</script>

<div>
    {#each overlays as overlay, index}
        {#if (overlay instanceof SimpleTextOverlayData)}
            <div class="overlay{index}">
                <SimpleTextOverlay bind:overlayData={overlay} bind:actors={actors}></SimpleTextOverlay>
            </div>
        {/if}
    {/each}
</div>