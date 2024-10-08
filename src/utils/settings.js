import { scaleToFit, tokenMoved, viewportChanged } from "./canvas";
import {
  ICCHOICES,
  ID,
  ID as moduleID,
  NAME_TO_ICON,
  OOCCHOICES,
} from "./const";
import { isOBS } from "./helpers";
import { writable } from "svelte/store";

export const OBSAction = {
  SwitchScene: "obs-utils.applications.obsRemote.switchScene",
  ToggleSource: "obs-utils.applications.obsRemote.toggleSource",
  EnableSource: "obs-utils.applications.obsRemote.enableSource",
  DisableSource: "obs-utils.applications.obsRemote.disableSource",
};

export class OBSEvent {
  targetAction = OBSAction.SwitchScene;
  sceneName = "";
  targetName = "";
}

export class OBSWebsocketSettings {
  url = "localhost";
  port = "4455";
  password = "";
}

export class SceneLoadEvent {
  sceneName = "";
  obsActions = [];
}

export class OBSRemoteSettings {
  onLoad = [];
  onCombatStart = [];
  onCombatEnd = [];
  onPause = [];
  onUnpause = [];
  onSceneLoad = [];
  onStopStreaming = [];
}

const SETTINGS_VERSION = 2;

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
  if (version < SETTINGS_VERSION) {
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
    if (version < 2) {
      console.warn("Migrations for Data-Model Version 2");
      let obssettings = getSetting("obsRemote");
      // Code for Migration Setting Models
      obssettings = foundry.utils.mergeObject(
        new OBSRemoteSettings(),
        obssettings,
      );
      setSetting("obsRemote", obssettings);
    }
    console.warn("OBS Utils Migrations Finished");
    setSetting("settingsVersion", SETTINGS_VERSION);
  }
}

export function getSetting(settingName) {
  return game.settings.get(ID, settingName);
}

export async function setSetting(settingName, value) {
  await game.settings.set(ID, settingName, value);
}

