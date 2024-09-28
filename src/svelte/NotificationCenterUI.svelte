<svelte:options accessors="{true}" />

<script>
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { setSetting } from "../utils/settings.js";
  import { onDestroy } from "svelte";
  import { slide } from "svelte/transition";

  export let notifications;
  export let links;
  export let elementRoot = void 0;
  let news = notifications[0];
  let cutoffDate = new Date().toISOString();

  function openLink(uri) {
    window.open(uri, "_blank").focus();
  }
  function setNews(id) {
    news = notifications.find((notification) => notification.id === id);
  }
  onDestroy(() => {
    setSetting("lastReadNotification", cutoffDate);
  });
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    <div class="newsBox">
      <div class="newsSelect">
        {#each notifications as notification}
          <div
            class="{notification.id === news.id ? 'selected' : ''} select"
            role="none"
            on:click="{() => setNews(notification.id)}"
          >
            <span>
              {notification.title}
            </span>
            <span class="date">
              {#if notification.date_updated != null}
                {new Date(notification.date_updated).toLocaleDateString()}
              {:else}
                {new Date(notification.date_created).toLocaleDateString()}
              {/if}
            </span>
          </div>
        {/each}
      </div>
      <div class="newsDisplay">
        {#key news}
          <div transition:slide="{{ duration: 200, axis: 'y' }}">
            <div class="title">
              {news.title}
            </div>
            <div class="news">
              {news.message}
            </div>
          </div>
        {/key}
      </div>
    </div>
    <div class="links">
      {#each links as { url, title }}
        <button on:click="{() => openLink(url)}">{title}</button>
      {/each}
    </div>
  </main>
</ApplicationShell>

<style lang="sass">
  main
    display: grid
    grid-template-rows: auto 36px
    height: 100%
  
  .newsBox
    display: grid 
    grid-template-columns: 200px auto
    height: 100%
    max-height: 100%
    overflow: hidden
    gap: 4px
  
  .newsSelect
    display: flex
    flex-direction: column
    gap: 4px
    
  .selected
    background-color: #00000010
    border-style: solid!important
    
  .select
    cursor: pointer
    width: calc(100% - 10px)
    height: 50px
    border: 1px black dashed
    border-radius: 5px
    padding: 3px
    overflow: hidden
    display: grid
    row-gap: 10px
    span
      width: 100%
      overflow: hidden
      text-wrap: nowrap
      text-overflow: ellipsis
    .date
      color: dimgrey
      text-align: end

  .news
    font-size: 17px
  
  .title
    display: flex
    vertical-align: middle
    height: 30px
    justify-content: center
    font-size: 22px
    
  .links
    display: flex
</style>
