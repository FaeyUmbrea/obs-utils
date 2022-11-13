<script lang="ts">
    import { get } from "lodash-es";
  import { onDestroy } from "svelte";
    import { getGame } from "../../../utils/helpers";
  
    export let data:string;
    export let actorID:string;

    let actor = getGame().actors?.get(actorID);

    let value:any = "";
    let hook:number = Hooks.on('updateActor', (actor:Actor)=>{
        if(actor.id != actorID) return;
        value = get(actor, data, "");
    })

    function getValue(){
        value = get(actor, data, "");
        return ""
    }

    onDestroy(() => {
        Hooks.off('updateActor', hook);
    })
</script>
{#key data}
    {getValue()} 
{/key}
{value}
  


