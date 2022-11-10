import InformationOverlay from '../svelte/InformationOverlay.svelte';
import { getGame } from './helpers';
import '../less/streamoverlay.less';

export enum ComponentType {
  PLAINTEXT = 0,
  FAICON = 1,
  ACTORVAL = 2,
}

export enum OverlayType {
  SINGLELINE = 0,
}

export class OverlayData {
  type: OverlayType;
  components: Array<OverlayComponentData>;
  constructor(type: OverlayType = 0, components: Array<OverlayComponentData> = []) {
    this.type = type;
    this.components = components;
  }
}

export class OverlayComponentData {
  type: ComponentType;
  data: any;
  constructor(type: ComponentType = 0, data: any = {}) {
    this.type = type;
    this.data = data;
  }
}

export function renderOverlays() {
  const _game = getGame();
  if (_game.actors instanceof Actors) {
    const overlay = new OverlayData();
    const component = new OverlayComponentData(ComponentType.FAICON, 'fa-solid fa-signal-stream');
    overlay.components.push(component);
    const component2 = new OverlayComponentData(ComponentType.PLAINTEXT, 'Hello there~');
    overlay.components.push(component2);
    const overlays = new Array<OverlayData>();
    overlays.push(overlay);
    const players = _game.actors.filter((actor) => actor.hasPlayerOwner).map((actor) => actor.id);
    const render = new InformationOverlay({
      target: $('body').get(0) as Element,
      props: {
        overlays: overlays,
        actors: players,
      },
    });
  }
}
