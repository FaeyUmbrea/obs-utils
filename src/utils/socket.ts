/* global socketlib */

import { getCurrentUser, viewportChanged } from './canvas';
import { ID } from './const';
import { isOBS } from './obs';

let modulesocket: any;

Hooks.once('socketlib.ready', () => {
  modulesocket = socketlib.registerModule(ID);

  modulesocket.register('viewport', changeViewport);
});

function changeViewport(viewport: Canvas.View, userId: string) {
  if (!isOBS()) return;
  viewportChanged(viewport, userId);
}

export function socketCanvas(_canvas: Canvas, position: Canvas.View) {
  modulesocket.executeForOthers('viewport', position, getCurrentUser());
}
