<script>

	import { fade } from 'svelte/transition';
	import { OBSAction } from '../../utils/settings.ts';

	export let removeFn;
	export let event;
	export let useWebSocket;

	let idDisabled = true;
	const sceneDisabled = false;

	let actionTypes = Object.values(OBSAction);

	if (!useWebSocket) {
		actionTypes = actionTypes.filter(type => type === OBSAction.SwitchScene);
	}

	function changeEvent() {
		idDisabled = event.targetAction === OBSAction.SwitchScene;
	}

	changeEvent();
</script>

<li transition:fade>
	<div class='setting'>
		<select
			bind:value={event.targetAction}
			name='types'
			on:change={changeEvent}
		>
			{#each actionTypes as action}
				<option value={action}>{game.i18n.localize(action)}</option>
			{/each}
		</select>
		<input
			bind:value={event.sceneName}
			disabled={sceneDisabled}
			name='sceneNames'
			placeholder={game.i18n.localize('obs-utils.applications.obsRemote.sceneName')}
		/>
		<input
			bind:value={event.targetName}
			disabled={idDisabled}
			name='itemIDs'
			placeholder={game.i18n.localize('obs-utils.applications.obsRemote.sourceName')}
		/>
		<button on:click={removeFn} type='button'>
			<i class='fas fa-trash'></i>
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
    height: 35px;
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
