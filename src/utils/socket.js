import { getCurrentUser, viewportChanged, VIEWPORT_DATA } from './canvas';
import { ID } from './const';
import { isOBS } from './helpers';
import { setSetting } from './settings';

let modulesocket;

Hooks.once('socketlib.ready', () => {
  modulesocket = window.socketlib.registerModule(ID);

  modulesocket.register('viewport', changeViewport);
  modulesocket.register('websocketSettings', changeOBSSettings);
});

export async function getOBSData(user) {
  return await modulesocket.executeAsUser('getOBSData', user);
}

function changeOBSSettings(settings) {
  setSetting('websocketSettings', settings);
}

export function sendOBSSetting(user, settings) {
  modulesocket.executeAsUser('websocketSettings', user, settings);
}

function changeViewport(viewport, userId) {
  if (!isOBS()) return;
  // First update the collection of viewport data
  VIEWPORT_DATA.set(userId, viewport);
  // Then immediately try to animate to that users position
  viewportChanged(userId);
}

export function socketCanvas(_canvas, position) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}
