import OBSRemote from '../svelte/OBSRemote.svelte';
import { getSetting, OBSRemoteSettings, setSetting } from '../utils/settings';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OBSRemoteApplication extends FormApplication<any, any, any> {
  component: OBSRemote | undefined;
  settings: OBSRemoteSettings = new OBSRemoteSettings();
  useWebsocket = false;

  protected async _updateObject(event: Event, formData?: object | undefined) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    console.warn(this.settings);
    console.warn(await setSetting('obsRemote', this.settings));
  }

  getData() {
    this.useWebsocket = getSetting('enableOBSWebsocket');
    this.settings = getSetting('obsRemote');
    // To make sure that newly added fields work after updating
    this.settings = mergeObject(new OBSRemoteSettings(), this.settings);
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['obsremote'],
      template: DICECTOR_TEMPLATE,
      id: 'obsremote-application',
      title: 'OBS Remote Settings',
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 700,
      resizeable: true,
    }) as FormApplicationOptions;
  }

  protected async _renderInner(data: any): Promise<JQuery<HTMLElement>> {
    const html = await super._renderInner(data);
    this.component = new OBSRemote({
      target: html.get(0) as Element,
      props: {
        useWebSocket: this.useWebsocket,
        settings: this.settings,
      },
    });
    return html;
  }
}
