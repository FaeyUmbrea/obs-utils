<script lang="ts">
    import type {OBSRemoteSettings}  from "../utils/settings";
    import ObsTab from "./components/OBSTab.svelte";

    export let useWebSocket: boolean;
    export let settings: OBSRemoteSettings;
    
    function getKey(key: string){
        return key as keyof OBSRemoteSettings
    }

</script>

    <nav class="tabs" data-group="primary-tabs">
        {#each Object.entries(settings) as [key] }
            <!-- svelte-ignore a11y-missing-attribute -->
            <a class="item" data-tab={key}><i class="fas fa-dice-d20"></i>{key}</a>
        {/each}
    </nav>
<hr>

<section class="content">
    {#each Object.entries(settings) as [key]}
    <div class="tab flexcol" data-tab={key} data-group="primary-tabs">

        <ObsTab bind:eventArray={settings[getKey(key)]} useWebSocket={useWebSocket} />
    </div>
    {/each}
</section>

<button type="submit">Submit</button>