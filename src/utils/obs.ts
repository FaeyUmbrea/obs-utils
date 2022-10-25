import { getSetting } from './settings';
import OBSWebSocket from 'obs-websocket-js';

let obswebsocket: OBSWebSocket;

function getCookie(cname: string): string {
  const cookiename = cname + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cookiename) == 0) {
      return c.substring(cookiename.length, c.length);
    }
  }
  return '';
}

function debug(): boolean {
  return getCookie('obs') == 'true';
}

export function isOBS(): boolean {
  return !!window.obsstudio || debug();
}

export function handleOBS(event: string): void {
  if (!isOBS()) return;
  const obsEvents = (getSetting('obsRemote') as OBSRemoteSettings)[event as keyof OBSRemoteSettings];
  const useWS = getSetting('enableOBSWebsocket') as boolean;
  obsEvents.forEach((obsEvent) => triggerOBSAction(obsEvent, useWS));
}

async function triggerOBSAction(obsevent: OBSEvent, useWS: boolean) {
  if (!useWS) {
    obsstudio.getControlLevel(async (controlLevel) => {
      switch (obsevent.targetAction) {
        case OBSAction.SwitchScene:
          if (!(controlLevel == 4)) {
            throw new Error('Control Level too Low');
          }
          obsstudio.setCurrentScene(obsevent.sceneName);
          break;
        default:
          throw new Error('OBS Websocket is Disabled! How are you triggering this?!?');
      }
    });
  } else {
    const websocket = await getWebsocket();
    switch (obsevent.targetAction) {
      case OBSAction.SwitchScene:
        await websocket.call('SetCurrentProgramScene', { sceneName: obsevent.sceneName });
        break;
      case OBSAction.EnableSource:
        await websocket.call('SetSceneItemEnabled', {
          sceneName: obsevent.sceneName,
          sceneItemId: obsevent.targetID,
          sceneItemEnabled: true,
        });
        break;
      case OBSAction.DisableSource:
        await websocket.call('SetSceneItemEnabled', {
          sceneName: obsevent.sceneName,
          sceneItemId: obsevent.targetID,
          sceneItemEnabled: false,
        });
        break;
      case OBSAction.ToggleSource: {
        const sourcestatus = await websocket.call('GetSceneItemEnabled', {
          sceneName: obsevent.sceneName,
          sceneItemId: obsevent.targetID,
        });
        await websocket.call('SetSceneItemEnabled', {
          sceneName: obsevent.sceneName,
          sceneItemId: obsevent.targetID,
          sceneItemEnabled: !sourcestatus,
        });
        break;
      }
    }
  }
}

async function getWebsocket(): Promise<OBSWebSocket> {
  if (obswebsocket) return obswebsocket;
  const wsSettings = getSetting('websocketSettings') as OBSWebsocketSettings;
  obswebsocket = new OBSWebSocket();
  await obswebsocket.connect(`ws://${wsSettings.url}:${wsSettings.port}`, wsSettings.password);
  return obswebsocket;
}
