import OverlayActorSelectUi from '../svelte/OverlayActorSelectUI.svelte';
import { getGame } from '../utils/helpers';
import { getSetting, setSetting } from '../utils/settings';
import '../less/actorselect.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class OverlayActorSelect extends FormApplication<any, any, any> {
  component!: OverlayActorSelectUi;
  protected async _updateObject(event: Event, formData?: object | undefined) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    delete (formData as any).search;
    const data = (Object.values(expandObject(formData)) as Array<string>).filter((entry) => entry != null);
    setSetting('overlayActors', data);
  }

  getData() {
    return getSetting('overlayActors') as Array<string>;
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['actorselect'],
      template: DICECTOR_TEMPLATE,
      id: 'actorselect-application',
      title: 'Actor Selection',
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 300,
      width: 200,
      resizable: true,
    }) as FormApplicationOptions;
  }

  protected async _renderInner(data: any): Promise<JQuery<HTMLElement>> {
    const html = await super._renderInner(data);
    const actors = getGame().actors;
    let actorArray = undefined;
    if (actors instanceof Actors) {
      actorArray = Array.from(actors.values());
    }
    this.component = new OverlayActorSelectUi({
      target: html.get(0) as Element,
      props: {
        selectedActors: data,
        actors: actorArray,
      },
    });
    return html;
  }
}
