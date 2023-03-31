import OBSRemote from '../svelte/OBSRemote.svelte';
import { getSetting, OBSRemoteSettings, setSetting } from '../utils/settings';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OBSRemoteApplication extends FormApplication {
  component;
  settings = new OBSRemoteSettings();
  useWebsocket = false;

  async _updateObject(event, formData) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    console.warn(this.settings);
    console.warn(await setSetting('obsRemote', this.settings));
  }

  getData() {
    this.useWebsocket = getSetting('enableOBSWebsocket');
    this.settings = getSetting('obsRemote');
    // Code for Migration Setting Models
    this.settings = mergeObject(new OBSRemoteSettings(), this.settings);
    delete this.settings['onCloseObs'];
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['obsremote'],
      template: DICECTOR_TEMPLATE,
      id: 'obsremote-application',
      title: 'OBS Remote Settings',
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 700,
      resizeable: true,
    }) ;
  }

  async _renderInner(data) {
    const html = await super._renderInner(data);
    this.component = new OBSRemote({
      target: html.get(0),
      props: {
        useWebSocket: this.useWebsocket,
        settings: this.settings,
      },
    });
    return html;
  }
}
