import OverlayRenderer from '../svelte/OverlayRenderer.svelte';
import { getGame } from './helpers';
import '../less/overlayrenderer.less';

export class OverlayData {
  type: string;
  components: Array<OverlayComponentData>;
  style: string;
  constructor(type = 'sl', components: Array<OverlayComponentData> = [], style = '') {
    this.type = type;
    this.components = components;
    this.style = style;
  }
}

export class OverlayComponentData {
  type: string;
  data: any;
  style: string;

  constructor(type = 'pt', data: any = '', style = '') {
    this.type = type;
    this.data = data;
    this.style = style;
  }
}

export function renderOverlays() {
  const _game = getGame();
  if (_game.actors instanceof Actors) {
    new OverlayRenderer({
      target: $('body').get(0) as Element,
    });
  }
}
