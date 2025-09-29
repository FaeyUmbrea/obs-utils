<svelte:options runes={true} />
<script>
	import { get } from 'lodash-es';
	import { onDestroy } from 'svelte';

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
		const val1 = get(actor, data.split(';')[0], '');
		if (Number.isNaN(val1) || val1 < 0) {
			value1 = 0;
		} else {
			value1 = val1;
		}
		const val2 = get(actor, data.split(';')[2], '') - val1;
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
>
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i}
		<i class='{icon1} icon-{i}'></i>
	{/each}
	{#each Array.from({ length: value2 }, (_, i) => i + 1) as i}
		<i class='{icon2} icon-{value1 + i}'></i>
	{/each}
</div>
