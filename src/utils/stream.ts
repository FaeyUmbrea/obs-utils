import OverlayRenderer from '../svelte/OverlayRenderer.svelte';
import { getGame } from './helpers';
import '../less/overlayrenderer.less';

export enum ComponentType {
  PLAINTEXT = 'Plain Text',
  FAICON = 'Font Awesome Icon',
  ACTORVAL = 'Actor Value',
}

export enum OverlayType {
  SINGLELINE = 'Single Line',
}

export class OverlayData {
  type: OverlayType;
  components: Array<OverlayComponentData>;
  style: string;
  constructor(type: OverlayType = OverlayType.SINGLELINE, components: Array<OverlayComponentData> = [], style = '') {
    this.type = type;
    this.components = components;
    this.style = style;
  }
}

export class OverlayComponentData {
  type: ComponentType;
  data: any;
  style: string;

  constructor(type: ComponentType = ComponentType.PLAINTEXT, data: any = '', style = '') {
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
