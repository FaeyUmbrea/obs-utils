<script lang="ts">
  import { OverlayData } from '../utils/stream';
  import OverlayEditorTab from './components/OverlayEditorTab.svelte';
  import InformationOverlay from './components/InformationOverlay.svelte';
  import { getSetting } from '../utils/settings';

  export let overlays: Array<OverlayData>;
  export let actorValues: Array<string>;
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
      <nav class="tabs" data-group="primary-tabs">
        {#each overlays as overlay, index (overlays.indexOf(overlay))}
          <!-- svelte-ignore a11y-missing-attribute -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <a class="item {index == activeIndex ? 'active' : ''}" data-tab={index} on:click={() => changeTab(index)}
            ><i class="fas fa-dice-d20" />{index}</a
          >
        {/each}
      </nav>
      <button class="add" type="button" on:click={() => handleAdd()}><i class="fas fa-plus" /></button>
    </div>
    <hr />
    <section class="content">
      {#each overlays as overlay, index (overlays.indexOf(overlay))}
        <div class="tab {index == activeIndex ? 'active' : ''}" data-tab={index} data-group="primary-tabs">
          <OverlayEditorTab
            bind:components={overlay.components}
            removeFn={handleRemove}
            componentindex={index}
            {actorValues}
          />
        </div>
      {/each}
    </section>
  </div>
</div>
<footer>
  <hr />
  <button class="submit" type="submit">Submit</button>
</footer>
