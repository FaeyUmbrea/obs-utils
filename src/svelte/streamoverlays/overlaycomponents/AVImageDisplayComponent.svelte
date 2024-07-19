<script>
  import { get, has } from "lodash-es";
  import { onDestroy } from "svelte";
  import { removeQuotes } from "../../../utils/helpers.js";

  export let data = "";
  export let actorID = void 0;
  export let style;
  export let componentIndex;

  let actor = game.actors?.get(actorID);

  let value = "";
  let hook = Hooks.on("obs-utils.refreshActor", (changedactor) => {
    if (changedactor.id !== actorID) return;
    actor = changedactor;
    getValue();
  });

  function getValue() {
    let hasValue = has(actor, data);
    if (hasValue) {
      value = get(actor, data, "");
    } else {
      value = data !== undefined && data !== null ? removeQuotes(data) : "";
    }
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
  class="component actor-val-component image-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  <img alt="actor value img renderer" src="{value}" />
</div>
