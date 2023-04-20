import {ID as moduleID} from './const';
import OBSRemoteApplication from '../applications/obsremote.js';
import OBSWebsocketApplication from '../applications/obswebsocket.js';
import OverlayActorSelect from '../applications/overlayactorselect.js';
import OverlayEditor from '../applications/overlayeditor.js';
import DirectorApplication from "../applications/director.js";
import {SettingsShell} from "../applications/settingsShell.js";
import {getApi} from "./helpers.js";
import SingleLineOverlayEditor from "../svelte/components/editors/SingleLineOverlayEditor.svelte";
import PlainEditor from "../svelte/components/editors/PlainEditor.svelte";
import AVEditor from "../svelte/components/editors/AVEditor.svelte";
import RollOverlay from "../applications/rolloverlay.js";

let d;

function buildButtons(buttons) {
    if (!game.user?.isGM) return;
    const buttonGroup = buttons.find((element) => element.name === 'token');
    const newButton = {
        icon: 'fa-solid fa-signal-stream',
        name: 'openStreamDirector',
        title: 'Open Stream Director',
        toggle: true,
        onClick: () => openDirector(newButton),
    };
    buttonGroup?.tools.push(newButton);
}

async function openDirector(button) {
    if (!d) d = new DirectorApplication(button);
    if (!d.rendered) d.render(true);
    else d.close();
}

export async function registerUI() {
    game.settings.registerMenu(moduleID, 'obsRemoteMenu', {
        name: `${moduleID}.settings.obsRemoteMenu.Name`,
        label: `${moduleID}.settings.obsRemoteMenu.Label`,
        hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
        type: SettingsShell(OBSRemoteApplication),
        icon: 'fas fa-bars',
        restricted: true,
    });
    game.settings.registerMenu(moduleID, 'obsWebsocketMenu', {
        name: `${moduleID}.settings.obsWebsocketMenu.Name`,
      label: `${moduleID}.settings.obsWebsocketMenu.Label`,
      hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
      type: SettingsShell(OBSWebsocketApplication),
      icon: 'fas fa-bars',
      restricted: true,
  });
  game.settings.registerMenu(moduleID, 'overlayActorSelect', {
      name: `${moduleID}.settings.overlayActorSelect.Name`,
      label: `${moduleID}.settings.overlayActorSelect.Label`,
      hint: `${moduleID}.settings.overlayActorSelect.Hint`,
      type: SettingsShell(OverlayActorSelect),
      icon: 'fas fa-bars',
      restricted: true,
  });
    game.settings.registerMenu(moduleID, 'overlayEditor', {
        name: `${moduleID}.settings.overlayEditor.Name`,
        label: `${moduleID}.settings.overlayEditor.Label`,
        hint: `${moduleID}.settings.overlayEditor.Hint`,
        type: SettingsShell(OverlayEditor),
        icon: 'fas fa-bars',
        restricted: true,
    });
    game.settings.registerMenu(moduleID, 'rollOverlayEditor', {
        name: `${moduleID}.settings.rollOverlayEditor.Name`,
        label: `${moduleID}.settings.rollOverlayEditor.Label`,
        hint: `${moduleID}.settings.rollOverlayEditor.Hint`,
        icon: 'fas fa-bars',
        type: SettingsShell(RollOverlay),
        restricted: true,
    })

    Hooks.on('getSceneControlButtons', buildButtons);

    getApi().overlayTypes.get("sl").registerOverlayEditor(SingleLineOverlayEditor);
    getApi().overlayTypes.get("sl").registerComponentEditor('pt', PlainEditor);
    getApi().overlayTypes.get("sl").registerComponentEditor('fai', PlainEditor);
    getApi().overlayTypes.get("sl").registerComponentEditor('img', PlainEditor);
    getApi().overlayTypes.get("sl").registerComponentEditor('av', AVEditor);
    getApi().overlayTypes.get("sl").registerComponentEditor('bav', AVEditor);
    getApi().overlayTypes.get("sl").registerComponentEditor('iav', AVEditor);
}
