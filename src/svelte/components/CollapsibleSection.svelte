<script>
  import { slide } from "svelte/transition";

  export let collapsed = true;
  export let title = "Section";
  export let editableTitle = false;

  function click() {
    collapsed = !collapsed;
  }
</script>

<div class="collapsable-section">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <section class="header" on:click="{click}">▼{#if editableTitle}<input type="text" bind:value={title}/>{:else}<span>{title}</span>{/if}▼</section>
  {#if !collapsed}
    <section class="{`content`}" in:slide out:slide>
      <slot />
    </section>
  {/if}
</div>

<style lang="sass">
  .header
    display: flex
    border: #2b2d42 1px solid
    border-radius: 5px
    background: #00000040
    vertical-align: middle
    height: 30px
    justify-content: center
    font-size: 22px

    span
      vertical-align: middle
      text-align: center
      width: 100%

  .header:hover
    background: #00000060

  .content
    display: block
    margin: 9px 1%


</style>
