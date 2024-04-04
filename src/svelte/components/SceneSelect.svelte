<script>
    import { OBSEvent, SceneLoadEvent } from "../../utils/settings";
    import ObsSetting from "./OBSSetting.svelte";
    import CollapsibleSection from './CollapsibleSection.svelte';
    import ObsTab from "./OBSTab.svelte";
  
    /**
     * @type {Array<SceneLoadEvent>}
     */
    export let eventArray;
    export let useWebSocket;
  
    function handleRemove(index) {
      eventArray = [
        ...eventArray.slice(0, index),
        ...eventArray.slice(index + 1, eventArray.length),
      ];
    }
  
    function handleAdd() {
      eventArray = eventArray.concat(new SceneLoadEvent());
    }
  </script>
  
  <button class="add" on:click="{() => handleAdd()}" type="button"
    ><i class="fas fa-plus"></i></button
  >
  <div class="scroll">
    <ul>
      {#each eventArray as event, index (eventArray.indexOf(event))}
            <div class="setting">
                <span for="input-{index}">Scene Name:</span><input name="input-{index}" bind:value={event.sceneName} />
                <button on:click="{() => handleRemove(index)}" type="button">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <ObsTab
              bind:eventArray="{event.obsActions}"
              useWebSocket="{useWebSocket}"
            />
      {/each}
    </ul>
  </div>
  
  <style>
    .setting {
        height: 35px;
        display: flex;
        justify-content: center;
        align-content: space-around;
        flex-flow: row nowrap;
        align-items: stretch;
    }
    .setting button {
    width: 35px;
    margin: auto;
    }
    .setting input {
        width: 400px;
    }

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
  