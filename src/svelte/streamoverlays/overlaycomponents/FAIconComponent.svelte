<script lang="ts">
    import type { FAIconComponentData } from "../../../utils/stream";
  
    export let overlayData:FAIconComponentData;
    export let actors:Array<Actor>;
  </script>
  
  <i class={overlayData.getData(actors)}></i>