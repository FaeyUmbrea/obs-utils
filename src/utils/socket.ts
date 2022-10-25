/* global socketlib */

import { getCurrentUser, viewportChanged } from './canvas';
import { ID } from './const';
import { isOBS } from './obs';
import { setSetting } from './settings';

let modulesocket: any;

Hooks.once('socketlib.ready', () => {
  modulesocket = socketlib.registerModule(ID);

  modulesocket.register('viewport', changeViewport);
  modulesocket.register('obssettings', changeOBSSettings);
});

function changeOBSSettings(settings: OBSWebsocketSettings): void {
  setSetting('websocketSettings', settings);
}

export function sendOBSSetting(user: string, settings: OBSWebsocketSettings): void {
  modulesocket.executeAsUser('websocketSettings', user, settings);
}

function changeViewport(viewport: Canvas.View, userId: string) {
  if (!isOBS()) return;
  viewportChanged(viewport, userId);
}

export function socketCanvas(_canvas: Canvas, position: Canvas.View) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}
