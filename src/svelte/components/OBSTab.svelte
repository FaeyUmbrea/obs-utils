<script lang="ts">
  import { OBSEvent } from '../../utils/settings';
  import ObsSetting from './OBSSetting.svelte';

  export let eventArray: OBSEvent[];
  export let useWebSocket: boolean;
  function handleRemove(index: number) {
    eventArray = [...eventArray.slice(0, index), ...eventArray.slice(index + 1, eventArray.length)];
  }

  function handleAdd() {
    eventArray = eventArray.concat(new OBSEvent());
  }
</script>

<button class="add" type="button" on:click={() => handleAdd()}><i class="fas fa-plus" /></button>
<div class="scroll">
  <ul>
    {#each eventArray as event, index (eventArray.indexOf(event))}
      <ObsSetting {event} removeFn={() => handleRemove(index)} {useWebSocket} />
    {/each}
  </ul>
</div>
