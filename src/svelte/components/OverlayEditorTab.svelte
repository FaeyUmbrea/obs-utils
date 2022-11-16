<script>
  import { OverlayComponentData } from '../../utils/stream';
  import OverlayComponentEditor from './OverlayComponentEditor.svelte';
  import { sortable } from 'svelte-agnostic-draggable';
  import StyleEditor from '../../applications/styleditor';

  export let overlay;
  export let removeFn;
  export let componentindex;
  export let actorValues;

  let ListView;

  function handleRemove(index) {
    overlay.components = [
      ...overlay.components.slice(0, index),
      ...overlay.components.slice(index + 1, overlay.components.length),
    ];
  }

  function handleAdd() {
    overlay.components = overlay.components.concat(new OverlayComponentData());
  }

  let rerender = 0;

  function handleReorder() {
    let newListElements = [];
    let ItemViewList = ListView.children;
    for (let i = 0, l = ItemViewList.length; i < l; i++) {
      let ListKey = ItemViewList[i].dataset.listKey;
      if (ListKey != null) {
        newListElements.push(overlay.components[Number.parseInt(ListKey)]);
      }
    }
    overlay.components = newListElements;
    rerender++;
  }

  function openStyleEditor() {
    let editor = new StyleEditor(overlay.style, (styleNew) => {
      overlay.style = styleNew;
    });
    editor.render(true);
  }
</script>

<div class="scroll">
  <ul
    bind:this={ListView}
    use:sortable={{ cursor: 'grabbing', zIndex: 10, handle: '.handle' }}
    on:sortable:update={handleReorder}
  >
    {#key rerender}
      {#each overlay.components as component, index (overlay.components.indexOf(component))}
        <OverlayComponentEditor bind:component removeFn={handleRemove} {actorValues} {index} />
      {/each}
    {/key}
  </ul>
</div>
<footer>
  <button class="add" type="button" title="Add new Component" on:click={() => handleAdd()}
    ><i class="fas fa-plus" /></button
  >
  <button class="add" type="button" title="Edit Overlay Style" on:click={() => openStyleEditor()}
    ><i class="fas fa-pencil" /></button
  >
  <button class="remove-tab" type="button" title="Remove Overlay" on:click={() => removeFn(componentindex)}
    ><i class="fas fa-trash" /></button
  >
</footer>
