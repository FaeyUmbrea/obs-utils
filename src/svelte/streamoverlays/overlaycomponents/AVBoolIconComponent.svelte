<script>
  import { get } from "lodash-es";
  import { onDestroy } from "svelte";

  export let data;
  export let actorID;
  export let style;
  export let componentIndex;

  let actor = game.actors?.get(actorID);

  let value = "";
  let icon1 = "";
  let icon2 = "";
  let hook = Hooks.on("obs-utils.refreshActor", (actor) => {
    if (actor.id !== actorID) return;
    getValue();
  });

  function getValue() {
    value = get(actor, data.split(";")[0], "");
    icon1 = data.split(";")[1] ?? "fa-solid fa-check";
    icon2 = data.split(";")[2] ?? "fa-solid fa-x";
    return "";
  }

  onDestroy(() => {
    Hooks.off("obs-utils.refreshActor", hook);
  });
</script>

{#key data}
  {getValue()}
{/key}
<div
  class="component actor-val-component bool-component fa-icon-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  {#if !!value === true}
    <i class="{icon1}"></i>
  {:else}
    <i class="{icon2}"></i>
  {/if}
</div>
