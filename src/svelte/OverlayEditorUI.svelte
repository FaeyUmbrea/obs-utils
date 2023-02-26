<script lang="ts">
  import { OverlayData } from '../utils/stream';
  import OverlayEditorTab from './components/OverlayEditorTab.svelte';
  import InformationOverlay from './components/PerActorOverlay.svelte';
  import { getSetting } from '../utils/settings';

  export let overlays: Array<OverlayData>;
  let actorIDs = getSetting('overlayActors');

  let activeIndex: number = 0;

  function handleRemove(index: number) {
    overlays.splice(index, 1);
    // Make Svelte Rerender
    overlays = overlays;
    if (activeIndex == index) {
      activeIndex = Math.max(0, index - 1);
    }
  }

  function handleAdd() {
    overlays.push(new OverlayData());
    // Make Svelte Rerender
    overlays = overlays;
  }

  function changeTab(tab: number) {
    activeIndex = tab;
  }
</script>

<div class="grid">
  <div class="preview">
    <InformationOverlay {overlays} {actorIDs} />
  </div>

  <div class="editor">
    <div class="nav-with-add-button">
      <button class="add" type="button" title="Add new Overlay" on:click={() => handleAdd()}
        ><i class="fas fa-plus" /></button
      >
      <nav class="tabs" data-group="primary-tabs">
        {#each overlays as overlay, index (overlays.indexOf(overlay))}
          <!-- svelte-ignore a11y-missing-attribute -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <a class="item {index === activeIndex ? 'active' : ''}" data-tab={index} on:click={() => changeTab(index)}
            >{index}</a
          >
        {/each}
      </nav>
    </div>
    <hr />
    <section class="content">
      {#each overlays as overlay, index (overlays.indexOf(overlay))}
        <div class="tab {index === activeIndex ? 'active' : ''}" data-tab={index} data-group="primary-tabs">
          <OverlayEditorTab bind:overlay removeFn={handleRemove} componentindex={index} />
        </div>
      {/each}
    </section>
  </div>
</div>
<hr />
<footer>
  <button class="submit" type="submit">Submit</button>
</footer>
