<script>
  import ObsTab from './components/OBSTab.svelte';
  import {ApplicationShell} from '@typhonjs-fvtt/runtime/svelte/component/core';
  import {getSetting, setSetting} from "../utils/settings.js";
  import {getContext} from "svelte";

  const useWebSocket = getSetting('enableOBSWebsocket');
  let obssettings = getSetting('obsRemote');

  export let elementRoot = void 0;

  let entries = Object.getOwnPropertyNames(obssettings);

  if (!useWebSocket) {
    entries = entries.filter((entry) => entry != 'onStopStreaming');
  }

  function getKey(key) {
    return key;
  }

  function formatKey(key) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').substring(2);
  }

  const context = getContext('#external');

  async function submit() {
    await setSetting('obsRemote', obssettings)
    context.application.close()
  }
</script>

<svelte:options accessors={true}/>

<ApplicationShell bind:elementRoot>
  <main>
    <nav class="tabs" data-group="primary-tabs">
      {#each entries as key}
        <!-- svelte-ignore a11y-missing-attribute -->
        <a class="item" data-tab={key}
        ><i class="fas {key === 'onStopStreaming' ? 'fa-signal-stream' : 'fa-dice-d20'}"></i> {formatKey(key)}</a
        >
      {/each}
    </nav>
    <hr/>
    <div>
      <section class="content">
        {#each entries as key}
          <div class="tab flexcol" data-tab={key} data-group="primary-tabs">
            <ObsTab bind:eventArray={obssettings[getKey(key)]} {useWebSocket}/>
          </div>
        {/each}
      </section>
      <footer>
        <hr/>
        <button class="submit" on:click={submit}>Submit</button>
      </footer>
    </div>
  </main>
</ApplicationShell>

<style>
  footer {
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    padding: 10px;
  }
</style>