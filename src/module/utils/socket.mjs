/* global socketlib */

import { getCurrentUser, viewportChanged } from './canvas.mjs';
import { ID } from './const.mjs';
import { isOBS } from './obs.mjs';

let modulesocket;

Hooks.once('socketlib.ready', () => {
  modulesocket = socketlib.registerModule(ID);

  modulesocket.register('viewport', changeViewport);
});

function changeViewport(viewport, userId) {
  if (!isOBS()) return;
  viewportChanged(viewport, userId);
}

export function socketCanvas(_canvas, position) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}
