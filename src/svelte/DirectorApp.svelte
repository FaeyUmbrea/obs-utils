<script>
    export let ic;
    export let ooc;
    export let players;
</script>

    <b>In Combat Type</b>
    <div>
        {#each ic as { id, tooltip, icon }}
        <input type="radio" id="radioic{id}" name="ic" value="{id}" />
        <label for="radioic{id}" title="{tooltip}"><i class="{icon}"></i></label>
        {/each}
    </div>
    <hr>
    <b>Out of Combat Types</b>
    <div>
        {#each ooc as { id, tooltip, icon }}
        <input type="radio" id="radioooc{id}" name="ooc" value="{id}" />
        <label for="radioooc{id}" title="{tooltip}"><i class="{icon}"></i></label>
        {/each}
    </div>
    <div>
    <hr>
    <b>Tracked Player</b>
    <hr>
    <select name="trackedPlayer">
        {#each players as { id, name }}
        <option value="{id}">{name}</option>
        {/each}
    </select>
    </div>