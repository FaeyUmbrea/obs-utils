import { getSetting, setSetting } from '../utils/settings.mjs';
import { updateSettings } from '../utils/socket.mjs';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/director.hbs';

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
