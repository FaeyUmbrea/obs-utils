<script lang="ts">
  import { onMount, SvelteComponent } from 'svelte';

  let div;
  export let externalClass: typeof SvelteComponent;
  onMount(() => {
    new externalClass({
      target: div,
      props: $$props,
    });
  });
</script>

<div bind:this={div} />
