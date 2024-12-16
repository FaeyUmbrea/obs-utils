import { OBSAction } from './settings.ts';

export class OBSEvent {
	targetAction = OBSAction.SwitchScene;
	sceneName = '';
	targetName = '';
}

export class OBSWebsocketSettings {
	url = 'localhost';
	port = '4455';
	password = '';
}

export class SceneLoadEvent {
	sceneName = '';
	obsActions = [];
}

export class OBSRemoteSettings {
	onLoad: OBSEvent[] = [];
	onCombatStart: OBSEvent[] = [];
	onCombatEnd: OBSEvent[] = [];
	onPause: OBSEvent[] = [];
	onUnpause: OBSEvent[] = [];
	onSceneLoad: SceneLoadEvent[] = [];
	onStopStreaming: OBSEvent[] = [];
}