export function generateDataBlockFromSetting() {
  const buttonData = {
    ic: [],
    ooc: [],
    players: [],
    onlineUsers: [],
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
  buttonData.onlineUsers = game.users?.filter((element) => element.active);
  return buttonData;
}

var stores = new Map();

export function registerSettings() {
  registerSetting("minScale", {
    default: 0.1,
    type: Number,
    range: {
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    scope: "world",
    config: true,
  });
  registerSetting("maxScale", {
    default: 2,
    type: Number,
    range: {
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    scope: "world",
    config: true,
  });
  registerSetting("clampCanvas", {
    default: false,
    type: Boolean,
    scope: "world",
    config: false,
  });
  registerSetting("defaultOutOfCombat", {
    default: "trackall",
    type: String,
    choices: OOCCHOICES,
    scope: "world",
    config: false,
    onChange: changeMode,
  });
  registerSetting("defaultInCombat", {
    default: "trackall",
    type: String,
    choices: ICCHOICES,
    scope: "world",
    config: false,
    onChange: changeMode,
  });
  registerSetting("popupCloseDelay", {
    default: 10,
    type: Number,
    range: {
      min: 0,
      max: 300,
      step: 1,
    },
    scope: "world",
    config: true,
  });
  registerSetting("showTrackerInCombat", {
    default: false,
    type: Boolean,
    scope: "world",
    config: true,
  });
  registerSetting("trackedUser", {
    default: game.userId,
    type: String,
    scope: "world",
    config: false,
    onChange: changeMode,
  });
  registerSetting("obsRemote", {
    type: Object,
    scope: "world",
    config: false,
    default: new OBSRemoteSettings(),
  });
  registerSetting("enableOBSWebsocket", {
    type: Boolean,
    scope: "world",
    config: true,
    default: false,
  });
  registerSetting("websocketSettings", {
    type: Object,
    scope: "client",
    config: false,
    default: new OBSWebsocketSettings(),
    onChange: () => foundry.utils.debouncedReload(),
  });
  registerSetting("streamOverlays", {
    type: Object,
    scope: "world",
    config: false,
    default: [],
  });
  registerSetting("overlayActors", {
    type: Object,
    scope: "world",
    config: false,
    default: [],
  });
  registerSetting("settingsVersion", {
    type: Number,
    scope: "world",
    config: false,
    default: 2,
  });
  registerSetting("showAV", {
    type: Boolean,
    scope: "world",
    config: true,
    default: false,
  });
  registerSetting("showUserConfig", {
    type: Boolean,
    scope: "world",
    config: true,
    default: false,
  });
  registerSetting("diceSoNice", {
    default: !!game.modules.get("dice-so-nice")?.active,
    type: Boolean,
    scope: "world",
    config: !!game.modules.get("dice-so-nice")?.active,
    requiresReload: true,
  });
  registerSetting("diceSoNiceOverlayWidth", {
    default: 500,
    type: Number,
    scope: "world",
    config: !!game.modules.get("dice-so-nice")?.active,
    requiresReload: true,
  });
  registerSetting("diceSoNiceOverlayHeight", {
    default: 500,
    type: Number,
    scope: "world",
    config: !!game.modules.get("dice-so-nice")?.active,
    requiresReload: true,
  });
  registerSetting("lastReadNotification", {
    type: String,
    scope: "client",
    config: false,
    default: "",
  });
  registerSetting("fixedPopups", {
    type: Boolean,
    scope: "world",
    config: true,
    default: false,
  });
  registerSetting("fixedPopupX", {
    type: Number,
    scope: "world",
    config: true,
    default: 1000,
  });
  registerSetting("fixedPopupY", {
    type: Number,
    scope: "world",
    config: true,
    default: 1000,
  });
  registerSetting("fixedPopupWidth", {
    type: Number,
    scope: "world",
    config: true,
    default: 1000,
  });
  registerSetting("fixedPopupHeight", {
    type: Number,
    scope: "world",
    config: true,
    default: 800,
  });
  registerSetting("obsMode", {
    default: false,
    type: Boolean,
    scope: "client",
    config: true,
    requiresReload: true,
  });
  registerSetting("obsModeUser", {
    default: "none",
    type: String,
    scope: "world",
    choices: {},
    config: true,
    requiresReload: true,
  });
  registerSetting("obsModeGlobalDisable", {
    default: false,
    type: Boolean,
    scope: "world",
    config: true,
    requiresReload: true,
  });

  registerSetting("showKeybindingPopup", {
    default: true,
    type: Boolean,
    scope: "client",
    config: true,
  });
}

export function registerOverlaySettings() {
  registerSetting("rollOverlayPreRollDelay", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayRollFadeIn", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayRollFadeOut", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayRollStay", {
    type: Number,
    scope: "world",
    config: false,
    default: 5000,
  });
  registerSetting("rollOverlayPreRollFadeIn", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayPreRollFadeOut", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayPreRollStay", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayPostRollFadeIn", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayPostRollFadeOut", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayPostRollStay", {
    type: Number,
    scope: "world",
    config: false,
    default: 0,
  });
  registerSetting("rollOverlayPreRollImage", {
    type: String,
    scope: "world",
    config: false,
    default: "",
  });
  registerSetting("rollOverlayRollBackground", {
    type: String,
    scope: "world",
    config: false,
    default: "",
  });
  registerSetting("rollOverlayRollForeground", {
    type: String,
    scope: "world",
    config: false,
    default: "",
  });
  registerSetting("rollOverlayPostRollImage", {
    type: String,
    scope: "world",
    config: false,
    default: "",
  });
  registerSetting("rollOverlayPostRollEnabled", {
    type: Boolean,
    scope: "world",
    config: false,
    default: false,
  });
  registerSetting("rollOverlayPreRollEnabled", {
    type: Boolean,
    scope: "world",
    config: false,
    default: false,
  });
}

function registerSetting(settingName, config) {
  let store;

  let debounce = false;

  function changeListener(change) {
    if (!debounce) {
      if (config.onChange) config.onChange(change);
      debounce = true;
      store?.set(change);
    }
    debounce = false;
  }

  game?.settings.register(moduleID, settingName, {
    name: `${moduleID}.settings.${settingName}.Name`,
    hint: `${moduleID}.settings.${settingName}.Hint`,
    ...config,
    onChange: changeListener,
  });

  const value =
    game?.settings.get(moduleID, settingName) ??
    config.default ??
    new config.type();

  store = writable(value);

  store.subscribe((value) => {
    if (!debounce) {
      debounce = true;
      if (game?.ready) game?.settings.set(moduleID, settingName, value);
    }
    debounce = false;
  });

  stores.set(settingName, store);
}

export function getStore(name) {
  return stores.get(name);
}
