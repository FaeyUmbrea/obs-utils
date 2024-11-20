<script>
  import { settings } from "../utils/settings";
  import InformationOverlay from "./streamoverlays/PerActorOverlay.svelte";
  import ExternalComponent from "./utilities/ExternalComponent.svelte";
  import { getApi } from "../utils/helpers";

  let overlays = settings.getReadableStore("streamOverlays");
  let actors = settings.getReadableStore("overlayActors");

  const singleTimeOverlays = getApi().singleInstanceOverlays;
</script>

<div class="overlay-renderer">
  <InformationOverlay actorIDs="{$actors}" overlays="{$overlays}" />
  {#each [...singleTimeOverlays] as overlay}
    <ExternalComponent externalClass="{overlay}" />
  {/each}
</div>
