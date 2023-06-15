<script>
  export let data;
  export let style;
  export let componentIndex;
</script>

<div
  class="component fa-icon-component"
  id="{'component' + componentIndex.toString()}"
  style="{style}"
>
  <i class="{data}"></i>
</div>
