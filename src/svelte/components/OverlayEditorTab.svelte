<script lang="ts">
  import { OverlayComponentData } from '../../utils/stream';
  import OverlayComponentEditor from './OverlayComponentEditor.svelte';

  export let components: Array<OverlayComponentData>;
  export let removeFn: any;
  export let componentindex: number;
  export let actorValues: Array<string>;

  function handleRemove(index: number) {
    components = [...components.slice(0, index), ...components.slice(index + 1, components.length)];
  }

  function handleAdd() {
    components = components.concat(new OverlayComponentData());
  }
</script>

<div class="scroll">
  <ul>
    {#each components as component, index (components.indexOf(component))}
      <OverlayComponentEditor bind:component removeFn={() => handleRemove(index)} {actorValues} />
    {/each}
  </ul>
</div>
<footer>
  <button class="add" type="button" on:click={() => handleAdd()}><i class="fas fa-plus" /></button>
  <button class="remove-tab" type="button" on:click={() => removeFn(componentindex)}><i class="fas fa-trash" /></button>
</footer>
