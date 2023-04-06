<script>
  import {ApplicationShell} from "@typhonjs-fvtt/runtime/svelte/component/core";
  import {getContext} from "svelte";

  export let elementRoot = void 0;
  const items = ["a", "b"]

  let application = getContext("#external").application

  let style = application.style;

  function close() {
    application.style = style;
    application.close();
  }
</script>

<svelte:options accessors={true}/>

<ApplicationShell bind:elementRoot>
  <input bind:value={style} name="style" type="text"/>
  <footer>
    <button on:click={close}>Submit</button>
  </footer>
</ApplicationShell>