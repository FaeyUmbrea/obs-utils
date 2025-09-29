<svelte:options runes={true} />

<script>

	import { fade } from 'svelte/transition';
	import { OBSAction } from '../../utils/settings.ts';

	let { removeFn = $bindable(), event = $bindable(), useWebSocket = $bindable() } = $props();

	let idDisabled = $state(true);
	const sceneDisabled = false;

	const actionTypes = useWebSocket ? Object.values(OBSAction) : Object.values(OBSAction).filter(type => type !== OBSAction.SwitchScene);

	function changeEvent() {
		idDisabled = event.targetAction === OBSAction.SwitchScene;
	}

	changeEvent();

	function setTA(value) {
		event.targetAction = value;
		event = event;
	}

	function setSN(value) {
		event.sceneName = value;
		event = event;
	}

	function setTN(value) {
		event.targetName = value;
		event = event;
	}
</script>

<li transition:fade>
	<div class='setting'>
		<select
			bind:value={() => event.targetAction, v => setTA(v)}
			name='types'
			onchange={changeEvent}
		>
			{#each actionTypes as action}
				<option value={action}>{game.i18n.localize(action)}</option>
			{/each}
		</select>
		<input
			bind:value={() => event.sceneName, v => setSN(v)}
			disabled={sceneDisabled}
			name='sceneNames'
			placeholder={game.i18n.localize('obs-utils.applications.obsRemote.sceneName')}
		/>
		<input
			bind:value={() => event.targetName, v => setTN(v)}
			disabled={idDisabled}
			name='itemIDs'
			placeholder={game.i18n.localize('obs-utils.applications.obsRemote.sourceName')}
		/>
		<button aria-label='remove' onclick={removeFn} type='button'>
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
