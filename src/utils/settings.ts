import { scaleToFit, tokenMoved } from './canvas.js';
import { ICCHOICES, ID as moduleID, NAME_TO_ICON, OOCCHOICES } from './const.js';
import { getGame } from './helpers.js';
import { isOBS } from './obs.js';

async function changeMode() {
  if (!isOBS()) return;
  //Using an object to avoid reading Settings every time a token moves
  scaleToFit();
  tokenMoved();
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
    default: getGame().userId,
    type: String,
    scope: 'world',
    config: false,
    onChange: changeMode,
  });
  registerSetting('obsRemote', {
    type: OBSRemoteSettings,
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
    type: OBSWebsocketSettings,
    scope: 'client',
    config: false,
    default: new OBSWebsocketSettings(),
  });
}

function registerSetting(settingName: string, config: Record<string, unknown>): void {
  getGame().settings.register(moduleID, settingName, {
    name: `${moduleID}.settings.${settingName}.Name`,
    hint: `${moduleID}.settings.${settingName}.Hint`,
    ...config,
  });
}

export function getSetting(settingName: string): any {
  return getGame().settings.get('obs-utils', settingName);
}

export async function setSetting(settingName: string, value: any) {
  await getGame().settings.set('obs-utils', settingName, value);
}

export function generateDataBlockFromSetting() {
  const buttonData: DirectorData = {
    ic: [],
    ooc: [],
    players: [],
  };

  for (const [key, value] of Object.entries(ICCHOICES)) {
    buttonData.ic.push({
      icon: NAME_TO_ICON[key as keyof typeof NAME_TO_ICON],
      tooltip: value,
      id: key,
    });
  }
  for (const [key, value] of Object.entries(OOCCHOICES)) {
    buttonData.ooc.push({
      icon: NAME_TO_ICON[key as keyof typeof NAME_TO_ICON],
      tooltip: value,
      id: key,
    });
  }
  buttonData.players = getGame().users?.filter((element) => !element.isGM) as StoredDocument<User>[];
  return buttonData;
}
