<svelte:options accessors="{true}" />

<script>
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { generateDataBlockFromSetting, getStore } from "../utils/settings.js";
  import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

  let { ic, ooc, players } = generateDataBlockFromSetting();
  let currentIC = getStore("defaultInCombat");
  let currentOOC = getStore("defaultOutOfCombat");
  let currentTrackedPlayer = getStore("trackedUser");
  let clampCanvas = getStore("clampCanvas");

  async function onChangeIC(event) {
    $currentIC = event.target.value;
  }

  async function onChangeOOC(event) {
    $currentOOC = event.target.value;
  }

  async function onChangePlayer(event) {
    $currentTrackedPlayer = event.target.value;
  }

  export let elementRoot = void 0;
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    <b>In Combat Type</b>
    <div>
      {#each ic as { id, tooltip, icon }}
        <input
          type="radio"
          bind:group="{$currentIC}"
          id="radioic{id}"
          name="currentIC"
          value="{id}"
          on:change="{onChangeIC}"
        />
        <label class="button" for="radioic{id}" title="{localize(tooltip)}"
          ><i class="{icon}"></i></label
        >
      {/each}
    </div>
    <hr />
    <b>Out of Combat Types</b>
    <div>
      {#each ooc as { id, tooltip, icon }}
        <input
          type="radio"
          bind:group="{$currentOOC}"
          id="radioooc{id}"
          name="currentOOC"
          value="{id}"
          on:change="{onChangeOOC}"
        />
        <label class="button" for="radioooc{id}" title="{localize(tooltip)}"
          ><i class="{icon}"></i></label
        >
      {/each}
    </div>
    <div>
      <hr />
      <b>Canvas Options</b>
      <hr />
      <input
        name="limitcanvas"
        id="limitcanvas"
        type="checkbox"
        bind:checked="{$clampCanvas}"
      />
      <label
        class="button"
        title="{localize('obs-utils.strings.limitCanvas')}"
        for="limitcanvas"><i class="fas fa-arrows-maximize"></i></label
      >
    </div>
    <div>
      <hr />
      <b>Tracked Player</b>
      <hr />
      <select
        bind:value="{$currentTrackedPlayer}"
        name="trackedPlayer"
        id="trackedPlayer"
        on:change="{onChangePlayer}"
      >
        {#each players as { id, name }}
          <option value="{id}">{name}</option>
        {/each}
      </select>
    </div>
  </main>
</ApplicationShell>

<style>
  input {
    opacity: 0;
    position: fixed;
    width: 0;
  }

  label.button {
    background-color: #ddd;
    width: 40px;
    height: 40px;
    display: inline-flex;
    border: 2px solid #444;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
  }

  label i {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
  }

  label:hover {
    background-color: #dfd;
  }

  input:checked + label {
    background-color: #bfb;
    border-color: #4c4;
  }
</style>
