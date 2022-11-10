<script lang="ts">
  import { ComponentType, type OverlayData } from "../../utils/stream";
  import ActorValComponent from "./overlaycomponents/ActorValComponent.svelte";
  import FAIconComponent from "./overlaycomponents/FAIconComponent.svelte";
  import PlaintextComponent from "./overlaycomponents/PlaintextComponent.svelte";
  export let overlayData:OverlayData;
  export let actors:Array<String>;
</script>

{#each actors as actor}
    <div class="actor actor{actor} text-overlay">
    {#each overlayData.components as component}
    <div class="component">
      {#if component.type == ComponentType.FAICON}
        <FAIconComponent  overlayData={component} />
      {:else if component.type == ComponentType.PLAINTEXT}
        <PlaintextComponent overlayData={component} />
      {:else if component.type == ComponentType.ACTORVAL}
        <ActorValComponent overlayData={component} actor={actor}/>
      {/if}
    </div>
    {/each}
    </div>
{/each}