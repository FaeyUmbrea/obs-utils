<svelte:options runes={true} />
<script>
	import { mount, onMount } from 'svelte';

	let div;

	const { ExternalClass, ...rest } = $props();

	onMount(() => {
		mount(ExternalClass, { target: div, props: rest });
	});
</script>

<div bind:this={div}></div>
