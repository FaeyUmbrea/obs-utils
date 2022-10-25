import { getSetting, setSetting } from 'src/utils/settings';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/apps.hbs';

export default class OBSRemoteApplication extends FormApplication {
  getData() {
    return getSetting('obsRemote');
  }

  protected async _updateObject(event: Event, formData?: object | undefined) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    const data = expandObject(formData);
    await setSetting('obsRemote', data);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['obsremote'],
      template: DICECTOR_TEMPLATE,
      id: 'obsremote-application',
      title: 'OBS Remote Settings',
    });
  }
}
