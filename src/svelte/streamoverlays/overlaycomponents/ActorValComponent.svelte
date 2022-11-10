<script lang="ts">
    import { getGame } from "../../../utils/helpers";
    import type { OverlayComponentData } from "../../../utils/stream";
    import * as _ from "lodash-es";
  
    export let overlayData:OverlayComponentData;
    export let actor:string;
    let actorObject = getGame().actors?.getName(actor)
</script>
  
{_.get(actorObject,overlayData.data,"")}