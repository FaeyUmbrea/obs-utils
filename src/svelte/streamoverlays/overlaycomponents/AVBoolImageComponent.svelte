<script>
  import { get } from "lodash-es";
  import { onDestroy } from "svelte";

  export let data;
  export let actorID;
  export let style;
  export let componentIndex;

  let actor = game.actors?.get(actorID);

  let value = "";
  let image1 = "";
  let image2 = "";
  let hook = Hooks.on("obs-utils.refreshActor", (actor) => {
    if (actor.id !== actorID) return;
    getValue();
  });

  function getValue() {
    value = get(actor, data.split(";")[0], "");
    image1 = data.split(";")[1] ?? "fa-solid fa-check";
    image2 = data.split(";")[2] ?? "fa-solid fa-x";
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
  class="component actor-val-component bool-component image-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  {#if !!value && image1 !== ""}
    <img alt="actor value img renderer" src="{image1}" />
  {:else if !value && image2 !== ""}
    <img alt="actor value img renderer" src="{image2}" />
  {/if}
</div>
