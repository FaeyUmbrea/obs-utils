<script lang="ts">
  import type { OBSRemoteSettings } from '../utils/settings';
  import ObsTab from './components/OBSTab.svelte';

  export let useWebSocket: boolean;
  export let settings: OBSRemoteSettings;

  let entries = Object.getOwnPropertyNames(settings);

  if (!useWebSocket) {
    entries = entries.filter((entry) => entry != 'onStopStreaming');
  }

  function getKey(key: string) {
    return key as keyof OBSRemoteSettings;
  }

  function formatKey(key: string) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').substring(2);
  }
</script>

<nav class="tabs" data-group="primary-tabs">
  {#each entries as key}
    <!-- svelte-ignore a11y-missing-attribute -->
    <a class="item" data-tab={key}
      ><i class="fas {key == 'onStopStreaming' ? 'fa-signal-stream' : 'fa-dice-d20'}" /> {formatKey(key)}</a
    >
  {/each}
</nav>
<hr />
<div>
  <section class="content">
    {#each entries as key}
      <div class="tab flexcol" data-tab={key} data-group="primary-tabs">
        <ObsTab bind:eventArray={settings[getKey(key)]} {useWebSocket} />
      </div>
    {/each}
  </section>
  <footer>
    <hr />
    <button class="submit" type="submit">Submit</button>
  </footer>
</div>
