<script>
  import { ComponentType } from '../../utils/stream';
  import Svelecte from 'svelecte';
  import { fade } from 'svelte/transition';

  export let component;
  export let removeFn;
  export let actorValues;

  const componentTypes = Object.values(ComponentType);
</script>

<li transition:fade>
  <div class="component">
    <select name="types" bind:value={component.type}>
      {#each componentTypes as component}
        <option value={component}>{component}</option>
      {/each}
    </select>
    {#if component.type == ComponentType.ACTORVAL}
      <Svelecte options={actorValues} inputId={'data'} bind:value={component.data} labelAsValue={true} />
    {:else}
      <input name="data" bind:value={component.data} placeholder="" />
    {/if}
    <button type="button" on:click={removeFn}>
      <i class="fas fa-trash" />
    </button>
  </div>
</li>
