<svelte:options accessors="{true}" />

<script>
  import { ApplicationShell } from "#runtime/svelte/component/application";
  import { generateDataBlockFromSetting, settings } from "../utils/settings.js";
  import { localize } from "#runtime/util/i18n";

  let { ic, ooc, players } = generateDataBlockFromSetting();
  let currentIC = settings.getStore("defaultInCombat");
  let currentOOC = settings.getStore("defaultOutOfCombat");
  let currentTrackedPlayer = settings.getStore("trackedUser");
  let clampCanvas = settings.getStore("clampCanvas");
  let pauseCameraTracking = settings.getStore("pauseCameraTracking");

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
    <b>{localize("obs-utils.applications.director.icTypeHeader")}</b>
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
    <b>{localize("obs-utils.applications.director.oocTypeHeader")}</b>
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
      <b>{localize("obs-utils.applications.director.canvasOptionsHeader")}</b>
      <hr />
      <input
        name="limitCanvas"
        id="limitCanvas"
        type="checkbox"
        bind:checked="{$clampCanvas}"
      />
      <label
        class="button"
        title="{localize('obs-utils.strings.limitCanvas')}"
        for="limitCanvas"><i class="fas fa-arrows-maximize"></i></label
      >
      <input
        name="pauseCameraTracking"
        id="pauseCameraTracking"
        type="checkbox"
        bind:checked="{$pauseCameraTracking}"
      />
      <label
        class="button"
        title="{localize('obs-utils.strings.pauseCameraTracking')}"
        for="pauseCameraTracking"><i class="fas fa-pause"></i></label
      >
    </div>
    <div>
      <hr />
      <b>{localize("obs-utils.applications.director.trackedPlayerHeader")}</b>
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
