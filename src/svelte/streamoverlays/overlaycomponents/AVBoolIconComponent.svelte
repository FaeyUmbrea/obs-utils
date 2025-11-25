<svelte:options runes={true} />

<script>
	import { onDestroy } from 'svelte';
	import { getByDataPath } from '../../../utils/helpers.ts';

	let { data = $bindable(''), actorID = $bindable(), style = $bindable(), componentIndex = $bindable() } = $props();

	const actor = game.actors?.get(actorID);

	let value = $state('');
	let icon1 = $state('');
	let icon2 = $state('');
	const hook = Hooks.on('obs-utils.refreshActor', (actor) => {
		if (actor.id !== actorID) return;
		getValue();
	});

	function getValue() {
		value = getByDataPath(actor, data.split(';')[0]);
		icon1 = data.split(';')[1] ?? 'fa-solid fa-check';
		icon2 = data.split(';')[2] ?? 'fa-solid fa-x';
		return '';
	}

	$effect(() => getValue());

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

<div
	class='component actor-val-component bool-component bool-{(!!value).toString()} fa-icon-component'
	id={`component${componentIndex.toString()}`}
	data-value={(!!value).toString()}
	style={style}
>
	{#if !!value === true}
		<i class={icon1}></i>
	{:else}
		<i class={icon2}></i>
	{/if}
</div>
