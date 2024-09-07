<svelte:options accessors="{true}" />

<script>
  import ObsTab from "./components/OBSTab.svelte";
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { getSetting, setSetting } from "../utils/settings.js";
  import { getContext } from "svelte";
  import SceneSelect from "./components/SceneSelect.svelte";
  import Select from "svelte-select";
  import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

  const useWebSocket = getSetting("enableOBSWebsocket");
  let obssettings = getSetting("obsRemote");

  export let elementRoot = void 0;

  let entries = Object.getOwnPropertyNames(obssettings);

  if (!useWebSocket) {
    entries = entries.filter((entry) => entry != "onStopStreaming");
  }

  function formatKey(key) {
    return localize(`obs-utils.applications.obsRemote.${key}`);
  }

  const context = getContext("#external");

  async function submit() {
    await setSetting("obsRemote", obssettings);
    context.application.close();
  }

  let handleAdd;

  let selection = "";
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    <div class="header">
      <Select
        bind:justValue="{selection}"
        value="{entries[0]}"
        items="{entries}"
        searchable="{false}"
        clearable="{false}"
        containerStyles="background-color: white;"
      >
        <div slot="selection" let:selection>
          <i
            class="fas {selection.value === 'onStopStreaming'
              ? 'fa-signal-stream'
              : 'fa-dice-d20'}"
          ></i>
          {formatKey(selection.value)}
        </div>
        <div slot="item" let:item>
          <i
            class="fas {item.value === 'onStopStreaming'
              ? 'fa-signal-stream'
              : 'fa-dice-d20'}"
          ></i>
          {formatKey(item.value)}
        </div>
      </Select>
      <button
        class="add"
        on:click="{() => {
          console.log(handleAdd);
          if (handleAdd !== undefined) handleAdd();
        }}"
        type="button"><i class="fas fa-plus"></i></button
      >
    </div>
    <hr />
    <div>
      <section class="content">
        {#if selection === "onSceneLoad"}
          <SceneSelect
            bind:handleAdd="{handleAdd}"
            bind:eventArray="{obssettings[selection]}"
            useWebSocket="{useWebSocket}"
          ></SceneSelect>
        {:else if selection !== ""}
          {#key selection}
            <ObsTab
              bind:handleAdd="{handleAdd}"
              bind:eventArray="{obssettings[selection]}"
              useWebSocket="{useWebSocket}"
            />
          {/key}
        {/if}
      </section>
      <footer>
        <hr />
        <button class="submit" on:click="{submit}"
          >{localize("obs-utils.strings.done")}</button
        >
      </footer>
    </div>
  </main>
</ApplicationShell>

<style>
  .header {
    display: grid;
    grid-template-columns: auto 45px;
  }
  footer {
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    padding: 10px;
  }
</style>
