import OverlayRenderer from '../svelte/OverlayRenderer.svelte';
import { getGame } from './helpers';
import '../less/overlayrenderer.less';

export class OverlayData {
  type
  components
  style
  constructor(type = 'sl', components = [], style = '') {
    this.type = type;
    this.components = components;
    this.style = style;
  }
}

export class OverlayComponentData {
  type;
  data;
  style;

  constructor(type = 'pt', data = '', style = '') {
    this.type = type;
    this.data = data;
    this.style = style;
  }
}

export function renderOverlays() {
  const _game = getGame();
  if (_game.actors instanceof Actors) {
    new OverlayRenderer({
      target: $('body').get(0),
    });
  }
}
