<svelte:options accessors="{true}" />

<script>
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";

  export let elementRoot = void 0;
</script>

<ApplicationShell bind:elementRoot="{elementRoot}" />
