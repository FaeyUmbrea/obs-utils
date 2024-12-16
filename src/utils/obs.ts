import OBSWebSocket from 'obs-websocket-js';
import {
	applyPopupConstrains,
	closePopupWithDelay,
	hideApplication,
	hideSidebar,
	hideTokenBorder,
	preserveSideBar,
	screenReload,
	showTracker,
	tokenMoved,
} from './canvas.ts';
import { handleCombat, stopCombat } from './combat.js';
import { isOBS } from './helpers';
import { getSetting, OBSAction } from './settings.ts';
import { renderOverlays } from './stream.ts';

let obswebsocket;

function getWSSettings() {
	const url = getComputedStyle(document.documentElement).getPropertyValue(
		'--local-obs-host',
	);
	const port = getComputedStyle(document.documentElement).getPropertyValue(
		'--local-obs-port',
	);
	const password = getComputedStyle(document.documentElement).getPropertyValue(
		'--local-obs-password',
	);
	const setting = getSetting('websocketSettings')!;
	if (url) setting.url = url;
	if (port) setting.port = port;
	if (password) setting.password = password;
	return setting;
}

export async function handleOBS(event) {
	if (!isOBS()) return;
	const obsEvents = getSetting('obsRemote')![event];
	const useWS = getSetting('enableOBSWebsocket');
	obsEvents.forEach(
		async obsEvent => await triggerOBSAction(obsEvent, useWS),
	);
}

export async function handleOBSScene(sceneName: string) {
	if (!isOBS()) return;
	const obsEvents = getSetting('obsRemote')!.onSceneLoad;
	const useWS = getSetting('enableOBSWebsocket');
	obsEvents.forEach((event) => {
		if (event.sceneName === sceneName) {
			event.obsActions.forEach(
				async obsAction => await triggerOBSAction(obsAction, useWS),
			);
		}
	});
}

async function triggerOBSAction(obsevent, useWS) {
	if (!useWS) {
		window.obsstudio.getControlLevel(async (controlLevel) => {
			switch (obsevent.targetAction) {
				case OBSAction.SwitchScene:
					if (!(controlLevel === 4)) {
						throw new Error('Control Level too Low');
					}
					window.obsstudio.setCurrentScene(obsevent.sceneName);
					break;
				default:
					throw new Error(
						'OBS Websocket is Disabled! How are you triggering this?!?',
					);
			}
		});
	} else {
		const websocket = await getWebsocket();
		switch (obsevent.targetAction) {
			case OBSAction.SwitchScene:
				await websocket.call('SetCurrentProgramScene', {
					sceneName: obsevent.sceneName,
				});
				break;
			case OBSAction.EnableSource:
				await websocket.call('SetSceneItemEnabled', {
					sceneName: obsevent.sceneName,
					sceneItemId: await getSceneItemIdByName(
						obsevent.sceneName,
						obsevent.targetName,
					),
					sceneItemEnabled: true,
				});
				break;
			case OBSAction.DisableSource:
				await websocket.call('SetSceneItemEnabled', {
					sceneName: obsevent.sceneName,
					sceneItemId: await getSceneItemIdByName(
						obsevent.sceneName,
						obsevent.targetName,
					),
					sceneItemEnabled: false,
				});
				break;
			case OBSAction.ToggleSource: {
				const sourcestatus = await websocket.call('GetSceneItemEnabled', {
					sceneName: obsevent.sceneName,
					sceneItemId: await getSceneItemIdByName(
						obsevent.sceneName,
						obsevent.targetName,
					),
				});
				await websocket.call('SetSceneItemEnabled', {
					sceneName: obsevent.sceneName,
					sceneItemId: await getSceneItemIdByName(
						obsevent.sceneName,
						obsevent.targetName,
					),
					sceneItemEnabled: !sourcestatus.sceneItemEnabled,
				});
				break;
			}
		}
	}
}

async function getSceneItemIdByName(scene, item) {
	return (
		await (
			await getWebsocket()
		).call('GetSceneItemId', { sceneName: scene, sourceName: item })
	).sceneItemId;
}

async function getWebsocket() {
	if (obswebsocket) return obswebsocket;
	const wsSettings = getWSSettings();
	obswebsocket = new OBSWebSocket();
	await obswebsocket.connect(
		`ws://${wsSettings.url}:${wsSettings.port}`,
		wsSettings.password,
	);
	return obswebsocket;
}

async function registerOBSEvents() {
	const useWS = getSetting('enableOBSWebsocket');
	if (useWS) {
		(await getWebsocket()).addListener('StreamStateChanged', (returnValue) => {
			if (returnValue.outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED')
				handleOBS('onStopStreaming');
		});
	} else {
		window.addEventListener(
			'obsStreamingStopped',
			async () => await handleOBS('onStopStreaming'),
		);
	}
}

export function initOBS() {
	if (game.view === 'stream') {
		Hooks.once('renderChatLog', () => renderOverlays());
	}
	if (game.view !== 'game') return;
	Hooks.on('canvasReady', screenReload);
	Hooks.on('canvasReady', async (canvas) => {
		await handleOBSScene(canvas.scene!.name);
	});

	Hooks.on('renderSidebar', hideApplication);
	Hooks.on('renderSceneNavigation', hideApplication);
	Hooks.on('renderMainMenu', hideApplication);
	Hooks.on('renderSceneControls', hideApplication);
	Hooks.on('renderTokenHUD', hideApplication);
	Hooks.on('renderUserConfig', hideApplication);
	if (!getSetting('showAV')) {
		Hooks.on('renderCameraViews', hideApplication);
	}
	Hooks.on('renderPlayerList', hideApplication);
	Hooks.on('renderHotbar', hideApplication);
	Hooks.on('renderUserConfig', (...args) => {
		if (!getSetting('showUserConfig')) {
			hideApplication(...args);
		}
	});

	Hooks.on('renderSidebar', preserveSideBar);

	$('section#ui-left img#logo').remove();

	Hooks.on('drawToken', hideTokenBorder);
	Hooks.on('refreshToken', hideTokenBorder);

	Hooks.on('updateToken', tokenMoved);

	Hooks.on('updateCombat', handleCombat);
	Hooks.on('updateCombat', tokenMoved);
	Hooks.on('updateCombat', showTracker);
	Hooks.on('deleteCombat', stopCombat);
	Hooks.on('deleteCombat', hideSidebar);

	// Close Popups after configurable Time
	Hooks.on('renderJournalSheet', closePopupWithDelay);
	Hooks.on('renderImagePopout', closePopupWithDelay);

	// Resize and Reposition Popups if enabled
	Hooks.on('renderJournalSheet', applyPopupConstrains);
	Hooks.on('renderImagePopout', applyPopupConstrains);

	// Adding OBS Remote hooks;
	Hooks.on('updateCombat', async (_combat, change) => {
		if (change.turn === 0 && change.round === 1)
			await handleOBS('onCombatStart');
	});
	Hooks.on('deleteCombat', async () => {
		await handleOBS('onCombatEnd');
	});
	Hooks.on('pauseGame', async (pause) => {
		if (pause) {
			await handleOBS('onPause');
		} else {
			await handleOBS('onUnpause');
		}
	});
	Hooks.once('ready', async () => {
		await handleOBS('onLoad');
		if (game.combat?.isActive) {
			await showTracker();
		} else {
			ui?.sidebar?.collapse();
		}
	});

	Hooks.on('updateSetting', async (setting) => {
		if (setting.key === 'obs-utils.clampCanvas') {
			await screenReload();
		}
	});

	registerOBSEvents().then();
	Hooks.call('obs-utils.streamModeInit');
}
