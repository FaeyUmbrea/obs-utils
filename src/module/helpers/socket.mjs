/* global socketlib */

import { ID } from './consts.mjs';
import { mode, scaleToFit, viewportChanged } from './canvas.mjs';
import { isOBS } from './obs.mjs';
import { getSetting, setSetting } from './settings.mjs';

export var socket;

Hooks.once('socketlib.ready', () => {
  socket = socketlib.registerModule(ID);

  socket.register('viewport', changeViewport);
  socket.register('modechange', changeMode);
  socket.register('cloneTarget', changeCloneTarget);
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

export async function sendMode(isInCombat, mode) {
  if (isInCombat) await setSetting('defaultInCombat', mode);
  else await setSetting('defaultOutOfCombat', mode);
  socket.executeForOthers('modechange');
}

export async function sendTrack(playerID) {
  if (game.user.isGM) socket.executeForOthers('cloneTarget', playerID);
}
