/* global socketlib */

import { getCurrentUser, scaleToFit, viewportChanged } from './canvas.mjs';
import { ID, mode } from './const.mjs';
import { isOBS } from './obs.mjs';
import { getSetting, setSetting } from './settings.mjs';

let modulesocket;

Hooks.once('socketlib.ready', () => {
  modulesocket = socketlib.registerModule(ID);

  modulesocket.register('viewport', changeViewport);
  modulesocket.register('modechange', changeMode);
  modulesocket.register('cloneTarget', changeCloneTarget);
});

function changeViewport(viewport, userId) {
  if (isOBS()) viewportChanged(viewport, userId);
}

function changeCloneTarget(target) {
  if (isOBS()) {
    mode.trackedPlayer = target;
  }
}

export async function changeMode() {
  //Using an object to avoid reading Settings every time a token moves
  mode.normal = await getSetting('defaultOutOfCombat');
  mode.combat = await getSetting('defaultInCombat');
  scaleToFit();
}

export async function sendMode(isInCombat, newmode) {
  if (isInCombat) await setSetting('defaultInCombat', newmode);
  else await setSetting('defaultOutOfCombat', newmode);
  modulesocket.executeForOthers('modechange');
}

export async function sendTrack(playerID) {
  if (game.user.isGM) modulesocket.executeForOthers('cloneTarget', playerID);
}

export function socketCanvas(_canvas, position) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}
