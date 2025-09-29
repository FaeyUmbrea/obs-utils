<svelte:options runes={true} />
<script>
	import { onMount } from 'svelte';

	let div;

	const { ExternalClass, ...rest } = $props();

	onMount(() => {
		// eslint-disable-next-line no-new
		new ExternalClass({
			target: div,
			props: rest,
		});
	});
</script>

<div bind:this={div}></div>
