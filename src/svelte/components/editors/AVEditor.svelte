<script>
  import { getActorValues } from '../../../utils/helpers';

  export let data;
  const actorValues = getActorValues();

  async function getSvelecte() {
    return (await import('svelecte')).default;
  }
</script>

{#await getSvelecte() then Svelecte}
  <svelte:component
    this={Svelecte}
    options={actorValues}
    inputId={'data'}
    bind:value={data}
    labelAsValue={true}
    creatable={true}
    allowEditing={true}
    creatablePrefix=""
  />
{/await}
