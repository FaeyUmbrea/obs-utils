<script lang="ts">
  export let data: any;
  export let style: string;
  export let componentIndex: number;
</script>

<div class="component plain-text-component" id={'component' + componentIndex.toString()} {style}>
  {data}
</div>
