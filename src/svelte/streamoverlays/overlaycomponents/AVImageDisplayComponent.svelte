<svelte:options runes={true} />
<script>
	import { onDestroy } from 'svelte';
	import { getByDataPath, removeQuotes } from '../../../utils/helpers.ts';

	let { data = $bindable(''), actorID = $bindable(), style = $bindable(), componentIndex = $bindable() } = $props();

	let actor = game.actors?.get(actorID);

	let value = $state('');
	const hook = Hooks.on('obs-utils.refreshActor', (changedactor) => {
		if (changedactor.id !== actorID) return;
		actor = changedactor;
		getValue();
	});

	function getValue() {
		const resolved = getByDataPath(actor, data);
		if (resolved === '') {
			value = data !== undefined && data !== null ? removeQuotes(data) : '';
		} else {
			value = resolved;
		}
		return '';
	}

	$effect(() => getValue());

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

<div
	class='component actor-val-component image-component'
	id={`component${componentIndex.toString()}`}
	style={style}
	data-value={value}
>
	<img alt='actor value img renderer' src={value} />
</div>
