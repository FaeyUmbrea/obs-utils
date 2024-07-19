<script>
  import { get, has } from "lodash-es";
  import { onDestroy } from "svelte";
  import { removeQuotes } from "../../../utils/helpers.js";

  export let data = "";
  export let actorID;
  export let style;
  export let componentIndex;

  let actor = game.actors?.get(actorID);

  let value1 = "";
  let value2 = "";
  let hook = Hooks.on("obs-utils.refreshActor", (changedactor) => {
    if (changedactor.id !== actorID) return;
    actor = changedactor;
    getValue();
  });

  function getValue() {
    let path1 = data.split(";")[0];
    let hasValue1 = has(actor, path1);
    if (hasValue1) {
      value1 = get(actor, path1, "");
    } else {
      value1 = path1 !== undefined && path1 !== null ? removeQuotes(path1) : "";
    }
    let path2 = data.split(";")[1];
    let hasValue2 = has(actor, path2);
    if (hasValue2) {
      value2 = get(actor, path2, "");
    } else {
      value2 = path2 !== undefined && path2 !== null ? removeQuotes(path2) : "";
    }
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
  class="component actor-val-component progress-bar-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  <progress value="{value1}" max="{value2}"></progress>
</div>
