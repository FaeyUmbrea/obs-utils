<script lang="ts">
    import { get } from "lodash-es";
    import { getGame } from "../../../utils/helpers";
  
    export let data:string;
    export let actorID:string;
    export let hooks:Array<number>;


    let actor = getGame().actors?.get(actorID);
    let value = get(actor, data, "");

    hooks.push(Hooks.on('updateActor', (actor:Actor)=>{
        if(actor.id != actorID) return;
        value = get(actor, data, "");
    }));
</script>
  
{#key getGame().actors}
    {value}   
{/key} 

