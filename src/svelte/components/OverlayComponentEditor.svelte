<script>
  import { ComponentType } from '../../utils/stream';
  import Svelecte from 'svelecte';
  import StyleEditor from '../../applications/styleditor';

  export let component;
  export let removeFn;
  export let index;
  export let actorValues;

  const componentTypes = Object.values(ComponentType);

  function openStyleEditor() {
    let editor = new StyleEditor(component.style, (styleNew) => {
      component.style = styleNew;
    });
    editor.render(true);
  }
</script>

<li data-list-key={index}>
  <div class="component">
    <i class="fa-light fa-bars handle" />
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
        creatablePrefix=""
      />
    {:else}
      <input name="data" bind:value={component.data} placeholder="" />
    {/if}
    <button type="button" title="Remove Component" on:click={() => removeFn(index)}>
      <i class="fas fa-trash" />
    </button>
    <button class="add" type="button" title="Edit Component Style" on:click={() => openStyleEditor()}>
      <i class="fas fa-pencil" />
    </button>
  </div>
</li>
