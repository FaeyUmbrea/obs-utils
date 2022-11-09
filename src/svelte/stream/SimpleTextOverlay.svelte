<script lang="ts">
  import type { SimpleTextOverlayData } from "src/utils/stream";

  export let overlayData:SimpleTextOverlayData;
  export let actors:Array<Actor>;
</script>

{#each actors as actor}
    <div class="actor{actor.name} actor simpletextoverlay">
    {#each overlayData.components as component}    
        {component.getData(actor)}
    {/each}
    </div>
{/each}