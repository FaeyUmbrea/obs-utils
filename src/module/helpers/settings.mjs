import { ICCHOICES, ID as moduleID, NAME_TO_ICON, OOCCHOICES } from './consts.mjs';

export function registerSettings() {
  game.settings.register(moduleID, 'minScale', {
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
  game.settings.register(moduleID, 'maxScale', {
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
  game.settings.register(moduleID, 'defaultOutOfCombat', {
    name: `obs-utils.settings.defaultOutOfCombat.Name`,
    default: 'trackall',
    type: String,
    choices: OOCCHOICES,
    scope: 'world',
    config: false,
    hint: `obs-utils.settings.defaultOutOfCombat.Hint`,
  });
  game.settings.register(moduleID, 'defaultInCombat', {
    name: `obs-utils.settings.defaultInCombat.Name`,
    default: 'trackall',
    type: String,
    choices: ICCHOICES,
    scope: 'world',
    config: false,
    hint: `obs-utils.settings.defaultInCombat.Hint`,
  });
}

export function getSetting(settingName) {
  return game.settings.get('obs-utils', settingName);
}

export async function setSetting(settingName, value) {
  await game.settings.set('obs-utils', settingName, value);
}

export function generateDataBlockFromSetting(callback, trackCallback) {
  let buttonData = {
    ic: [],
    ooc: [],
    currentIC: getSetting('defaultInCombat'),
    currentOOC: getSetting('defaultOutOfCombat'),
    callback: callback,
    trackCallback: trackCallback,
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
  buttonData.players = game.users;
  return buttonData;
}