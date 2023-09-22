<script>
  import { get } from "lodash-es";
  import { onDestroy } from "svelte";

  export let data = "";
  export let actorID = void 0;
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
  class="component actor-val-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  <img alt="actor value img renderer" src="{value}" />
</div>
