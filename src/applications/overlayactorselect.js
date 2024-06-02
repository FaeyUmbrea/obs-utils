import OverlayActorSelectUi from "../svelte/OverlayActorSelectUI.svelte";
import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";
import { getStore } from "../utils/settings.js";

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
      width: 400,
      resizable: true,
      svelte: {
        class: OverlayActorSelectUi,
        target: document.body,
      },
    });
  }
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    buttons.unshift({
      icon: "fas fa-rotate",
      title: "Reset",
      label: "Reset",

      onPress: function () {
        getStore("overlayActors").set([]);
      },
    });
    return buttons;
  }
}
