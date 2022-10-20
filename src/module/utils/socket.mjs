/* global socketlib */

import { getCurrentUser, scaleToFit, tokenMoved, viewportChanged } from './canvas.mjs';
import { ID } from './const.mjs';
import { isOBS } from './obs.mjs';

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
  scaleToFit();
  tokenMoved();
}

export function socketCanvas(_canvas, position) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}

export function updateSettings() {
  modulesocket.executeForOthers('modechange');
}
