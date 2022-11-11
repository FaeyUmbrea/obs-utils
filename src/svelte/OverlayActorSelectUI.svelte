<script lang="ts">
    export let selectedActors: Array<string>;
    export let actors: Array<Actor> = Array<Actor>();
</script>

<div>
    <ul>
        {#each actors as actor}
            <input value={actor.id} type="checkbox" id={actor.id} name={actor.id} checked={(actor.id? selectedActors.includes(actor.id):false)} />
            <label for={actor.id}><img src={actor.img} alt={actor.name}/><p>{actor.name}</p></label>
        {/each}
    </ul>
</div>

<footer><button>Submit</button></footer>