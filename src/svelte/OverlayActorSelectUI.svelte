<script lang="ts">
    export let selectedActors: Array<string>;
    export let actors: Array<Actor>;
</script>

<div>
    <select name="selectedActor" bind:value={selectedActors} multiple>
        {#each actors as actor}
            <option value={actor.id}></option>
        {/each}
    </select>
</div>