<script>
  import { OverlayComponentData } from '../../utils/stream';
  import OverlayComponentEditor from './editors/SingleLineOverlayEditor.svelte';
  //import { sortable } from 'svelte-agnostic-draggable';
  import StyleEditor from '../../applications/styleditor';
  import { SortableList } from '@jhubbardsf/svelte-sortablejs';

  export let overlay;
  export let removeFn;
  export let componentindex;
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

  function handleReorder(e) {
    [overlay.components[e.oldDraggableIndex], overlay.components[e.newDraggableIndex]] = [
      overlay.components[e.newDraggableIndex],
      overlay.components[e.oldDraggableIndex],
    ];
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
  <ul>
    <SortableList onEnd={handleReorder} animation={150} handle=".handle">
      {#key rerender}
        {#each overlay.components as component, index (overlay.components.indexOf(component))}
          <OverlayComponentEditor bind:component removeFn={handleRemove} {index} />
        {/each}
      {/key}
    </SortableList>
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
