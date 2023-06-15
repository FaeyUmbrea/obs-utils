import ObsWebsocket from "../svelte/OBSWebsocket.svelte";
import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";

export default class OBSWebsocketApplication extends SvelteApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["obswebsocket"],
      id: "obswebsocket-application",
      title: "OBS Websocket Settings",
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".content",
          initial: "onLoad"
        }
      ],
      svelte: {
        class: ObsWebsocket,
        target: document.body
      }
    });
  }
}
