<script>
  import { onMount } from "svelte";

  let div;
  export let externalClass;
  onMount(() => {
    new externalClass({
      target: div,
      props: $$props,
    });
  });
</script>

<div bind:this="{div}"></div>
