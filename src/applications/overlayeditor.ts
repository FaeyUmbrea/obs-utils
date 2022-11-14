import type { OverlayData } from '../utils/stream';
import OverlayEditorUI from '../svelte/OverlayEditorUI.svelte';
import { getSetting, setSetting } from '../utils/settings';
import '../less/overlayeditor.less';
import { getFontawesomeVariables, getGame, propertiesToArray } from '../utils/helpers';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OverlayEditor extends FormApplication<any, any, any> {
  component: OverlayEditorUI | undefined;
  dataArray: Array<OverlayData> = new Array<OverlayData>();
  protected async _updateObject(event: Event, formData?: object | undefined) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    await setSetting('streamOverlays', this.dataArray);
  }

  getData() {
    this.dataArray = getSetting('streamOverlays');
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['overlayeditor'],
      template: DICECTOR_TEMPLATE,
      id: 'overlayeditor-application',
      title: 'Overlay Editor',
      //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 400,
      width: 700,
      resizable: true,
    }) as FormApplicationOptions;
  }

  protected async _renderInner(data: any): Promise<JQuery<HTMLElement>> {
    const html = await super._renderInner(data);
    const actorValues = propertiesToArray(getGame().actors?.find((e) => e.type == 'character'));
    this.component = new OverlayEditorUI({
      target: html.get(0) as Element,
      props: {
        overlays: this.dataArray,
        actorValues: actorValues,
      },
    });
    return html;
  }
}
