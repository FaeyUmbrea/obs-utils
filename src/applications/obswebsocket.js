import ObsWebsocket from '../svelte/OBSWebsocket.svelte';
import { getSetting, OBSWebsocketSettings, setSetting } from '../utils/settings';
import '../less/obsremote.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OBSWebsocketApplication extends FormApplication {
  component;

  async _updateObject(event, formData) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    const data = expandObject(formData);
    setSetting('websocketSettings', data);
  }

  getData() {
    return getSetting('websocketSettings');
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['obswebsocket'],
      template: DICECTOR_TEMPLATE,
      id: 'obswebsocket-application',
      title: 'OBS Websocket Settings',
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      resize: true,
    });
  }

  async _renderInner(data) {
    const html = await super._renderInner(data);
    this.component = new ObsWebsocket({
      target: html.get(0),
      props: {
        websocketSettings: data,
      },
    });
    return html;
  }
}
