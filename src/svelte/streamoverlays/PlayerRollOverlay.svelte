<svelte:options runes={true} />
<script>
	import RollListenerComponent from './overlaycomponents/RollListenerComponent.svelte';

	const players = game.users
		.filter(e => e.id !== game.user.id)
		.map(user => user.id);
</script>

<div class='obs-utils roll-overlay'>
	{#each players as id}
		<RollListenerComponent id={id} />
	{/each}
</div>
