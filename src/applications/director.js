import { generateDataBlockFromSetting, getSetting, setSetting } from '../utils/settings.js';
import DirectorApp from '../svelte/DirectorApp.svelte';
import '../less/obsdirector.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/apps.hbs';

export default class DirectorApplication extends Application {
  buttonData;
  sidebarButton;
  component;
  constructor(sidebarButton) {
    super();
    this.buttonData = generateDataBlockFromSetting();
    this.sidebarButton = sidebarButton;
  }

  async onChangeIC(event) {
    await setSetting('defaultInCombat', (event.target).value);
  }
  async onChangeOOC(event) {
    await setSetting('defaultOutOfCombat', (event.target).value);
  }
  async onChangePlayer(event) {
    await setSetting('trackedUser', (event.target).value);
  }

  activateListeners(html) {
    const playerList = this.buttonData.players;
    const currentIC = getSetting('defaultInCombat');
    const currentOOC = getSetting('defaultOutOfCombat');
    const currentTrackedPlayer = getSetting('trackedUser');

    if (currentIC)
      this.component = new DirectorApp({
        target: html.get(0),
        props: {
          ic: this.buttonData.ic,
          ooc: this.buttonData.ooc,
          players: playerList,
          currentIC: currentIC,
          currentOOC: currentOOC,
          currentTrackedPlayer: currentTrackedPlayer,
          onChangeIC: this.onChangeIC,
          onChangeOOC: this.onChangeOOC,
          onChangePlayer: this.onChangePlayer,
        },
      });

    super.activateListeners(html);
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

  async close(options) {
    super.close(options);
    $('[data-tool=openStreamDirector]').removeClass('active');
    this.sidebarButton.active = false;
  }
}
