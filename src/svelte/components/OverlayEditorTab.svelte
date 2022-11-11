<script lang="ts">
  import { OverlayComponentData, type OverlayType } from "../../utils/stream";
  import OverlayComponentEditor from "./OverlayComponentEditor.svelte";


    export let components:Array<OverlayComponentData>;

        function handleRemove(index: number){
            components = [
            ...components.slice(0,index),
            ...components.slice(index+1,components.length)
        ]
    }

    function handleAdd (){
        components = components.concat(new OverlayComponentData());
    }
</script>

<button class="add" type="button" on:click={() => handleAdd()}><i class="fas fa-plus" /></button>
    <div class="scroll">
    <ul>
        {#each components as component, index (components.indexOf(component)) }
            <OverlayComponentEditor bind:component={component}  removeFn={()=>handleRemove(index)} />
        {/each}
    </ul>
    </div>