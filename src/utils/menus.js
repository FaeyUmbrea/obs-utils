import { ID as moduleID } from './const';
import OBSRemoteApplication from '../applications/obsremote.js';
import OBSWebsocketApplication from '../applications/obswebsocket.js';
import OverlayActorSelect from '../applications/overlayactorselect.js';
import OverlayEditor from '../applications/overlayeditor.js';

export async function registerMenus() {
  game.settings.registerMenu(moduleID, 'obsRemoteMenu', {
    name: `${moduleID}.settings.obsRemoteMenu.Name`,
    label: `${moduleID}.settings.obsRemoteMenu.Label`,
    hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
    type: OBSRemoteApplication,
    icon: 'fas fa-bars',
    restricted: true,
  });
  game.settings.registerMenu(moduleID, 'obsWebsocketMenu', {
    name: `${moduleID}.settings.obsWebsocketMenu.Name`,
    label: `${moduleID}.settings.obsWebsocketMenu.Label`,
    hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
    type: OBSWebsocketApplication,
    icon: 'fas fa-bars',
    restricted: true,
  });
  game.settings.registerMenu(moduleID, 'overlayActorSelect', {
    name: `${moduleID}.settings.overlayActorSelect.Name`,
    label: `${moduleID}.settings.overlayActorSelect.Label`,
    hint: `${moduleID}.settings.overlayActorSelect.Hint`,
    type: OverlayActorSelect,
    icon: 'fas fa-bars',
    restricted: true,
  });
  game.settings.registerMenu(moduleID, 'overlayEditor', {
    name: `${moduleID}.settings.overlayEditor.Name`,
    label: `${moduleID}.settings.overlayEditor.Label`,
    hint: `${moduleID}.settings.overlayEditor.Hint`,
    type: OverlayEditor,
    icon: 'fas fa-bars',
    restricted: true,
  });
}
