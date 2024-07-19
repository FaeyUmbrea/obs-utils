import { ID as moduleID } from "./const";
import OBSRemoteApplication from "../applications/obsremote.js";
import OBSWebsocketApplication from "../applications/obswebsocket.js";
import OverlayActorSelect from "../applications/overlayactorselect.js";
import OverlayEditor from "../applications/overlayeditor.js";
import DirectorApplication from "../applications/director.js";
import { SettingsShell } from "../applications/settingsShell.js";
import { getApi } from "./helpers.js";
import SingleLineOverlayEditor from "../svelte/components/editors/SingleLineOverlayEditor.svelte";
import AVEditor from "../svelte/components/editors/AVEditor.svelte";
import RollOverlay from "../applications/rolloverlay.js";
import { getSetting } from "./settings.js";
/**
 * @type {Array<any>}
 */
import notifications from "./notifications.json";
import NotificationCenter from "../applications/notificationCenter.js";
import MultiAVIconEditor from "../svelte/components/editors/MultiAVIconEditor.svelte";
import MultiAVEditor from "../svelte/components/editors/MultiAVEditor.svelte";

let d;

export async function openDirector(button) {
  if (!d) d = new DirectorApplication(button);
  if (!d.rendered) d.render(true);
  else d.close();
}

export function registerUI() {
  game.settings.registerMenu(moduleID, "obsRemoteMenu", {
    name: `${moduleID}.settings.obsRemoteMenu.Name`,
    label: `${moduleID}.settings.obsRemoteMenu.Label`,
    hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
    type: SettingsShell(OBSRemoteApplication),
    icon: "fas fa-bars",
    restricted: true,
  });
  game.settings.registerMenu(moduleID, "obsWebsocketMenu", {
    name: `${moduleID}.settings.obsWebsocketMenu.Name`,
    label: `${moduleID}.settings.obsWebsocketMenu.Label`,
    hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
    type: SettingsShell(OBSWebsocketApplication),
    icon: "fas fa-bars",
    restricted: true,
  });
  game.settings.registerMenu(moduleID, "overlayActorSelect", {
    name: `${moduleID}.settings.overlayActorSelect.Name`,
    label: `${moduleID}.settings.overlayActorSelect.Label`,
    hint: `${moduleID}.settings.overlayActorSelect.Hint`,
    type: SettingsShell(OverlayActorSelect),
    icon: "fas fa-bars",
    restricted: true,
  });
  game.settings.registerMenu(moduleID, "overlayEditor", {
    name: `${moduleID}.settings.overlayEditor.Name`,
    label: `${moduleID}.settings.overlayEditor.Label`,
    hint: `${moduleID}.settings.overlayEditor.Hint`,
    type: SettingsShell(OverlayEditor),
    icon: "fas fa-bars",
    restricted: true,
  });
  game.settings.registerMenu(moduleID, "rollOverlayEditor", {
    name: `${moduleID}.settings.rollOverlayEditor.Name`,
    label: `${moduleID}.settings.rollOverlayEditor.Label`,
    hint: `${moduleID}.settings.rollOverlayEditor.Hint`,
    icon: "fas fa-bars",
    type: SettingsShell(RollOverlay),
    restricted: true,
  });

  getApi()
    .overlayTypes.get("sl")
    .registerOverlayEditor(SingleLineOverlayEditor);
  getApi().overlayTypes.get("sl").registerComponentEditor("pt", AVEditor);
  getApi().overlayTypes.get("sl").registerComponentEditor("fai", AVEditor);
  getApi().overlayTypes.get("sl").registerComponentEditor("img", AVEditor);
  getApi().overlayTypes.get("sl").registerComponentEditor("bav", AVEditor);
  getApi()
    .overlayTypes.get("sl")
    .registerComponentEditor("micoav", MultiAVIconEditor, true);
  getApi()
    .overlayTypes.get("sl")
    .registerComponentEditor("mimgav", MultiAVIconEditor, true);
  getApi()
    .overlayTypes.get("sl")
    .registerComponentEditor("pb", MultiAVEditor, true);
}

export function showNotifications() {
  if (!game.user.isGM) return;
  const lastRead = getSetting("lastReadNotification");
  if (lastRead < notifications[0].id) {
    new NotificationCenter().render(true);
  }
}
