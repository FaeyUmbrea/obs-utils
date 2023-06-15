<svelte:options accessors="{true}" />

<script>
  import { getSetting, setSetting } from "../utils/settings.js";
  import { getContext } from "svelte";
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";

  let websocketSettings = getSetting("websocketSettings");
  export let elementRoot = void 0;

  const context = getContext("#external");

  async function submit() {
    await setSetting("websocketSettings", websocketSettings);
    context.application.close();
  }
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    <hr />
    <div class="flexcol">
      URL: <input bind:value="{websocketSettings.url}" name="url" type="text" />
      <br />
      Port:
      <input bind:value="{websocketSettings.port}" name="port" type="number" />
      <br />
      Password:
      <input
        bind:value="{websocketSettings.password}"
        name="password"
        type="password" />
      <p style="color:red">This password is NOT stored securely</p>
      <hr />
      <button on:click="{submit}" type="submit">Save</button>
    </div>
    <hr />
  </main>
</ApplicationShell>
