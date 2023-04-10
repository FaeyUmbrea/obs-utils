import {scaleToFit, tokenMoved, viewportChanged} from './canvas';
import {ICCHOICES, ID as moduleID, NAME_TO_ICON, OOCCHOICES} from './const';
import {isOBS} from './helpers';

export const OBSAction = {
  SwitchScene: 'Switch Scene',
  ToggleSource: 'Toggle Source',
  EnableSource: 'Enable Source',
  DisableSource: 'Disable Source',
}

export class OBSEvent {
  targetAction = OBSAction.SwitchScene;
  sceneName = '';
  targetName = '';
}

export class OBSWebsocketSettings {
  url = '';
  port = '';
  password = '';
}

export class OBSRemoteSettings {
  onLoad = [];
  onCombatStart = [];
  onCombatEnd = [];
  onPause = [];
  onUnpause = [];
  onStopStreaming = [];
}

function getGM() {
    return game.users?.find((user) => user.isGM);
}

async function changeMode() {
  if (!isOBS()) return;
  //Trigger modes after mode change, calling the methods avoids doing every conditional twice
  scaleToFit();
  tokenMoved();
  viewportChanged(getSetting('trackedUser'));
  const firstGM = getGM()?.id;
  if (firstGM) viewportChanged(firstGM);
}

export function registerSettings() {
  registerSetting('minScale', {
    default: 0.1,
    type: Number,
    range: {
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    scope: 'world',
    config: true,
  });
  registerSetting('maxScale', {
    default: 2,
    type: Number,
    range: {
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    scope: 'world',
    config: true,
  });
  registerSetting('defaultOutOfCombat', {
    default: 'trackall',
    type: String,
    choices: OOCCHOICES,
    scope: 'world',
    config: false,
    onChange: changeMode,
  });
  registerSetting('defaultInCombat', {
    default: 'trackall',
    type: String,
    choices: ICCHOICES,
    scope: 'world',
    config: false,
    onChange: changeMode,
  });
  registerSetting('popupCloseDelay', {
    default: 10,
    type: Number,
    range: {
      min: 1,
      max: 300,
      step: 1,
    },
    scope: 'world',
    config: true,
  });
  registerSetting('showTrackerInCombat', {
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
  });
  registerSetting('trackedUser', {
      default: game.userId,
      type: String,
      scope: 'world',
      config: false,
      onChange: changeMode,
  });
  registerSetting('obsRemote', {
    type: Object,
    scope: 'world',
    config: false,
    default: new OBSRemoteSettings(),
  });
  registerSetting('enableOBSWebsocket', {
    type: Boolean,
    scope: 'world',
    config: true,
    default: false,
  });
  registerSetting('websocketSettings', {
    type: Object,
    scope: 'world',
    config: false,
    default: new OBSWebsocketSettings(),
  });
  registerSetting('streamOverlays', {
    type: Object,
      scope: 'world',
      config: false,
      default: [],
  });
    registerSetting('overlayActors', {
        type: Object,
        scope: 'world',
        config: false,
        default: [],
    });
    registerSetting('settingsVersion', {
        type: Number,
        scope: 'world',
        config: false,
        default: 0
    })
    registerSetting('rollOverlayRollDelay', {
        type: Number,
        scope: 'world',
        config: 'true',
        default: 0
    })
    registerSetting('rollOverlayRollFadeIn', {
        type: Number,
        scope: 'world',
        config: 'true',
        default: 0
    })
    registerSetting('rollOverlayRollFadeOut', {
        type: Number,
        scope: 'world',
        config: 'true',
        default: 0
    })
    registerSetting('rollOverlayRollStay', {
        type: Number,
        scope: 'world',
        config: 'true',
        default: 5000
    })
}

export function runMigrations() {
    const version = getSetting('settingsVersion');
    if (version < 1) {
        console.warn("Running OBS Utils Migrations")
        if (version < 1) {
            console.warn("Migrations for Data-Model Version 1")
            let obssettings = getSetting('obsRemote');
            // Code for Migration Setting Models
            obssettings = foundry.utils.mergeObject(new OBSRemoteSettings(), obssettings);
            delete obssettings['onCloseObs'];
            setSetting('obsRemote', obssettings);
        }
        console.warn("OBS Utils Migrations Finished")
        setSetting('settingsVersion', 1);
    }
}

function registerSetting(settingName, config) {
    game.settings.register(moduleID, settingName, {
        name: `${moduleID}.settings.${settingName}.Name`,
        hint: `${moduleID}.settings.${settingName}.Hint`,
        ...config,
    });
}

export function getSetting(settingName) {
    return game.settings.get('obs-utils', settingName);
}

export async function setSetting(settingName, value) {
    await game.settings.set('obs-utils', settingName, value);
}

export function generateDataBlockFromSetting() {
  const buttonData = {
    ic: [],
    ooc: [],
    players: [],
  };

  for (const [key, value] of Object.entries(ICCHOICES)) {
    buttonData.ic.push({
      icon: NAME_TO_ICON[key],
      tooltip: value,
      id: key,
    });
  }
  for (const [key, value] of Object.entries(OOCCHOICES)) {
    buttonData.ooc.push({
      icon: NAME_TO_ICON[key],
      tooltip: value,
      id: key,
    });
  }
    buttonData.players = game.users?.filter((element) => !element.isGM);
  return buttonData;
}
