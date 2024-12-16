<script>
	import { get, has } from 'lodash-es';
	import { onDestroy } from 'svelte';
	import { removeQuotes } from '../../../utils/helpers.js';

	export let data;
	export let actorID;
	export let style;
	export let componentIndex;

	let actor = game.actors?.get(actorID);

	let value = '';

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

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

{#key data}
	{getValue()}
{/key}
<div
	class='component actor-val-component'
	id={`component${componentIndex.toString()}`}
	style={style}
>
	{value}
</div>
