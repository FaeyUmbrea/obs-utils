<script lang="ts">
  import type { PlainTextComponentData } from "../../../utils/stream";

  export let overlayData:PlainTextComponentData;
  export let actors:Array<Actor>;
</script>

{overlayData.getData(actors)}