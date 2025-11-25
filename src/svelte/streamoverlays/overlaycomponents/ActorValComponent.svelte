<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy } from 'svelte';
	import { getByDataPath, removeQuotes } from '../../../utils/helpers.ts';

	const { data, actorID, style, componentIndex } = $props();

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
			value = resolved as any;
		}
		return '';
	}

	$effect(() => getValue());

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

<div
	class='component actor-val-component'
	id={`component${componentIndex.toString()}`}
	data-value='${value}'
	style={style}
>
	{value}
</div>
