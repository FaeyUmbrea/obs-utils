import InformationOverlay from '../svelte/InformationOverlay.svelte';
import { getGame } from './helpers';
import '../less/streamoverlay.less';

export interface OverlayData {
  get backgroundImage(): string;
  get components(): Array<TextOverlayComponentData>;
}

export class TextOverlayData implements OverlayData {
  backgroundImage = '';
  components: Array<TextOverlayComponentData> = new Array<TextOverlayComponentData>();
}

export interface TextOverlayComponentData {
  getData(options: any): string;
  setData(newData: string): void;
}

export class PlainTextComponentData implements TextOverlayComponentData {
  protected _data = '';

  getData(_options: any): string {
    return this._data;
  }
  setData(newData: string): void {
    this._data = newData;
  }
}

export class PlayerInfoComponentData extends PlainTextComponentData {
  getData(options: Actor): string {
    return options[this._data as keyof Actor] as string;
  }
  setData(newData: string): void {
    this._data = newData;
  }
}

export class FAIconComponentData implements TextOverlayComponentData {
  private _data = '';

  getData(_options: any): string {
    return this._data;
  }
  setData(newData: string) {
    this._data = newData;
  }
}

export function renderOverlays() {
  const _game = getGame();
  if (_game.actors instanceof Actors) {
    const overlay = new TextOverlayData();
    const component = new FAIconComponentData();
    component.setData('fa-solid fa-signal-stream');
    overlay.components.push(component);
    const component2 = new PlainTextComponentData();
    component2.setData('Hello there~');
    overlay.components.push(component2);
    const overlays = new Array<OverlayData>();
    overlays.push(overlay);
    const players = _game.actors.filter((actor) => actor.hasPlayerOwner).map((actor) => actor as Actor);
    const render = new InformationOverlay({
      target: $('body').get(0) as Element,
      props: {
        overlays: overlays,
        actors: players,
      },
    });
  }
}
