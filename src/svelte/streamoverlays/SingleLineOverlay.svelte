<script lang="ts">
  import { ComponentType, type OverlayData } from '../../utils/stream';
  import ActorValComponent from './overlaycomponents/ActorValComponent.svelte';
  import AvBoolDisplayComponent from './overlaycomponents/AVBoolDisplayComponent.svelte';
  import FAIconComponent from './overlaycomponents/FAIconComponent.svelte';
  import PlaintextComponent from './overlaycomponents/PlaintextComponent.svelte';
  export let overlayData: OverlayData;
  export let actorID: string;
  export let overlayIndex: number;
</script>

<div class="single-line-overlay" id={'overlay' + overlayIndex.toString()} style={overlayData.style}>
  {#each overlayData.components as component, index (overlayData.components.indexOf(component))}
    {#if component.type == ComponentType.FAICON}
      <FAIconComponent data={component.data} componentIndex={index} style={component.style} />
    {:else if component.type == ComponentType.PLAINTEXT}
      <PlaintextComponent data={component.data} componentIndex={index} style={component.style} />
    {:else if component.type == ComponentType.ACTORVAL}
      <ActorValComponent data={component.data} {actorID} componentIndex={index} style={component.style} />
    {:else if component.type == ComponentType.BOOLAV}
      <AvBoolDisplayComponent data={component.data} {actorID} componentIndex={index} style={component.style} />
    {/if}
  {/each}
</div>
