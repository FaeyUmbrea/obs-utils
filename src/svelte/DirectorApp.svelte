<svelte:options accessors="{true}" />

<style>
    input[type="radio"] {
        opacity: 0;
        position: fixed;
        width: 0;
    }

    label {
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

    input[type="radio"]:checked + label {
        background-color: #bfb;
        border-color: #4c4;
    }
</style>

<script>
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import {
    generateDataBlockFromSetting,
    getSetting,
    setSetting
  } from "../utils/settings.js";

  let { ic, ooc, players } = generateDataBlockFromSetting();
  let currentIC = getSetting("defaultInCombat");
  let currentOOC = getSetting("defaultOutOfCombat");
  let currentTrackedPlayer = getSetting("trackedUser");

  async function onChangeIC(event) {
    await setSetting("defaultInCombat", event.target.value);
  }

  async function onChangeOOC(event) {
    await setSetting("defaultOutOfCombat", event.target.value);
  }

  async function onChangePlayer(event) {
    await setSetting("trackedUser", event.target.value);
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
          bind:group="{currentIC}"
          id="radioic{id}"
          name="currentIC"
          value="{id}"
          on:change="{onChangeIC}" />
        <label for="radioic{id}" title="{tooltip}"
        ><i class="{icon}"></i></label>
      {/each}
    </div>
    <hr />
    <b>Out of Combat Types</b>
    <div>
      {#each ooc as { id, tooltip, icon }}
        <input
          type="radio"
          bind:group="{currentOOC}"
          id="radioooc{id}"
          name="currentOOC"
          value="{id}"
          on:change="{onChangeOOC}" />
        <label for="radioooc{id}" title="{tooltip}"
        ><i class="{icon}"></i></label>
      {/each}
    </div>
    <div>
      <hr />
      <b>Tracked Player</b>
      <hr />
      <select
        bind:value="{currentTrackedPlayer}"
        name="trackedPlayer"
        on:change="{onChangePlayer}">
        {#each players as { id, name }}
          <option value="{id}">{name}</option>
        {/each}
      </select>
    </div>
  </main>
</ApplicationShell>
