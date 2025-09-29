<svelte:options runes={true} />

<script lang='ts'>
	import { OBSEvent } from '../../utils/types.ts';
	import ObsSetting from './OBSSetting.svelte';

	let { eventArray = $bindable(), useWebSocket = $bindable(), handleAdd = $bindable() } = $props();

	function handleRemove(index) {
		eventArray = [
			...eventArray.slice(0, index),
			...eventArray.slice(index + 1, eventArray.length),
		];
	}

	handleAdd = () => {
		eventArray = eventArray.concat(new OBSEvent());
	};

	function getEvent(index) {
		return eventArray[index];
	}

	function setEvent(index, value) {
		eventArray[index] = value;
		eventArray = eventArray;
	}

</script>

<div class='scroll'>
	<ul>
		{#each eventArray as event, index (eventArray.indexOf(event))}
			<ObsSetting
				bind:event={() => getEvent(index),
				v => setEvent(index, v)}
				removeFn={() => handleRemove(index)}
				useWebSocket={useWebSocket}
			/>
		{/each}
	</ul>
</div>

<style>
  .scroll {
    overflow: auto;
    float: left;
    max-height: 535px;
    height: 535px;
    width: 100%;
    padding-left: 3px;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }
</style>
