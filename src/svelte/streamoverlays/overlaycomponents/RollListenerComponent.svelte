<script>
  // This is to decouple the roll listener from the actual component

  import { onDestroy } from "svelte";
  import PlayerRollComponent from "./PlayerRollComponent.svelte";

  export let id;
  let rollShow = false;

  let rollValue;
  let hook = Hooks.on("createChatMessage", (e) => {
    const uid = e.user.id;
    if (uid === id && e.whisper.length === 0) {
      rollValue = e.roll?.total;
      rollShow = false;
      rollShow = true;
    }
  });

  onDestroy(() => {
    Hooks.off("createChatMessage", hook);
  });
</script>

<PlayerRollComponent
  bind:postRollShow="{rollShow}"
  bind:preRollShow="{rollShow}"
  bind:rollShow="{rollShow}"
  bind:rollValue="{rollValue}"
  id="{id}"
/>
