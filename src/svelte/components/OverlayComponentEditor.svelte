<script>
  import { ComponentType } from '../../utils/stream';
  import Svelecte from 'svelecte';

  export let component;
  export let removeFn;
  export let index;
  export let actorValues;

  const componentTypes = Object.values(ComponentType);
</script>

<li data-list-key={index}>
  <div class="component">
    <i class="fa-solid fa-bars handle" />
    <select name="types" bind:value={component.type}>
      {#each componentTypes as component}
        <option value={component}>{component}</option>
      {/each}
    </select>
    {#if component.type == ComponentType.ACTORVAL}
      <Svelecte
        options={actorValues}
        inputId={'data'}
        bind:value={component.data}
        labelAsValue={true}
        creatable={true}
        allowEditing={true}
      />
    {:else}
      <input name="data" bind:value={component.data} placeholder="" />
    {/if}
    <button type="button" on:click={() => removeFn(index)}>
      <i class="fas fa-trash" />
    </button>
  </div>
</li>
