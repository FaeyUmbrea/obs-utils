import OverlayActorSelectUi from '../svelte/OverlayActorSelectUI.svelte';
import { getGame } from '../utils/helpers';
import { getSetting, setSetting } from '../utils/settings';
import '../less/actorselect.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OverlayActorSelect extends FormApplication {
  component;
  async _updateObject(event, formData) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    delete (formData).search;
    const data = (Object.values(expandObject(formData))).filter((entry) => entry != null);
    setSetting('overlayActors', data);
  }

  getData() {
    return getSetting('overlayActors');
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['actorselect'],
      template: DICECTOR_TEMPLATE,
      id: 'actorselect-application',
      title: 'Actor Selection',
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 300,
      width: 200,
      resizable: true,
    });
  }

  async _renderInner(data) {
    const html = await super._renderInner(data);
    const actors = getGame().actors;
    let actorArray = undefined;
    if (actors instanceof Actors) {
      actorArray = Array.from(actors.values());
    }
    this.component = new OverlayActorSelectUi({
      target: html.get(0),
      props: {
        selectedActors: data,
        actors: actorArray,
      },
    });
    return html;
  }
}
