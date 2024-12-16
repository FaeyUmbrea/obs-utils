<script>
	import { TJSDocument } from '#runtime/svelte/store/fvtt/document';
	import { localize } from '#runtime/util/i18n';
	import { OBSEvent, SceneLoadEvent } from '../../utils/settings.js';
	import ObsSetting from './OBSSetting.svelte';

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

	export function handleAdd() {
		eventArray = eventArray.concat(new SceneLoadEvent());
	}

	function handleChildAdd(index) {
		eventArray[index].obsActions.push(new OBSEvent());
		// Weird hack to force update
		eventArray[index].obsActions = eventArray[index].obsActions;
	}

	function handleChildRemove(index, aindex) {
		eventArray[index].obsActions = [
			...eventArray[index].obsActions.slice(0, aindex),
			...eventArray[index].obsActions.slice(
				aindex + 1,
				eventArray[index].obsActions.length,
			),
		];
	}

	const doc = new TJSDocument();
	async function dropScene(index, event) {
		try {
			await doc.setFromDataTransfer(
				JSON.parse(event.dataTransfer.getData('text/plain')),
			);
			const scene = doc.get();
			if (scene.documentName.includes('Scene')) {
				eventArray[index].sceneName = scene.name;
			}
		} catch (err) {
			console.error(err);
		}
	}
</script>

<div class='scroll'>
	<ul>
		{#each eventArray as event, index (eventArray.indexOf(event))}
			<li>
				<div class='setting'>
					<span
					>{localize('obs-utils.applications.obsRemote.vttSceneLabel')}</span
					><input
						name='input-{index}'
						bind:value={event.sceneName}
						placeholder={localize(
							'obs-utils.applications.obsRemote.vttScenePlaceholder',
						)}
						on:drop|preventDefault|stopPropagation={event =>
							dropScene(index, event)}
					/>
					<button on:click={() => handleRemove(index)} type='button'>
						<i class='fas fa-trash'></i>
					</button>
					<button on:click={() => handleChildAdd(index)} type='button'>
						<i class='fas fa-plus'></i>
					</button>
				</div>
				<ul>
					{#each event.obsActions as action, aindex (event.obsActions.indexOf(action))}
						<ObsSetting
							event={action}
							removeFn={() => handleChildRemove(index, aindex)}
							useWebSocket={useWebSocket}
						/>
					{/each}
				</ul>
			</li>
			<hr />
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
