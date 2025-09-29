<svelte:options runes={true} />
<script lang='ts'>
	import { get, has } from 'lodash-es';
	import { onDestroy } from 'svelte';
	import { removeQuotes } from '../../../utils/helpers.ts';

	const { data, actorID, style, componentIndex } = $props();

	let actor = game.actors?.get(actorID);

	let value = $state('');

	const hook = Hooks.on('obs-utils.refreshActor', (changedactor) => {
		if (changedactor.id !== actorID) return;
		actor = changedactor;
		getValue();
	});

	function getValue() {
		const hasValue = has(actor, data);
		if (hasValue) {
			value = get(actor, data, '');
		} else {
			value = data !== undefined && data !== null ? removeQuotes(data) : '';
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
	style={style}
>
	{value}
</div>
