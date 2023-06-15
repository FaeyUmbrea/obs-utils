<svelte:options accessors="{true}" />

<script>
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import notifications from "../utils/notifications.json";
  import CollapsibleSection from "./components/CollapsibleSection.svelte";
  import { setSetting } from "../utils/settings.js";
  import { onDestroy } from "svelte";

  export let elementRoot = void 0;

  function openLink(uri) {
    window.open(uri, "_blank").focus();
  }
  onDestroy(() => {
    setSetting("lastReadNotification", notifications[0].id);
  });
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    {#each notifications as notification, index}
      <CollapsibleSection
        title="{notification.title}"
        collapsed="{!(index <= 0)}"
      >
        <div class="news">
          {#each notification.text as block}
            <p>{block}</p>
          {/each}
          <br />
          {#each notification.link as { url, title }}
            <button on:click="{() => openLink(url)}">{title}</button>
          {/each}
        </div>
      </CollapsibleSection>
    {/each}
  </main>
</ApplicationShell>

<style lang="sass">
  .news
    font-size: 17px
</style>
