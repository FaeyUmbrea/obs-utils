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
      Hooks.call("obsUtilsInit");
    }

    settings.init();
    rollOverlaySettings.init();

    // Load UI Component only on /game
    if (game.view === "game") {
      await (await import("./utils/ui.js")).registerUI();
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
}
start();
