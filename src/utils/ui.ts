import DirectorApplication from '../applications/director.ts';
/**
 * @type {Array<any>}
 */
import NotificationCenter from '../applications/notificationCenter.ts';
import OBSRemoteApplication from '../applications/obsremote.ts';
import OBSWebsocketApplication from '../applications/obswebsocket.ts';
import OverlayActorSelect from '../applications/overlayactorselect.ts';
import OverlayEditor from '../applications/overlayeditor.ts';
import RollOverlay from '../applications/rolloverlay.ts';
import { SettingsShell } from '../applications/settingsShell.ts';
import { getLinks, getNotifications } from '../notifications/notifications.ts';
import AVEditor from '../svelte/components/editors/AVEditor.svelte';
import BooleanEditor from '../svelte/components/editors/BooleanEditor.svelte';
import MultiAVEditor from '../svelte/components/editors/MultiAVEditor.svelte';
import MultiAVIconEditor from '../svelte/components/editors/MultiAVIconEditor.svelte';
import SingleLineOverlayEditor from '../svelte/components/editors/SingleLineOverlayEditor.svelte';
import { MODULE_ID as moduleID } from './const';
import { getApi } from './helpers.js';

let d;

export async function openDirector(button) {
	if (!d) d = new DirectorApplication(button);
	if (!d.rendered) d.render(true);
	else d.close();
}

export function registerUI() {
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'obsRemoteMenu', {
		name: `${moduleID}.settings.obsRemoteMenu.Name`,
		label: `${moduleID}.settings.obsRemoteMenu.Label`,
		hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
		type: SettingsShell(OBSRemoteApplication),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'obsWebsocketMenu', {
		name: `${moduleID}.settings.obsWebsocketMenu.Name`,
		label: `${moduleID}.settings.obsWebsocketMenu.Label`,
		hint: `${moduleID}.settings.obsWebsocketMenu.Hint`,
		type: SettingsShell(OBSWebsocketApplication),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayActorSelect', {
		name: `${moduleID}.settings.overlayActorSelect.Name`,
		label: `${moduleID}.settings.overlayActorSelect.Label`,
		hint: `${moduleID}.settings.overlayActorSelect.Hint`,
		type: SettingsShell(OverlayActorSelect),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayEditor', {
		name: `${moduleID}.settings.overlayEditor.Name`,
		label: `${moduleID}.settings.overlayEditor.Label`,
		hint: `${moduleID}.settings.overlayEditor.Hint`,
		type: SettingsShell(OverlayEditor),
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'rollOverlayEditor', {
		name: `${moduleID}.settings.rollOverlayEditor.Name`,
		label: `${moduleID}.settings.rollOverlayEditor.Label`,
		hint: `${moduleID}.settings.rollOverlayEditor.Hint`,
		icon: 'fas fa-bars',
		type: SettingsShell(RollOverlay),
		restricted: true,
	});

	getApi()
		.overlayTypes
		.get('sl')
		?.registerOverlayEditor(SingleLineOverlayEditor);
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

export async function showNotifications() {
	try {
		if (!game.user?.isGM) return;
		const notifications = await getNotifications();
		if (notifications.length > 0) {
			const links = await getLinks();
			new NotificationCenter(notifications, links).render(true);
		}
	} catch (e) {
		console.error(e);
	}
}
