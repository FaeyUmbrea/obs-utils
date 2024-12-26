<script>
	import { get } from 'lodash-es';
	import { onDestroy } from 'svelte';

	export let data = '';
	export let actorID;
	export let style;
	export let componentIndex;

	const actor = game.actors?.get(actorID);

	let value1 = '';
	let value2 = '';
	let image1 = '';
	let image2 = '';
	const hook = Hooks.on('obs-utils.refreshActor', (actor) => {
		if (actor.id !== actorID) return;
		getValue();
	});

	function getValue() {
		value1 = get(actor, data.split(';')[0], '');
		value2 = get(actor, data.split(';')[2], '') - value1;
		if (Number.isNaN(value2) || value2 < 0) {
			value2 = 0;
		}
		return '';
	}

	function getSplit() {
		image1 = data.split(';')[1];
		image2 = data.split(';')[3];
		return '';
	}

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

{#key data}
	{getValue()}
	{getSplit()}
{/key}
<div
	class='component actor-val-component multi-image-component'
	id={`component${componentIndex.toString()}`}
	style={style}
>
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i}
		<img alt='actor value multi img renderer image-{i}' src={image1} />
	{/each}
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i}
		<img
			alt='actor value multi img renderer image-{value1 + i}'
			src={image2}
		/>
	{/each}
</div>
