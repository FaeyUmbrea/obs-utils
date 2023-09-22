<script>
  import { getActorValues } from "../../../utils/helpers";

  import Select from "svelte-select";

  export let data = "";
  let av1, av2, icon1, icon2;
  let values = getActorValues();
  let items = [...values];

  let filterText = "";

  function onChange() {
    data = `${av1};${icon1};${av2};${icon2}`;
  }

  function handleFilter(e) {
    if (e.detail.length === 0 && filterText.length > 0) {
      items = [...values, filterText];
    }
  }

  function getSplit() {
    av1 = data.split(";")[0];
    icon1 = data.split(";")[1];
    av2 = data.split(";")[2];
    icon2 = data.split(";")[3];
    return "";
  }
</script>

{#key data}
  {getSplit()}
{/key}
<div class="input">
  <Select
    --height="30px"
    bind:filterText="{filterText}"
    bind:justValue="{av1}"
    closeListOnChange="false"
    floatingConfig="{{
      strategy: 'fixed',
    }}"
    items="{items}"
    on:filter="{handleFilter}"
    value="{av1}"
    on:change="{onChange}"
  />
  <input type="text" on:change="{onChange}" bind:value="{icon1}" />
  <Select
    --height="30px"
    bind:filterText="{filterText}"
    bind:justValue="{av2}"
    closeListOnChange="false"
    floatingConfig="{{
      strategy: 'fixed',
    }}"
    items="{items}"
    on:filter="{handleFilter}"
    value="{av2}"
    on:change="{onChange}"
  />
  <input type="text" on:change="{onChange}" bind:value="{icon2}" />
</div>

<style lang="stylus">
  .input {
    display grid;
    grid-column-start span 2;
    grid-template-columns 5fr 2fr;
    grid-template-rows auto auto;
  }
  input {
    padding-left: 10px;
    height: 100%;
    width: 100%;
    font-size: 16px;
    font-family: inherit;
    border: 1px solid #d8dbdf;
    border-radius: 6px;
    background: white;
  }
</style>
