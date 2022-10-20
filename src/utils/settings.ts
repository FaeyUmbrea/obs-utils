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
  getGame().settings.register(moduleID, 'minScale', {
    name: `obs-utils.settings.minScale.Name`,
    default: 0.1,
    type: Number,
    range: {
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    scope: 'world',
    config: true,
    hint: `obs-utils.settings.minScale.Hint`,
  });
  getGame().settings.register(moduleID, 'maxScale', {
    name: `obs-utils.settings.maxScale.Name`,
    default: 2,
    type: Number,
    range: {
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    scope: 'world',
    config: true,
    hint: `obs-utils.settings.maxScale.Hint`,
  });
  getGame().settings.register(moduleID, 'defaultOutOfCombat', {
    name: `obs-utils.settings.defaultOutOfCombat.Name`,
    default: 'trackall',
    type: String,
    choices: OOCCHOICES,
    scope: 'world',
    config: false,
    hint: `obs-utils.settings.defaultOutOfCombat.Hint`,
    onChange: changeMode,
  });
  getGame().settings.register(moduleID, 'defaultInCombat', {
    name: `obs-utils.settings.defaultInCombat.Name`,
    default: 'trackall',
    type: String,
    choices: ICCHOICES,
    scope: 'world',
    config: false,
    hint: `obs-utils.settings.defaultInCombat.Hint`,
    onChange: changeMode,
  });
  getGame().settings.register(moduleID, 'popupCloseDelay', {
    name: `obs-utils.settings.popupCloseDelay.Name`,
    default: 10,
    type: Number,
    range: {
      min: 1,
      max: 300,
      step: 1,
    },
    scope: 'world',
    config: true,
    hint: `obs-utils.settings.popupCloseDelay.Hint`,
  });
  getGame().settings.register(moduleID, 'showTrackerInCombat', {
    name: `obs-utils.settings.showTrackerInCombat.Name`,
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: `obs-utils.settings.showTrackerInCombat.Hint`,
  });
  getGame().settings.register(moduleID, 'trackedUser', {
    name: `obs-utils.settings.trackedUser.Name`,
    default: getGame().userId,
    type: String,
    scope: 'world',
    config: false,
    hint: `obs-utils.settings.trackedUser.Hint`,
    onChange: changeMode,
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
