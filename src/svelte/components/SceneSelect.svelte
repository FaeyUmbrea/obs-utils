<svelte:options runes={true} />
<script lang='ts'>
	import { OBSEvent, SceneLoadEvent } from '../../utils/types.ts';
	import ObsSetting from './OBSSetting.svelte';

	let { eventArray = $bindable(), useWebSocket = $bindable(), handleAdd = $bindable() } = $props();

	function handleRemove(index) {
		eventArray = [
			...eventArray.slice(0, index),
			...eventArray.slice(index + 1, eventArray.length),
		];
	}

	handleAdd = () => {
		eventArray = eventArray.concat(new SceneLoadEvent());
	};

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

	async function dropScene(index, event) {
		try {
			const data = JSON.parse(event.dataTransfer.getData('text/plain'));
			if (Object.keys(data).includes('type') && Object.keys(data).includes('uuid')) {
				if (data.type === 'Scene') {
					const scene = (game as ReadyGame).scenes.get(data.uuid.split('.')[1]);
					if (scene.documentName.includes('Scene')) {
						eventArray[index].sceneName = scene.name;
					}
				}
			}
		} catch (err) {
			console.error(err);
		}
	}

	function setSceneName(index, value) {
		eventArray[index].sceneName = value;
		eventArray = eventArray;
	}

	function setEventData(index, aindex, value) {
		eventArray[index].obsActions[aindex] = value;
		eventArray = eventArray;
	}
</script>

<div class='scroll'>
	<ul>
		{#each eventArray as event, index (eventArray.indexOf(event))}
			<li>
				<div class='setting'>
					<span
					>{game.i18n?.localize('obs-utils.applications.obsRemote.vttSceneLabel')}</span
					><input
						name='input-{index}'
						bind:value={() => eventArray[index].sceneName, v => setSceneName(index, v)}
						placeholder={game.i18n.localize(
							'obs-utils.applications.obsRemote.vttScenePlaceholder',
						)}
						ondrop={event =>
							dropScene(index, event)}
					/>
					<button aria-label='delete' onclick={() => handleRemove(index)} type='button'>
						<i class='fas fa-trash'></i>
					</button>
					<button aria-label='add' onclick={() => handleChildAdd(index)} type='button'>
						<i class='fas fa-plus'></i>
					</button>
				</div>
				<ul>
					{#each event.obsActions as action, aindex (event.obsActions.indexOf(action))}
						<ObsSetting
							bind:event={() => eventArray[index].obsActions[aindex], v => setEventData(index, aindex, v)}
							isScene={true}
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
