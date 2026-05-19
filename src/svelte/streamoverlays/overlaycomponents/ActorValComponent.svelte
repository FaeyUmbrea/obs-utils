<svelte:options runes={true} />
<script lang='ts'>
	import { getContext, onDestroy } from 'svelte';
	import { getByTriggerOrDataPath, removeQuotes } from '../../../utils/helpers.ts';

	const { data, actorID, style, componentIndex } = $props();

	// actorID is stable per component mount; initial capture is intentional
	// eslint-disable-next-line svelte/valid-compile
	let actor = $state(game.actors?.get(actorID));

	const triggerCtx = getContext<{ current?: Record<string, any> }>('obs-utils.triggerPayload');
	let value = $state('');

	const hook = Hooks.on('obs-utils.refreshActor', (changedactor) => {
		if (changedactor.id !== actorID) return;
		actor = changedactor;
		getValue();
	});

	function getValue() {
		const resolved = getByTriggerOrDataPath(actor, triggerCtx?.current, data);
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
