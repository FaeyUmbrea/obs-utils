<svelte:options runes={true} />
<script>
	import { onDestroy, onMount } from 'svelte';

	// Renders a component owned by another module. That module mounts itself into our `div` with its own
	// Svelte `mount()` (via the `mountFn` callback) and hands back a cleanup function. This is the only
	// cross-bundle-safe path in Svelte 5: a foreign component's runes resolve against its own bundle's
	// runtime, so we cannot mount it ourselves without throwing `effect_orphan`.
	let div;
	let cleanup;

	const { mountFn, ...props } = $props();

	onMount(() => {
		cleanup = mountFn(div, props);
	});

	onDestroy(() => {
		if (typeof cleanup === 'function') cleanup();
	});
</script>

<!-- display:contents so the mounted component participates directly in our layout, adding no box of its own. -->
<div bind:this={div} style:display='contents'></div>
