<script>
	import { onMount } from 'svelte';

	let div;
	export let ExternalClass;
	onMount(() => {
		// eslint-disable-next-line no-new
		new ExternalClass({
			target: div,
			props: $$props,
		});
	});
</script>

<div bind:this={div}></div>
