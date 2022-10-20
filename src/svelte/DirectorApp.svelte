<script lang="ts">

    export let ic: Array<DirectorButtonData>;
    export let ooc: Array<DirectorButtonData>;
    export let players: StoredDocument<User>[];
    export let currentIC: string;
    export let currentOOC: string;
    export let currentTrackedPlayer: string;
    export let onChangeIC: any;
    export let onChangeOOC: any;
    export let onChangePlayer: any;
</script>

    <b>In Combat Type</b>
    <div>
        {#each ic as { id, tooltip, icon }}
        <input type=radio bind:group={currentIC} id="radioic{id}" name="currentIC" value={id} on:change={onChangeIC}>
        <label for="radioic{id}" title={tooltip}><i class={icon}></i></label>
        {/each}
    </div>
    <hr>
    <b>Out of Combat Types</b>
    <div>
        {#each ooc as { id, tooltip, icon }}
        <input type=radio bind:group={currentOOC} id="radioooc{id}" name="currentOOC" value={id} on:change={onChangeOOC}/>
        <label for="radioooc{id}" title={tooltip}><i class={icon}></i></label>
        {/each}
    </div>
    <div>
    <hr>
    <b>Tracked Player</b>
    <hr>
    <select name="trackedPlayer" bind:value={currentTrackedPlayer} on:change={onChangePlayer}>
        {#each players as { id, name }}
        <option value="{id}">{name}</option>
        {/each}
    </select>
    </div>