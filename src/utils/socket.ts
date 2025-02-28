import { debounce } from 'lodash-es';
import { getCurrentUser, VIEWPORT_DATA, viewportChanged } from './canvas';
import { isOBS } from './helpers.ts';
import { getSetting, setSetting } from './settings.ts';

Hooks.once('init', () => {
	game?.socket?.on('module.obs-utils', handleEvent);
});
async function handleEvent({ eventType, targetUser, payload }) {
	if (!!targetUser && game.userId !== targetUser) return;

	if (eventType === 'viewport') {
		changeViewport(payload);
	} else if (eventType === 'websocketSettings') {
		await changeOBSSettings(payload);
	} else if (eventType === 'openSettingsConfig') {
		openSettingsConfig();
	}
}

export function sendOpenSettingsConfig() {
	game?.socket?.emit('module.obs-utils', { eventType: 'openSettingsConfig', targetUser: undefined });
}

function openSettingsConfig() {
	if (!isOBS()) return;
	(new SettingsConfig({})).render(true);
}

async function changeOBSSettings(settings) {
	await setSetting('websocketSettings', settings);
	foundry.utils.debouncedReload();
}

export function sendOBSSetting(user, settings) {
	game?.socket?.emit('module.obs-utils', {
		eventType: 'websocketSettings',
		targetUser: user,
		payload: settings,
	});
}

function changeViewport({ viewport, userId }) {
	if (!isOBS()) return;
	// First update the collection of viewport data
	VIEWPORT_DATA.set(userId, viewport);
	// Then immediately try to animate to that users position
	viewportChanged(userId);
}

let viewportTrackingActive = false;

export function activateViewportTracking() {
	viewportTrackingActive = true;
}

export function deactivateViewportTracking() {
	viewportTrackingActive = false;
}

function socketCanvasInternal(position) {
	if (!viewportTrackingActive || getSetting('pauseCameraTracking')) {
		return;
	}
	game?.socket?.emit('module.obs-utils', {
		eventType: 'viewport',
		targetUser: undefined,
		payload: { viewport: position, userId: getCurrentUser() },
	});
}

const debouncedSocketCanvas = debounce(socketCanvasInternal, 100, {
	maxWait: 500,
});

export function socketCanvas(_canvas: Canvas, position) {
	if (getSetting('smoothUserCamera')) {
		debouncedSocketCanvas(position);
	} else {
		socketCanvasInternal(position);
	}
}
