import { scaleToFit, tokenMoved, viewportChanged } from './canvas';
import { ICCHOICES, ID as moduleID, NAME_TO_ICON, OOCCHOICES } from './const';
import { getGame } from './helpers';
import { isOBS } from './obs';
import OBSRemoteApplication from '../applications/obsremote';
import OBSWebsocketApplication from '../applications/obswebsocket';
import type { OverlayData } from './stream';

export enum OBSAction {
  SwitchScene = 'Switch Scene',
  ToggleSource = 'Toggle Source',
  EnableSource = 'Enable Source',
  DisableSource = 'Disable Source',
}

export class OBSEvent {
  targetAction: OBSAction = OBSAction.SwitchScene;
  sceneName = '';
  targetName = '';
}

export class OBSWebsocketSettings {
  url = '';
  port = '';
  password = '';
}

export class OBSRemoteSettings {
  onLoad: OBSEvent[] = [];
  onCombatStart: OBSEvent[] = [];
  onCombatEnd: OBSEvent[] = [];
  onPause: OBSEvent[] = [];
  onUnpause: OBSEvent[] = [];
  onStopStreaming: OBSEvent[] = [];
}

function getGM() {
  return getGame().users?.find((user) => user.isGM);
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
    default: getGame().userId,
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
    default: new Array<OverlayData>(),
  });
  registerSetting('overlayActors', {
    type: Object,
    scope: 'world',
    config: false,
    default: new Array<string>(),
  });
  getGame().settings.registerMenu(moduleID, 'obsRemoteMenu', {
    name: `${moduleID}.settings.obsRemoteMenu.Name`,
    label: `${moduleID}.settings.obsRemoteMenu.Label`,
    hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
    type: OBSRemoteApplication,
    icon: 'fas fa-bars',
    restricted: true,
  });
  getGame().settings.registerMenu(moduleID, 'obsWebsocketMenu', {
    name: `${moduleID}.settings.obsWebsocketMenu.Name`,
    label: `${moduleID}.settings.obsWebsocketMenu.Label`,
    hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
    type: OBSWebsocketApplication,
    icon: 'fas fa-bars',
    restricted: true,
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
