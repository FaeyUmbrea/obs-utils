import { isOBS } from "./utils/helpers.js";
import { initOBS } from "./utils/obs.js";
import { ObsUtilsApi, registerDefaultTypes } from "./utils/api.js";
import {
  registerOverlaySettings,
  registerSettings,
  runMigrations,
} from "./utils/settings.js";
import { expandTokenHud, isGM } from "./utils/canvas.js";
import { socketCanvas } from "./utils/socket.js";

function start() {
  Hooks.once("init", async function () {
    // Register API
    const moduleData = game?.modules?.get("obs-utils");
    if (moduleData) {
      moduleData.api = new ObsUtilsApi();
      registerDefaultTypes();
      Hooks.call("obs-utils.init");
    }

    registerSettings();
    registerOverlaySettings();

    // Load UI Component only on /game
    if (game.view === "game") {
      const ui = await import("./utils/ui.js");
      ui.registerUI();

      // Show notifications panel if UI is loaded
      Hooks.once("ready", () => ui.showNotifications());
    }

    // Load OBS Stuff only in OBS
    if (isOBS()) {
      initOBS();
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

    // Update obsModeUser choice list once usernames are available
    game.settings.settings.get("obs-utils.obsModeUser").choices =
      Object.fromEntries(game.users.map((e) => [e.id, e.name]));
  });

  Hooks.on("canvasPan", socketCanvas);

  // Register updateActor for System agnostic default. This allows for custom and system-specific actor refresh triggers.
  Hooks.on("updateActor", (actor) =>
    Hooks.call("obs-utils.refreshActor", actor),
  );

  Hooks.on("getSceneControlButtons", buildButtons);
}
start();

function buildButtons(buttons) {
  if (!game.user?.isGM) return;
  const buttonGroup = buttons.find((element) => element.name === "token");
  const newButton = {
    icon: "fa-solid fa-signal-stream",
    name: "openStreamDirector",
    title: "Open Stream Director",
    toggle: true,
    onClick: async () => {
      const ui = await import("./utils/ui.js");
      await ui.openDirector(newButton);
    },
  };
  buttonGroup?.tools.push(newButton);
}
