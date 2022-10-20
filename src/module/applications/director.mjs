import { getSetting, setSetting } from '../utils/settings.mjs';
import { updateSettings } from '../utils/socket.mjs';
import DirectorApp from '../../svelte/DirectorApp.svelte';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/apps.hbs';

export default class Director extends Application {
  constructor(buttonData, sidebarButton) {
    super();
    this.buttonData = buttonData;
    this.sidebarButton = sidebarButton;
  }

  getData() {
    return this.buttonData;
  }

  activateListeners(html) {
    let buttonData = this.buttonData;
    super.activateListeners();
    html.find('input[type=radio][name=ic]').change(async function () {
      var id = this.value;
      await setSetting('defaultInCombat', id);
      updateSettings();
    });
    html.find('input[type=radio][name=ooc]').change(async function () {
      var id = this.value;
      await setSetting('defaultOutOfCombat', id);
      updateSettings();
    });
    html.find('select').change(async function () {
      var id = this.value;
      await setSetting('trackedUser', id);
      updateSettings();
    });

    this.component = new DirectorApp({
      target: html.get(0),
      props: {
        ic: buttonData.ic,
        ooc: buttonData.ooc,
        players: buttonData.players,
      },
    });
  }

  _injectHTML(html) {
    html.find(`input[name=ic][value=${this.buttonData.currentIC}]`).prop('checked', true);
    html.find(`input[name=ooc][value=${this.buttonData.currentOOC}]`).prop('checked', true);
    html.find('select[name=trackedPlayer]').val(this.buttonData.currentTrackedPlayer);
    super._injectHTML(html);
  }

  render(force = false, options = {}) {
    this.buttonData.currentIC = getSetting('defaultInCombat');
    this.buttonData.currentOOC = getSetting('defaultOutOfCombat');
    this.buttonData.currentTrackedPlayer = getSetting('trackedUser');
    super.render(force, options);
    return this;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['obsdirector'],
      popOut: true,
      minimizable: true,
      width: 230,
      template: DICECTOR_TEMPLATE,
      id: 'director-application',
      title: 'Director',
    });
  }

  close() {
    super.close();
    $('[data-tool=openStreamDirector]').removeClass('active');
    this.sidebarButton.active = false;
  }
}
