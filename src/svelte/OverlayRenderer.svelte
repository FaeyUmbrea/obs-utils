<script lang="ts">
  import { onDestroy } from "svelte";
  import { getSetting } from "../utils/settings";
  import InformationOverlay from "./components/InformationOverlay.svelte";


    let overlays = getSetting('streamOverlays');
    let actors = getSetting('overlayActors');

    let hook = Hooks.on('updateSetting', (setting: Setting, change:any) => {
        if(setting.key == "obs-utils.streamOverlays"){
            overlays = JSON.parse(change.value)
        }
        else if (setting.key == "obs-utils.overlayActors"){
            actors = JSON.parse(change.value)
        }
    })

    onDestroy(() => {
        Hooks.off('updateSettings', hook);
    })
</script>


<InformationOverlay additionalClasses={"overlay-renderer"} overlays={overlays} actorIDs={actors}/>
