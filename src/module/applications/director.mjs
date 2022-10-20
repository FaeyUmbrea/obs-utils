import { generateDataBlockFromSetting, getSetting, setSetting } from '../utils/settings.mjs';
import DirectorApp from '../svelte/DirectorApp.svelte';
import { updateSettings } from '../utils/socket.mjs';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/apps.hbs';

export default class Director extends Application {
  constructor(sidebarButton) {
    super();
    this.buttonData = generateDataBlockFromSetting();
    this.sidebarButton = sidebarButton;
  }

  async onChangeIC() {
    var id = this.value;
    await setSetting('defaultInCombat', id);
    updateSettings();
  }
  async onChangeOOC() {
    var id = this.value;
    await setSetting('defaultOutOfCombat', id);
    updateSettings();
  }
  async onChangePlayer() {
    var id = this.value;
    await setSetting('trackedUser', id);
    updateSettings();
  }

  activateListeners(html) {
    this.component = new DirectorApp({
      target: html.get(0),
      props: {
        ic: this.buttonData.ic,
        ooc: this.buttonData.ooc,
        players: this.buttonData.players,
        currentIC: getSetting('defaultInCombat'),
        currentOOC: getSetting('defaultOutOfCombat'),
        currentTrackedPlayer: getSetting('trackedUser'),
        onChangeIC: this.onChangeIC,
        onChangeOOC: this.onChangeOOC,
        onChangePlayer: this.onChangePlayer,
      },
    });

    super.activateListeners();
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
