<svelte:options accessors="{true}" />

<script>
  import VirtualList from "@sveltejs/svelte-virtual-list";
  import { settings } from "../utils/settings.js";
  import { getContext } from "svelte";
  import { ApplicationShell } from "#runtime/svelte/component/application";
  import { localize } from "#runtime/util/i18n";

  let selectedActors = settings.getStore("overlayActors");

  let actors = game.actors;
  export let elementRoot = void 0;

  let searchTerm = "";

  $: filteredActors = actors.filter(
    (item) => item.name?.indexOf(searchTerm) !== -1,
  );
  const context = getContext("#external");

  async function submit() {
    await context.application.close();
  }

  function change(id) {
    let actors = $selectedActors;
    if (actors.includes(id)) {
      actors = actors.filter((e) => e !== id);
    } else {
      actors.push(id);
    }
    $selectedActors = actors;
  }
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <main>
    <input
      bind:value="{searchTerm}"
      name="search"
      type="text"
      placeholder="{localize(
        'obs-utils.applications.actorSelect.searchPlaceholder',
      )}"
    />

    <VirtualList itemHeight="{50}" items="{filteredActors}" let:item>
      <div>
        <input
          checked="{item.id ? $selectedActors.includes(item.id) : false}"
          id="{item.id}"
          name="{item.id}"
          on:change="{change(item.id)}"
          type="checkbox"
          value="{item.id}"
        />
        <label for="{item.id}"
          ><img alt="{item.name}" src="{item.img}" />
          <span>{item.name}</span></label
        >
      </div>
    </VirtualList>

    <footer>
      <button on:click="{submit}"
        >{localize("obs-utils.applications.actorSelect.closeButton")}</button
      >
    </footer>
  </main>
</ApplicationShell>

<style lang="stylus">
  main {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 35px auto 35px;

    input[type='checkbox'] {
      opacity: 0;
      position: fixed;
      width: 0;
    }

    label {
      width: 100%;
      height: 50px;
      display: inline-flex;
      border: 2px solid #444;
      align-items: center;
      border-radius: 4px;
    }

    img {
      height: inherit;
    }

    label:hover {
      background-color: rgba(0 0 0 10%);
    }

    input[type='checkbox']:checked + label {
      background-color: rgba(0 0 0 20%);
      border-color: rgba(0 0 0 37.8%);
    }

    footer {
      position: absolute;
      width: 100%;
      bottom: 0;
      left: 0;
      padding: 10px;
    }
  }
</style>
