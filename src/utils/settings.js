import { scaleToFit, tokenMoved, viewportChanged } from "./canvas";
import { ICCHOICES, ID as moduleID, NAME_TO_ICON, OOCCHOICES } from "./const";
import { isOBS } from "./helpers";
import { TJSGameSettings } from "@typhonjs-fvtt/runtime/svelte/store/fvtt/settings";

export const OBSAction = {
  SwitchScene: "Switch Scene",
  ToggleSource: "Toggle Source",
  EnableSource: "Enable Source",
  DisableSource: "Disable Source",
};

export class OBSEvent {
  targetAction = OBSAction.SwitchScene;
  sceneName = "";
  targetName = "";
}

export class OBSWebsocketSettings {
  url = "";
  port = "";
  password = "";
}

export class OBSRemoteSettings {
  onLoad = [];
  onCombatStart = [];
  onCombatEnd = [];
  onPause = [];
  onUnpause = [];
  onStopStreaming = [];
}

function getGM() {
  return game.users?.find((user) => user.isGM);
}

async function changeMode() {
  if (!isOBS()) return;
  //Trigger modes after mode change, calling the methods avoids doing every conditional twice
  scaleToFit();
  tokenMoved();
  viewportChanged(getSetting("trackedUser"));
  const firstGM = getGM()?.id;
  if (firstGM) viewportChanged(firstGM);
}

export function runMigrations() {
  const version = getSetting("settingsVersion");
  if (version < 1) {
    console.warn("Running OBS Utils Migrations");
    if (version < 1) {
      console.warn("Migrations for Data-Model Version 1");
      let obssettings = getSetting("obsRemote");
      // Code for Migration Setting Models
      obssettings = foundry.utils.mergeObject(
        new OBSRemoteSettings(),
        obssettings,
      );
      delete obssettings["onCloseObs"];
      setSetting("obsRemote", obssettings);
    }
    console.warn("OBS Utils Migrations Finished");
    setSetting("settingsVersion", 1);
  }
}

export function getSetting(settingName) {
  return game.settings.get("obs-utils", settingName);
}

export async function setSetting(settingName, value) {
  await game.settings.set("obs-utils", settingName, value);
}

export function generateDataBlockFromSetting() {
  const buttonData = {
    ic: [],
    ooc: [],
    players: [],
  };

  for (const [key, value] of Object.entries(ICCHOICES)) {
    buttonData.ic.push({
      icon: NAME_TO_ICON[key],
      tooltip: value,
      id: key,
    });
  }
  for (const [key, value] of Object.entries(OOCCHOICES)) {
    buttonData.ooc.push({
      icon: NAME_TO_ICON[key],
      tooltip: value,
      id: key,
    });
  }
  buttonData.players = game.users?.filter((element) => !element.isGM);
  return buttonData;
}

class OBSUtilsSettings extends TJSGameSettings {
  constructor() {
    super("obs-utils");
  }

  init() {
    const settings = [];

    settings.push(
      createSetting("minScale", {
        default: 0.1,
        type: Number,
        range: {
          min: 0.01,
          max: 5,
          step: 0.01,
        },
        scope: "world",
        config: true,
      }),
    );
    settings.push(
      createSetting("maxScale", {
        default: 2,
        type: Number,
        range: {
          min: 0.01,
          max: 5,
          step: 0.01,
        },
        scope: "world",
        config: true,
      }),
    );
    settings.push(
      createSetting("defaultOutOfCombat", {
        default: "trackall",
        type: String,
        choices: OOCCHOICES,
        scope: "world",
        config: false,
        onChange: changeMode,
      }),
    );
    settings.push(
      createSetting("defaultInCombat", {
        default: "trackall",
        type: String,
        choices: ICCHOICES,
        scope: "world",
        config: false,
        onChange: changeMode,
      }),
    );
    settings.push(
      createSetting("popupCloseDelay", {
        default: 10,
        type: Number,
        range: {
          min: 1,
          max: 300,
          step: 1,
        },
        scope: "world",
        config: true,
      }),
    );
    settings.push(
      createSetting("showTrackerInCombat", {
        default: false,
        type: Boolean,
        scope: "world",
        config: true,
      }),
    );
    settings.push(
      createSetting("trackedUser", {
        default: game.userId,
        type: String,
        scope: "world",
        config: false,
        onChange: changeMode,
      }),
    );
    settings.push(
      createSetting("obsRemote", {
        type: Object,
        scope: "world",
        config: false,
        default: new OBSRemoteSettings(),
      }),
    );
    settings.push(
      createSetting("enableOBSWebsocket", {
        type: Boolean,
        scope: "world",
        config: true,
        default: false,
      }),
    );
    settings.push(
      createSetting("websocketSettings", {
        type: Object,
        scope: "world",
        config: false,
        default: new OBSWebsocketSettings(),
      }),
    );
    settings.push(
      createSetting("streamOverlays", {
        type: Object,
        scope: "world",
        config: false,
        default: [],
      }),
    );
    settings.push(
      createSetting("overlayActors", {
        type: Object,
        scope: "world",
        config: false,
        default: [],
      }),
    );
    settings.push(
      createSetting("settingsVersion", {
        type: Number,
        scope: "world",
        config: false,
        default: 0,
      }),
    );
    settings.push(
      createSetting("showAV", {
        type: Boolean,
        scope: "world",
        config: true,
        default: false,
      }),
    );
    settings.push(
      createSetting("lastReadNotification", {
        type: Number,
        scope: "client",
        config: false,
        default: 0,
      }),
    );
    this.registerAll(settings, true);
  }
}

class RollOverlaySettings extends TJSGameSettings {
  constructor() {
    super("obs-utils");
  }

  init() {
    const settings = [];

    settings.push(
      createSetting("rollOverlayPreRollDelay", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayRollFadeIn", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayRollFadeOut", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayRollStay", {
        type: Number,
        scope: "world",
        config: true,
        default: 5000,
      }),
    );
    settings.push(
      createSetting("rollOverlayPreRollFadeIn", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayPreRollFadeOut", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayPreRollStay", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayPostRollFadeIn", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayPostRollFadeOut", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayPostRollStay", {
        type: Number,
        scope: "world",
        config: true,
        default: 0,
      }),
    );
    settings.push(
      createSetting("rollOverlayPreRollImage", {
        type: String,
        scope: "world",
        config: true,
        default: "",
      }),
    );
    settings.push(
      createSetting("rollOverlayRollBackground", {
        type: String,
        scope: "world",
        config: true,
        default: "",
      }),
    );
    settings.push(
      createSetting("rollOverlayRollForeground", {
        type: String,
        scope: "world",
        config: true,
        default: "",
      }),
    );
    settings.push(
      createSetting("rollOverlayPostRollImage", {
        type: String,
        scope: "world",
        config: true,
        default: "",
      }),
    );
    settings.push(
      createSetting("rollOverlayPostRollEnabled", {
        type: Boolean,
        scope: "world",
        config: true,
        default: false,
      }),
    );
    settings.push(
      createSetting("rollOverlayPreRollEnabled", {
        type: Boolean,
        scope: "world",
        config: true,
        default: false,
      }),
    );
    this.registerAll(settings, false);
  }
}

function createSetting(settingName, config) {
  return {
    namespace: moduleID,
    key: settingName,
    options: {
      name: `${moduleID}.settings.${settingName}.Name`,
      hint: `${moduleID}.settings.${settingName}.Hint`,
      ...config,
    },
  };
}

export const settings = new OBSUtilsSettings();
export const rollOverlaySettings = new RollOverlaySettings();
