<script>
  import { getActorValues } from "../../../utils/helpers";

  import Select from "svelte-select";

  export let data;
  let values = getActorValues();
  let items = [...values];

  let filterText = "";

  function handleFilter(e) {
    if (e.detail.length === 0 && filterText.length > 0) {
      items = [...values, filterText];
    }
  }
</script>

<Select
  containerStyles="background-color: white;"
  --height="30px"
  bind:filterText="{filterText}"
  bind:justValue="{data}"
  closeListOnChange="false"
  floatingConfig="{{
    strategy: 'fixed',
  }}"
  items="{items}"
  on:filter="{handleFilter}"
  value="{data}"
/>
