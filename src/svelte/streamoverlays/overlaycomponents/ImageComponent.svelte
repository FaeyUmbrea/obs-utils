<script>
  export let data;
  export let style;
  export let componentIndex;
</script>

<div
  class="component plain-text-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  <img alt="Component" src="{data}" />
</div>
