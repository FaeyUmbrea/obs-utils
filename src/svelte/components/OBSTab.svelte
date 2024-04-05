<script>
  import { OBSEvent } from "../../utils/settings";
  import ObsSetting from "./OBSSetting.svelte";

  export let eventArray;
  export let useWebSocket;

  function handleRemove(index) {
    eventArray = [
      ...eventArray.slice(0, index),
      ...eventArray.slice(index + 1, eventArray.length),
    ];
  }

  export const handleAdd = () => {
    eventArray = eventArray.concat(new OBSEvent());
  };
</script>

<div class="scroll">
  <ul>
    {#each eventArray as event, index (eventArray.indexOf(event))}
      <ObsSetting
        event="{event}"
        removeFn="{() => handleRemove(index)}"
        useWebSocket="{useWebSocket}"
      />
    {/each}
  </ul>
</div>

<style>
  .add {
    width: 35px;
    align-self: flex-end;
  }

  .scroll {
    overflow: auto;
    float: left;
    max-height: 535px;
    height: 535px;
    width: auto;
    padding-left: 3px;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }
</style>
