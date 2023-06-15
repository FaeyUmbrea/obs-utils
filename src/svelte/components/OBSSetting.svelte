<script>
  import { OBSAction } from "../../utils/settings";
  import { fade } from "svelte/transition";

  export let removeFn;
  export let event;
  export let useWebSocket;

  let idDisabled = true;
  let sceneDisabled = false;

  let actionTypes = Object.values(OBSAction);

  if (!useWebSocket) {
    actionTypes = actionTypes.filter((type) => type === OBSAction.SwitchScene);
  }

  function changeEvent() {
    idDisabled = event.targetAction === OBSAction.SwitchScene;
  }

  changeEvent();
</script>

<li transition:fade>
  <div class="setting">
    <select
      bind:value="{event.targetAction}"
      name="types"
      on:change="{changeEvent}"
    >
      {#each actionTypes as action}
        <option value="{action}">{action}</option>
      {/each}
    </select>
    <input
      bind:value="{event.sceneName}"
      disabled="{sceneDisabled}"
      name="sceneNames"
      placeholder="Scene Name"
    />
    <input
      bind:value="{event.targetName}"
      disabled="{idDisabled}"
      name="itemIDs"
      placeholder="Source Name"
    />
    <button on:click="{removeFn}" type="button">
      <i class="fas fa-trash"></i>
    </button>
  </div>
</li>

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

  .setting select {
    height: auto;
  }

  li {
    padding-top: 1px;
    padding-bottom: 1px;
  }
</style>
