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
	let icon1 = '';
	let icon2 = '';
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
		icon1 = data.split(';')[1];
		icon2 = data.split(';')[3];
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
	class='component actor-val-component multi-icon-component'
	id={`component${componentIndex.toString()}`}
	style={style}
>
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i}
		<i class='{icon1} icon-{i}'></i>
	{/each}
	{#each Array.from({ length: value2 }, (_, i) => i + 1) as i}
		<i class='{icon2} icon-{value1 + i}'></i>
	{/each}
</div>
