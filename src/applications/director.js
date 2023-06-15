import DirectorApp from "../svelte/DirectorApp.svelte";
import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";

export default class DirectorApplication extends SvelteApplication {
  sidebarButton;

  constructor(sidebarButton) {
    super();
    this.sidebarButton = sidebarButton;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["obsdirector"],
      minimizable: true,
      width: 272,
      height: 255,
      id: "director-application",
      title: "Director",
      positionOrtho: false,
      transformOrigin: null,
      svelte: {
        class: DirectorApp,
        target: document.body,
        intro: true,
      },
    });
  }

  async close(options) {
    super.close(options);
    $("[data-tool=openStreamDirector]").removeClass("active");
    this.sidebarButton.active = false;
  }
}
