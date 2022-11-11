<script lang="ts">
  import { OverlayData } from "../utils/stream";
  import OverlayEditorTab from "./components/OverlayEditorTab.svelte";
  import InformationOverlay from "./InformationOverlay.svelte";


  export let overlays: Array<OverlayData>;
  export let actorIDs: Array<string>;
  export let hooks: Array<number>;

    function handleRemove(index: number){
        overlays = [
            ...overlays.slice(0,index),
            ...overlays.slice(index+1,overlays.length)
        ]
    }

    function handleAdd (){
        overlays = overlays.concat(new OverlayData());
    }
</script>
<div class="grid">
<div class="preview">
    <InformationOverlay overlays={overlays} actorIDs={actorIDs} bind:hooks={hooks}/>
</div>

<div class="editor">
    <nav class="tabs" data-group="primary-tabs">
        {#each overlays as {type}, index }
            <!-- svelte-ignore a11y-missing-attribute -->
            <a class="item" data-tab={index}><i class="fas fa-dice-d20"></i>{type}</a>
        {/each}
        <button class="add" type="button" on:click={() => handleAdd()}><i class="fas fa-plus" /></button>
    </nav>
    <section class="content">
        {#each overlays as {type, components}, index }
        <div class="tab flexcol" data-tab={index} data-group="primary-tabs">
            <OverlayEditorTab bind:components={components} />
        </div>
        {/each}
    </section>
    <footer>
        <hr>
        <button class="submit" type="submit">Submit</button>
    </footer>
</div>
</div>
