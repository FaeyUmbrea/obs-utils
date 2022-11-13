<script lang="ts">
  import { ComponentType, type OverlayData } from "../../utils/stream";
  import ActorValComponent from "./overlaycomponents/ActorValComponent.svelte";
  import FAIconComponent from "./overlaycomponents/FAIconComponent.svelte";
  import PlaintextComponent from "./overlaycomponents/PlaintextComponent.svelte";
  export let overlayData:OverlayData;
  export let actorIDs:Array<string>;
</script>

{#each actorIDs as actor}
    <div class="actor actor{actor} text-overlay">
    {#each overlayData.components as component}
    <div class="component">
      {#if component.type == ComponentType.FAICON}
        <FAIconComponent  data={component.data} />
      {:else if component.type == ComponentType.PLAINTEXT}
        <PlaintextComponent data={component.data} />
      {:else if component.type == ComponentType.ACTORVAL}
        <ActorValComponent data={component.data} actorID={actor}/>
      {/if}
    </div>
    {/each}
    </div>
{/each}