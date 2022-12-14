import ObsWebsocket from '../svelte/OBSWebsocket.svelte';
import { getSetting, OBSWebsocketSettings, setSetting } from '../utils/settings';
import '../less/obsremote.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OBSWebsocketApplication extends FormApplication<any, any, any> {
  component: ObsWebsocket | undefined;

  protected async _updateObject(event: Event, formData?: object | undefined) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    const data = expandObject(formData);
    setSetting('websocketSettings', data);
  }

  getData() {
    return getSetting('websocketSettings') as OBSWebsocketSettings;
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['obswebsocket'],
      template: DICECTOR_TEMPLATE,
      id: 'obswebsocket-application',
      title: 'OBS Websocket Settings',
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
    }) as FormApplicationOptions;
  }

  protected async _renderInner(data: any): Promise<JQuery<HTMLElement>> {
    const html = await super._renderInner(data);
    this.component = new ObsWebsocket({
      target: html.get(0) as Element,
      props: {
        websocketSettings: data,
      },
    });
    return html;
  }
}
