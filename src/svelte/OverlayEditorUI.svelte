<script lang="ts">
  import { over } from "lodash";
  import { OverlayData } from "../utils/stream";
  import OverlayEditorTab from "./components/OverlayEditorTab.svelte";
  import InformationOverlay from "./InformationOverlay.svelte";


  export let overlays: Array<OverlayData>;
  export let actorIDs: Array<string>;
  export let hooks: Array<number>;

    function handleRemove(index: number){
        overlays.splice(index,1);
        // Make Svelte Rerender
        overlays = overlays;
    }

    function handleAdd (){
        overlays.push(new OverlayData());
        // Make Svelte Rerender
        overlays = overlays;
    }
</script>
<div class="grid">
<div class="preview">
    <InformationOverlay overlays={overlays} actorIDs={actorIDs} bind:hooks={hooks}/>
</div>

<div class="editor">
    <div class="nav-with-add-button">
    <nav class="tabs" data-group="primary-tabs">
        {#each overlays as {type}, index }
            <!-- svelte-ignore a11y-missing-attribute -->
            <a class="item" data-tab={index}><i class="fas fa-dice-d20"></i>{type}</a>
        {/each}
    </nav>
    <button class="add" type="button" on:click={() => handleAdd()}><i class="fas fa-plus" /></button>
    </div>
    <section class="content">
        {#each overlays as overlay, index (overlays.indexOf(overlay)) }
        <div class="tab flexcol" data-tab={index} data-group="primary-tabs">
            <OverlayEditorTab bind:components={overlay.components} removeFn={handleRemove} componentindex={index} />
        </div>
        {/each}
    </section>
    <footer>
        <hr>
        <button class="submit" type="submit">Submit</button>
    </footer>
</div>
</div>
