<svelte:options runes={true} />
<script>
	// This is to decouple the roll listener from the actual component

	import { onDestroy } from 'svelte';
	import PlayerRollComponent from './PlayerRollComponent.svelte';

	let { id = $bindable() } = $props();

	let rollShow = $state(false);

	let rollValue = $state('');
	const hook = Hooks.on('createChatMessage', (e) => {
		const uid = e.author.id;
		if (uid === id && e.whisper.length === 0 && e.isRoll) {
			rollValue = e.rolls.reduce(
				(accumulator, currentValue) =>
					accumulator + Number.parseInt(currentValue.total),
				0,
			);
			rollShow = true;
		}
	});

	onDestroy(() => {
		Hooks.off('createChatMessage', hook);
	});
</script>

<PlayerRollComponent
	bind:rollValue={rollValue}
	id={id}
/>
