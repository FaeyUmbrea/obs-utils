import OverlayActorSelectUi from "../svelte/OverlayActorSelectUI.svelte";
import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";

export default class OverlayActorSelect extends SvelteApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["actorselect"],
      id: "actorselect-application",
      title: "Actor Selection",
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".content",
          initial: "onLoad",
        },
      ],
      height: 300,
      width: 200,
      resizable: true,
      svelte: {
        class: OverlayActorSelectUi,
        target: document.body,
      },
    });
  }
}
