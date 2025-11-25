<svelte:options runes={true} />
<script>
	import { onDestroy } from 'svelte';
	import { getByDataPath } from '../../../utils/helpers.ts';

	let { data = $bindable(''), actorID = $bindable(), style = $bindable(), componentIndex = $bindable() } = $props();

	const actor = game.actors?.get(actorID);

	let value1 = $state('');
	let value2 = $state('');
	const icon1 = $state(data.split(';')[1] ?? '');
	const icon2 = $state(data.split(';')[3] ?? '');
	const hook = Hooks.on('obs-utils.refreshActor', (actor) => {
		if (actor.id !== actorID) return;
		getValue();
	});

	function getValue() {
		const raw1 = getByDataPath(actor, data.split(';')[0]);
		const val1 = Number(raw1);
		if (Number.isNaN(val1) || val1 < 0) {
			value1 = 0;
		} else {
			value1 = val1;
		}
		const raw2 = getByDataPath(actor, data.split(';')[2]);
		const val2 = Number(raw2) - value1;
		if (Number.isNaN(val2) || val2 < 0) {
			value2 = 0;
		} else {
			value2 = val2;
		}
	}

	$effect(() => {
		getValue();
	});

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

<div
	class='component actor-val-component multi-icon-component'
	id={`component${componentIndex.toString()}`}
	style={style}
	data-value1='${value1}'
	data-value2='${value2}'
>
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i}
		<i class='{icon1} icon-{i}'></i>
	{/each}
	{#each Array.from({ length: value2 }, (_, i) => i + 1) as i}
		<i class='{icon2} icon-{value1 + i}'></i>
	{/each}
</div>
