export interface OverlayData {
  get backgroundImage(): string;
  get components(): Array<OverlayComponent>;
}

export class SimpleTextOverlayData implements OverlayData {
  backgroundImage = '';
  components: Array<OverlayComponent> = new Array<OverlayComponent>();
}

export interface OverlayComponent {
  getData(options: any): string;
  setData(newData: string): void;
}

export class PlayerCharacterDataComponent implements OverlayComponent {
  private _data = '';

  getData(options: Actor): string {
    return options[this._data as keyof Actor] as string;
  }
  setData(newData: string): void {
    this._data = newData;
  }
}

export class PlainTextComponent implements OverlayComponent {
  private _data = '';

  getData(options: any): string {
    return this._data;
  }
  setData(newData: string): void {
    this._data = newData;
  }
}
