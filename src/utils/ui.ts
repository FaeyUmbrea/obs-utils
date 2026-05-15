import DirectorApplication from '../applications/director.ts';
/**
 * @type {Array<any>}
 */
import OBSRemoteApplication from '../applications/obsremote.ts';
import OBSWebsocketApplication from '../applications/obswebsocket.ts';
import OverlayActorSelect from '../applications/overlayactorselect.ts';
import OverlayEditor from '../applications/overlayeditor.ts';
import OverlayPreview from '../applications/overlaypreview.ts';
import AVEditor from '../svelte/components/editors/AVEditor.svelte';
import BooleanEditor from '../svelte/components/editors/BooleanEditor.svelte';
import MultiAVEditor from '../svelte/components/editors/MultiAVEditor.svelte';
import MultiAVIconEditor from '../svelte/components/editors/MultiAVIconEditor.svelte';
import { MODULE_ID as moduleID } from './const';
import { getApi } from './helpers.js';

let d: DirectorApplication | undefined;

export async function openDirector(button: any) {
	if (!d) d = new DirectorApplication({}, button);
	if (!d.rendered) {
		d.render(true);
	} else {
		await d.close();
		d = undefined;
	}
}

export function registerUI() {
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'obsRemoteMenu', {
		name: `${moduleID}.settings.obsRemoteMenu.Name`,
		label: `${moduleID}.settings.obsRemoteMenu.Label`,
		hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
		type: OBSRemoteApplication,
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'obsWebsocketMenu', {
		name: `${moduleID}.settings.obsWebsocketMenu.Name`,
		label: `${moduleID}.settings.obsWebsocketMenu.Label`,
		hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
		type: OBSWebsocketApplication,
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayActorSelect', {
		name: `${moduleID}.settings.overlayActorSelect.Name`,
		label: `${moduleID}.settings.overlayActorSelect.Label`,
		hint: `${moduleID}.settings.overlayActorSelect.Hint`,
		type: OverlayActorSelect,
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayEditor', {
		name: `${moduleID}.settings.overlayEditor.Name`,
		label: `${moduleID}.settings.overlayEditor.Label`,
		hint: `${moduleID}.settings.overlayEditor.Hint`,
		type: OverlayEditor,
		icon: 'fas fa-bars',
		restricted: true,
	});
	getApi().overlayTypes.get('sl')?.registerComponentEditor('pt', AVEditor);
	getApi().overlayTypes.get('sl')?.registerComponentEditor('fai', AVEditor);
	getApi().overlayTypes.get('sl')?.registerComponentEditor('img', AVEditor);
	getApi()
		.overlayTypes
		.get('sl')
		?.registerComponentEditor('bav', BooleanEditor, true);
	getApi()
		.overlayTypes
		.get('sl')
		?.registerComponentEditor('bavimg', BooleanEditor, true);
	getApi()
		.overlayTypes
		.get('sl')
		?.registerComponentEditor('micoav', MultiAVIconEditor, true);
	getApi()
		.overlayTypes
		.get('sl')
		?.registerComponentEditor('mimgav', MultiAVIconEditor, true);
	getApi()
		.overlayTypes
		.get('sl')
		?.registerComponentEditor('pb', MultiAVEditor, true);
}

let previewApp: OverlayPreview | undefined;

export async function openOverlayPreview() {
	if (!previewApp) previewApp = new OverlayPreview({});
	if (!previewApp.rendered) {
		previewApp.render(true);
	} else {
		previewApp.bringToFront();
	}
}
