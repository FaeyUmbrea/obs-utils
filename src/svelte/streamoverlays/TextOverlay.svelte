<script lang="ts">
  import { PlainTextComponentData, type TextOverlayData } from "../../utils/stream";
  import {FAIconComponentData} from "../../utils/stream";
  import FAIconComponent from "./overlaycomponents/FAIconComponent.svelte";
  import PlaintextComponent from "./overlaycomponents/PlaintextComponent.svelte";
  export let overlayData:TextOverlayData;
  export let actors:Array<Actor>;
</script>

{#each actors as actor}
    <div class="actor actor{actor.name} text-overlay">
    {#each overlayData.components as component}
    <div class="component">
      {#if (component instanceof FAIconComponentData)}
        <FAIconComponent  overlayData={component} actors={actors}/>
      {:else if (component instanceof PlainTextComponentData)}
        <PlaintextComponent overlayData={component} actors={actors}/>
      {/if}
    </div>
    {/each}
    </div>
{/each}