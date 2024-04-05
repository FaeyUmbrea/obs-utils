import { expandTokenHud, isGM } from "./utils/canvas.js";
import {
  rollOverlaySettings,
  runMigrations,
  settings,
} from "./utils/settings.js";
import { socketCanvas } from "./utils/socket.js";
import { isOBS } from "./utils/helpers.js";
import { ObsUtilsApi, registerDefaultTypes } from "./utils/api.js";

function start() {
  Hooks.once("init", async function () {
    // Register API
    const moduleData = game?.modules?.get("obs-utils");
    if (moduleData) {
      moduleData.api = new ObsUtilsApi();
      registerDefaultTypes();
      Hooks.call("obs-utils.init");
    }

    settings.init();
    rollOverlaySettings.init();

    // Load UI Component only on /game
    if (game.view === "game") {
      const ui = await import("./utils/ui.js");
      await ui.registerUI();

      // Show notifications panel if UI is loaded
      Hooks.once("ready", () => ui.showNotifications());
    }

    // Load OBS Stuff only in OBS
    if (isOBS()) {
      await (await import("./utils/obs.js")).initOBS();
    }
  });

  Hooks.once("ready", async function () {
    if (isGM()) {
      Hooks.on("renderTokenHUD", expandTokenHud);
      runMigrations();
    }
    if (isOBS()) {
      //Simulate a user interaction to start video playback
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    }
  });

  Hooks.on("canvasPan", socketCanvas);

  // Register updateActor for System agnostic default. This allows for custom and system-specific actor refresh triggers.
  Hooks.on("updateActor", (actor) =>
    Hooks.call("obs-utils.refreshActor", actor),
  );
}
start();
