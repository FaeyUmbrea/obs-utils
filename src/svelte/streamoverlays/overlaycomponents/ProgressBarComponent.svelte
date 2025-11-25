<svelte:options runes={true} />
<script>
	import { onDestroy } from 'svelte';
	import { getByDataPath, removeQuotes } from '../../../utils/helpers.ts';

	let { data = $bindable(''), actorID = $bindable(), style = $bindable(), componentIndex = $bindable() } = $props();

	let actor = game.actors?.get(actorID);

	let value1 = $state('');
	let value2 = $state('');
	const hook = Hooks.on('obs-utils.refreshActor', (changedactor) => {
		if (changedactor.id !== actorID) return;
		actor = changedactor;
		getValue();
	});

	function getValue() {
		const path1 = data.split(';')[0];
		const r1 = getByDataPath(actor, path1);
		if (r1 === '') {
			value1 = path1 !== undefined && path1 !== null ? removeQuotes(path1) : '';
		} else {
			value1 = r1;
		}
		const path2 = data.split(';')[1];
		const r2 = getByDataPath(actor, path2);
		if (r2 === '') {
			value2 = path2 !== undefined && path2 !== null ? removeQuotes(path2) : '';
		} else {
			value2 = r2;
		}
		return '';
	}

	$effect(() => getValue());

	onDestroy(() => {
		Hooks.off('obs-utils.refreshActor', hook);
	});
</script>

<div
	class='component actor-val-component progress-bar-component'
	id={`component${componentIndex.toString()}`}
	data-value='${value1}'
	data-max='${value2}'
	style={style}
>
	<progress
		value={Number.isNaN(value1) || !Number.isFinite(value1) ? 0.5 : value1}
		max={Number.isNaN(value2) || !Number.isFinite(value2) ? 1 : value2}
	></progress>
</div>
