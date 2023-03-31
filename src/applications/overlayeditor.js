import { getSetting, setSetting } from '../utils/settings';
import '../less/overlayeditor.less';
import OverlayEditorUI from '../svelte/OverlayEditorUI.svelte';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OverlayEditor extends FormApplication {
  dataArray = [];
  async _updateObject(_event, formData) {
    if (formData === undefined) throw new Error('Form Data Empty');
    await setSetting('streamOverlays', this.dataArray);
  }

  getData() {
    this.dataArray = getSetting('streamOverlays');
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['overlayeditor'],
      template: DICECTOR_TEMPLATE,
      id: 'overlayeditor-application',
      title: 'Overlay Editor',
      //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 600,
      width: 1000,
      resizable: true,
    });
  }

  async _renderInner(data){
    const html = await super._renderInner(data);
    new OverlayEditorUI({
      target: html.get(0),
      props: {
        overlays: this.dataArray,
      },
    });
    return html;
  }
}
