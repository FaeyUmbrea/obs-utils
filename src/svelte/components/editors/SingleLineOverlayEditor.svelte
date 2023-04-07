<script>
  import StyleEditor from '../../../applications/styleditor.js';
  import FallbackEditor from './FallbackEditor.svelte';
  import {getApi} from '../../../utils/helpers';

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
    if (editor !== undefined) {
      return editor;
    } else {
      return FallbackEditor;
    }
  }
</script>

<li data-list-key={index}>
  <div class="component">
    <i class="fa-light fa-bars handle"></i>
    <select name="types" bind:value={component.type}>
      {#each [...componentNames] as [component, name]}
        <option value={component}>{name}</option>
      {/each}
    </select>
    <svelte:component bind:data={component.data} this={getEditor(component.type)}/>
    <button type="button" title="Remove Component" on:click={() => removeFn(index)}>
      <i class="fas fa-trash"></i>
    </button>
    <button class="add" type="button" title="Edit Component Style" on:click={() => openStyleEditor()}>
      <i class="fas fa-pencil"></i>
    </button>
  </div>
</li>

<style lang="stylus">
  li {
    padding-top: 1px;
    padding-bottom: 1px;
  }

  .handle {
    height: 35px;
    width: 35px;
    font-size: 25px;
    text-align: center;
    line-height: 35px;
  }

  .component {
    display: grid;
    grid-template-columns: 35px 150px auto 35px 35px;
    grid-template-rows: 35px;

    button {
      width: 35px;
      margin: auto;
    }

    select {
      height: auto;
    }
  }
</style>
