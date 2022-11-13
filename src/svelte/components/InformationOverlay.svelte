<script lang="ts">
  import { OverlayType, type OverlayData } from "../../utils/stream";
  import SingleLineOverlay from "../streamoverlays/SingleLineOverlay.svelte";
  export let overlays: Array<OverlayData>;
  export let actorIDs: Array<string>;
  export let additionalClasses: string = "";
</script>
<div class="stream-overlay {additionalClasses}">
    {#each overlays as overlay, index}
        {#if overlay.type == OverlayType.SINGLELINE}
            <div class="obsutils overlay overlay{index}">
                <SingleLineOverlay overlayData={overlay} actorIDs={actorIDs}></SingleLineOverlay>
            </div>
        {/if}
    {/each}
</div>