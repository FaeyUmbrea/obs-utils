<svelte:options accessors="{true}" />

<script>
  import { generateDataBlockFromSetting, getSetting, setSetting } from "../utils/settings.js";
  import { getContext, onDestroy } from "svelte";
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { sendOBSSetting } from "../utils/socket.js";

  let websocketSettings = getSetting("websocketSettings");
  export let elementRoot = void 0;

  const context = getContext("#external");

  async function submit() {
    await setSetting("websocketSettings", websocketSettings);
    context.application.close();
  }

  let { onlineUsers } = generateDataBlockFromSetting();
  let currentTrackedPlayer = game?.user.id;

  let hook = Hooks.on('userConnected',_=>{
    onlineUsers  = generateDataBlockFromSetting().onlineUsers;
    if(onlineUsers.find(element => element.id === currentTrackedPlayer) === undefined){
      currentTrackedPlayer = game?.user.id;
    }
  })

  onDestroy(() => {
    Hooks.off("userConnected", hook);
  });
  
  function sync(){
    sendOBSSetting(currentTrackedPlayer,websocketSettings)
  }
  
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    <hr />
    <div class="flexcol">
      URL:<input bind:value="{websocketSettings.url}" name="url" type="text" />
      <br />
      Port:
      <input bind:value="{websocketSettings.port}" name="port" type="number" />
      <br />
      Password:
      <input
        bind:value="{websocketSettings.password}"
        name="password"
        type="password"
      />
      <hr />
      <button on:click="{submit}" type="submit">Save</button>
      <hr/>
      Sync to Client:
      <div>
        <select
          bind:value="{currentTrackedPlayer}"
          name="trackedPlayer"
          id="trackedPlayer"
        >
          {#each onlineUsers as { id, name }}
            <option value="{id}">{name}</option>
          {/each}
        </select>
        <br />
        <button on:click="{sync}" type="submit">Sync</button>
      </div>
    </div>
  </main>
</ApplicationShell>
