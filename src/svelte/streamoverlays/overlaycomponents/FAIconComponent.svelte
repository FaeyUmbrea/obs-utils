<script lang="ts">
  export let data: string;
  export let style: string;
  export let componentIndex: number;
</script>

<div class="component fa-icon-component" id={componentIndex.toString()} {style}>
  <i class={data} />
</div>
