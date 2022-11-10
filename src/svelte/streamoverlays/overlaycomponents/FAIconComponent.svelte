<script lang="ts">
    import type { OverlayComponentData } from "../../../utils/stream";
  
    export let overlayData:OverlayComponentData;
  </script>
  
  <i class={overlayData.data}></i>