import ObsWebsocket from "../svelte/OBSWebsocket.svelte";
import { SvelteApplication } from "#runtime/svelte/application";

export default class OBSWebsocketApplication extends SvelteApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["obswebsocket"],
      id: "obswebsocket-application",
      title: "obs-utils.applications.obsWebsocket.name",
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".content",
          initial: "onLoad",
        },
      ],
      svelte: {
        class: ObsWebsocket,
        target: document.body,
      },
    });
  }
}
