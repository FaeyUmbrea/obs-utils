<script>
  export let ic;
  export let ooc;
  export let players;
  export let currentIC;
  export let currentOOC;
  export let currentTrackedPlayer;
  export let onChangeIC;
  export let onChangeOOC;
  export let onChangePlayer;
</script>

<b>In Combat Type</b>
<div>
  {#each ic as { id, tooltip, icon }}
    <input type="radio" bind:group={currentIC} id="radioic{id}" name="currentIC" value={id} on:change={onChangeIC} />
    <label for="radioic{id}" title={tooltip}><i class={icon} /></label>
  {/each}
</div>
<hr />
<b>Out of Combat Types</b>
<div>
  {#each ooc as { id, tooltip, icon }}
    <input
      type="radio"
      bind:group={currentOOC}
      id="radioooc{id}"
      name="currentOOC"
      value={id}
      on:change={onChangeOOC}
    />
    <label for="radioooc{id}" title={tooltip}><i class={icon} /></label>
  {/each}
</div>
<div>
  <hr />
  <b>Tracked Player</b>
  <hr />
  <select name="trackedPlayer" bind:value={currentTrackedPlayer} on:change={onChangePlayer}>
    {#each players as { id, name }}
      <option value={id}>{name}</option>
    {/each}
  </select>
</div>
