<script>
  import { get } from "lodash-es";
  import { onDestroy } from "svelte";

  export let data;
  export let actorID;
  export let style;
  export let componentIndex;

  let actor = game.actors?.get(actorID);

  let value = "";
  let hook = Hooks.on("updateActor", (actor) => {
    if (actor.id !== actorID) return;
    value = get(actor, data, "");
  });

  function getValue() {
    value = get(actor, data, "");
    return "";
  }

  onDestroy(() => {
    Hooks.off("updateActor", hook);
  });
</script>

{#key data}
  {getValue()}
{/key}
<div
  class="component actor-val-component bool-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  {#if value == true}
    <i class="fa-solid fa-check"></i>
  {:else}
    <i class="fa-solid fa-x"></i>
  {/if}
</div>
