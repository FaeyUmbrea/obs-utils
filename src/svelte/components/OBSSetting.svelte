<script>
  import { OBSAction } from '../../utils/settings';
  import { fade } from 'svelte/transition';

  export let removeFn;
  export let event;
  export let useWebSocket;

  let idDisabled = true;
  let sceneDisabled = false;

  let actionTypes = Object.values(OBSAction);

  if (!useWebSocket) {
    actionTypes = actionTypes.filter((type) => type == OBSAction.SwitchScene);
  }

  function changeEvent() {
    if (event.targetAction == OBSAction.SwitchScene) {
      idDisabled = true;
    } else {
      idDisabled = false;
    }
  }

  changeEvent();
</script>

<li transition:fade>
  <div class="setting">
    <select name="types" bind:value={event.targetAction} on:change={changeEvent}>
      {#each actionTypes as action}
        <option value={action}>{action}</option>
      {/each}
    </select>
    <input name="sceneNames" bind:value={event.sceneName} disabled={sceneDisabled} placeholder="Scene Name" />
    <input name="itemIDs" bind:value={event.targetName} disabled={idDisabled} placeholder="Source Name" />
    <button type="button" on:click={removeFn}>
      <i class="fas fa-trash" />
    </button>
  </div>
</li>
