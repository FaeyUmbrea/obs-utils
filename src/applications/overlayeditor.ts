import type { OverlayData } from '../utils/stream';
import { getSetting, setSetting } from '../utils/settings';
import '../less/overlayeditor.less';
import OverlayEditorUI from '../svelte/OverlayEditorUI.svelte';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OverlayEditor extends FormApplication<any, any, any> {
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
      height: 600,
      width: 1000,
      resizable: true,
    }) as FormApplicationOptions;
  }

  protected async _renderInner(data: any): Promise<JQuery<HTMLElement>> {
    const html = await super._renderInner(data);
    new OverlayEditorUI({
      target: html.get(0) as Element,
      props: {
        overlays: this.dataArray,
      },
    });
    return html;
  }
}
