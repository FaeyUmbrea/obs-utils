<script>
  import StyleEditor from '../../../applications/styleditor.js';
  import FallbackEditor from './FallbackEditor.svelte';
  import { getApi } from '../../../utils/helpers';

  export let component;
  export let removeFn;
  export let index;

  const componentNames = getApi().overlayTypes.get('sl').overlayComponentNames;
  const componentEditors = getApi().overlayTypes.get('sl').overlayComponentEditors;

  function openStyleEditor() {
    let editor = new StyleEditor(component.style, (styleNew) => {
      component.style = styleNew;
    });
    editor.render(true);
  }

  function getEditor(type) {
    const editor = getApi().overlayTypes.get('sl').overlayComponentEditors.get(type);
    if (editor != undefined) {
      return editor;
    } else {
      return FallbackEditor;
    }
  }
</script>

<li data-list-key={index}>
  <div class="component">
    <i class="fa-light fa-bars handle" />
    <select name="types" bind:value={component.type}>
      {#each [...componentNames] as [component, name]}
        <option value={component}>{name}</option>
      {/each}
    </select>
    <svelte:component this={getEditor(component.type)} bind:data={component.data} />
    <button type="button" title="Remove Component" on:click={() => removeFn(index)}>
      <i class="fas fa-trash" />
    </button>
    <button class="add" type="button" title="Edit Component Style" on:click={() => openStyleEditor()}>
      <i class="fas fa-pencil" />
    </button>
  </div>
</li>
