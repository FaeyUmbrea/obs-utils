<script>
  import { OverlayComponentData } from '../../utils/stream';
  import OverlayComponentEditor from './OverlayComponentEditor.svelte';
  import { sortable } from 'svelte-agnostic-draggable';

  export let components;
  export let removeFn;
  export let componentindex;
  export let actorValues;

  let ListView;

  function handleRemove(index) {
    components = [...components.slice(0, index), ...components.slice(index + 1, components.length)];
  }

  function handleAdd() {
    components = components.concat(new OverlayComponentData());
  }

  let rerender = 0;

  function handleReorder() {
    let newListElements = [];
    let ItemViewList = ListView.children;
    for (let i = 0, l = ItemViewList.length; i < l; i++) {
      let ListKey = ItemViewList[i].dataset.listKey;
      if (ListKey != null) {
        newListElements.push(components[Number.parseInt(ListKey)]);
      }
    }
    components = newListElements;
    rerender++;
  }
</script>

<div class="scroll">
  <ul
    bind:this={ListView}
    use:sortable={{ cursor: 'grabbing', zIndex: 10, handle: '.handle' }}
    on:sortable:update={handleReorder}
  >
    {#key rerender}
      {#each components as component, index (components.indexOf(component))}
        <OverlayComponentEditor bind:component removeFn={handleRemove} {actorValues} {index} />
      {/each}
    {/key}
  </ul>
</div>
<footer>
  <button class="add" type="button" title="Add new Component" on:click={() => handleAdd()}
    ><i class="fas fa-plus" /></button
  >
  <button class="remove-tab" type="button" title="Remove Overlay" on:click={() => removeFn(componentindex)}
    ><i class="fas fa-trash" /></button
  >
</footer>
