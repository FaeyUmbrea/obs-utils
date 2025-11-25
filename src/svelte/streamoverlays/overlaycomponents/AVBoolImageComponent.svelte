<svelte:options runes={true} />
<script>
	import { onDestroy } from 'svelte';
	import { getByDataPath } from '../../../utils/helpers.ts';

	let { data = $bindable(''), actorID = $bindable(), style = $bindable(), componentIndex = $bindable() } = $props();

	const actor = game.actors?.get(actorID);

	let value = $state('');
	let image1 = $state('');
	let image2 = $state('');
	const hook = Hooks.on('obs-utils.refreshActor', (actor) => {
		if (actor.id !== actorID) return;
		getValue();
	});

	function getValue() {
		value = getByDataPath(actor, data.split(';')[0]);
		image1 = data.split(';')[1] ?? 'fa-solid fa-check';
		image2 = data.split(';')[2] ?? 'fa-solid fa-x';
		return '';
	}

	$effect(() => getValue());

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

<div
	class='component actor-val-component bool-component bool-{(!!value).toString()} image-component'
	id={`component${componentIndex.toString()}`}
	data-value='${value}'
	style={style}
>
	{#if !!value && image1 !== ''}
		<img alt='actor value img renderer' src={image1} />
	{:else if !value && image2 !== ''}
		<img alt='actor value img renderer' src={image2} />
	{/if}
</div>
