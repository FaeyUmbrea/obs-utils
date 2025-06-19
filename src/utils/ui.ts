import DirectorApplication from '../applications/director.ts';
/**
 * @type {Array<any>}
 */
import OBSRemoteApplication from '../applications/obsremote.ts';
import OBSWebsocketApplication from '../applications/obswebsocket.ts';
import OverlayActorSelect from '../applications/overlayactorselect.ts';
import OverlayEditor from '../applications/overlayeditor.ts';
import RollOverlay from '../applications/rolloverlay.ts';
import { SettingsShell } from '../applications/settingsShell.ts';
import AVEditor from '../svelte/components/editors/AVEditor.svelte';
import BooleanEditor from '../svelte/components/editors/BooleanEditor.svelte';
import MultiAVEditor from '../svelte/components/editors/MultiAVEditor.svelte';
import MultiAVIconEditor from '../svelte/components/editors/MultiAVIconEditor.svelte';
import SingleLineOverlayEditor from '../svelte/components/editors/SingleLineOverlayEditor.svelte';
import { MODULE_ID as moduleID } from './const';
import { getApi } from './helpers.js';

let d: DirectorApplication | undefined;

export async function openDirector(button: any) {
	if (!d) d = new DirectorApplication(button);
	console.error(d.rendered);
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
		// @ts-expect-error mixins dont work
		type: SettingsShell(OBSRemoteApplication),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'obsWebsocketMenu', {
		name: `${moduleID}.settings.obsWebsocketMenu.Name`,
		label: `${moduleID}.settings.obsWebsocketMenu.Label`,
		hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
		// @ts-expect-error mixins dont work
		type: SettingsShell(OBSWebsocketApplication),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayActorSelect', {
		name: `${moduleID}.settings.overlayActorSelect.Name`,
		label: `${moduleID}.settings.overlayActorSelect.Label`,
		hint: `${moduleID}.settings.overlayActorSelect.Hint`,
		// @ts-expect-error mixins dont work
		type: SettingsShell(OverlayActorSelect),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayEditor', {
		name: `${moduleID}.settings.overlayEditor.Name`,
		label: `${moduleID}.settings.overlayEditor.Label`,
		hint: `${moduleID}.settings.overlayEditor.Hint`,
		// @ts-expect-error mixins dont work
		type: SettingsShell(OverlayEditor),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'rollOverlayEditor', {
		name: `${moduleID}.settings.rollOverlayEditor.Name`,
		label: `${moduleID}.settings.rollOverlayEditor.Label`,
		hint: `${moduleID}.settings.rollOverlayEditor.Hint`,
		icon: 'fas fa-bars',
		// @ts-expect-error mixins dont work
		type: SettingsShell(RollOverlay),
		restricted: true,
	});

	getApi()
		.overlayTypes
		.get('sl')
		?.registerOverlayEditor((SingleLineOverlayEditor as SvelteComponentConstructor));
	getApi().overlayTypes.get('sl')?.registerComponentEditor('pt', (AVEditor as SvelteComponentConstructor));
	getApi().overlayTypes.get('sl')?.registerComponentEditor('fai', (AVEditor as SvelteComponentConstructor));
	getApi().overlayTypes.get('sl')?.registerComponentEditor('img', (AVEditor as SvelteComponentConstructor));
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
