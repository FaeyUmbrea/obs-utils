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
  constructor(type: OverlayType = OverlayType.SINGLELINE, components: Array<OverlayComponentData> = []) {
    this.type = type;
    this.components = components;
  }
}

export class OverlayComponentData {
  type: ComponentType;
  data: any;
  constructor(type: ComponentType = ComponentType.PLAINTEXT, data: any = '') {
    this.type = type;
    this.data = data;
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
