/* global socketlib */

import { getCurrentUser, scaleToFit, tokenMoved, viewportChanged } from './canvas.mjs';
import { ID, mode } from './const.mjs';
import { isOBS } from './obs.mjs';
import { getSetting } from './settings.mjs';

let modulesocket;

Hooks.once('socketlib.ready', () => {
  modulesocket = socketlib.registerModule(ID);

  modulesocket.register('viewport', changeViewport);
  modulesocket.register('modechange', changeMode);
});

function changeViewport(viewport, userId) {
  if (isOBS()) viewportChanged(viewport, userId);
}

export async function changeMode() {
  if (!isOBS()) return;
  //Using an object to avoid reading Settings every time a token moves
  mode.normal = await getSetting('defaultOutOfCombat');
  mode.combat = await getSetting('defaultInCombat');
  mode.trackedPlayer = await getSetting('trackedUser');
  scaleToFit();
  tokenMoved();
}

export function socketCanvas(_canvas, position) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}

export function updateSettings() {
  modulesocket.executeForOthers('modechange');
}
