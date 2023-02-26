<script lang="ts">
  import { type OverlayData } from '../../utils/stream';

  import EmptyComponent from './overlaycomponents/EmptyComponent.svelte';
  export let overlayData: OverlayData;
  export let actorID: string;
  export let overlayIndex: number;

  let overlayTypes = window.obsutils.overlayTypes.get('sl').overlayComponents;
  function getComponentType(type: string) {
    const resolvedType = overlayTypes.get(type);
    if (resolvedType != undefined) {
      return resolvedType;
    } else {
      return EmptyComponent;
    }
  }
</script>

<div class="single-line-overlay" id={'overlay' + overlayIndex.toString()} style={overlayData.style}>
  {#each overlayData.components as component, index (overlayData.components.indexOf(component))}
    <svelte:component
      this={getComponentType(component.type.toString())}
      data={component.data}
      componentIndex={index}
      {actorID}
      style={component.style}
    />
  {/each}
</div>
