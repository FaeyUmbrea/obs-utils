<script lang="ts">
  import { ComponentType, OverlayComponentData } from "../../utils/stream";
  import { fade } from "svelte/transition";


    export let component:OverlayComponentData;
    export let removeFn: any;


    const componentTypes = Object.values(ComponentType);
</script>

<li transition:fade>
    <div class="component">
        <select name="types" bind:value={component.type}>
            {#each componentTypes as component}
                <option value={component}>{component}</option>
            {/each}
        </select>
        <input name="sceneNames" bind:value={component.data} placeholder="Scene Name" />
        <button type="button" on:click={removeFn}>
            <i class="fas fa-trash"/>
        </button>
    </div>
</li>