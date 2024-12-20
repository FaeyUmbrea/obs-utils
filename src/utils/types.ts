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

export class OverlayData {
	type: string;
	components: OverlayComponentData[];
	style: string;

	constructor(type = 'sl', components = [], style = '') {
		this.type = type;
		this.components = components;
		this.style = style;
	}
}

export class OverlayComponentData {
	type: string;
	data: string;
	style: string;

	constructor(type = 'pt', data = '', style = '') {
		this.type = type;
		this.data = data;
		this.style = style;
	}
}
