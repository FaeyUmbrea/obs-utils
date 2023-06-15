<svelte:options accessors="{true}" />

<style>
    footer {
        position: absolute;
        width: 100%;
        bottom: 0;
        left: 0;
        padding: 10px;
    }
</style>

<script>
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { getContext } from "svelte";

  export let elementRoot = void 0;

  let application = getContext("#external").application;

  let style = application.style;

  function close() {
    application.style = style;
    application.close();
  }
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <input bind:value="{style}" name="style" type="text" />
  <footer>
    <button on:click="{close}">Submit</button>
  </footer>
</ApplicationShell>
