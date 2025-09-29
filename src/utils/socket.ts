import type { OBSWebsocketSettings } from './types.ts';
import { getCurrentUser, VIEWPORT_DATA, viewportChanged } from './canvas';
import { debounce, isOBS } from './helpers.ts';
import { getSetting, setSetting } from './settings.ts';

type NotifyOptions = foundry.applications.ui.Notifications.NotifyOptions;

Hooks.once('init', () => {
	(game as ReadyGame | undefined)?.socket?.on('module.obs-utils', handleEvent);
});

async function handleEvent({ eventType, targetUser, payload }: {
	eventType: string;
	targetUser: string | undefined;
	payload: never;
}) {
	if (!!targetUser && (game as ReadyGame).userId !== targetUser) return;

	if (eventType === 'viewport') {
		changeViewport(payload);
	} else if (eventType === 'websocketSettings') {
		await changeOBSSettings(payload);
	} else if (eventType === 'openSettingsConfig') {
		openSettingsConfig();
	} else if (eventType === 'notification') {
		showProxiedNotification(payload);
	}
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

function showProxiedNotification(payload: { message: string; type: NotificationType; options: NotifyOptions }) {
	if (!(game as ReadyGame | undefined)?.user.isGM || !getSetting('proxyOBSMessages')) {
		return;
	}
	ui.notifications?.notify(`Ethereal Plane OBS Notification | ${payload.message}`, payload.type, payload.options);
}

export function proxyNotification(message: string, type: string = 'info', options: NotificationOptions = {}) {
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'notification',
		targetUser: undefined,
		payload: { message, type, options },
	});
}

export function sendOpenSettingsConfig() {
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'openSettingsConfig',
		targetUser: undefined,
	});
}

function openSettingsConfig() {
	if (!isOBS()) return;
	(new SettingsConfig({})).render(true);
}

async function changeOBSSettings(settings: OBSWebsocketSettings) {
	await setSetting('websocketSettings', settings);
	foundry.utils.debouncedReload();
}

export function sendOBSSetting(user: string, settings: OBSWebsocketSettings | undefined) {
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'websocketSettings',
		targetUser: user,
		payload: settings,
	});
}

function changeViewport({ viewport, userId }: { viewport: { x: number; y: number; scale: number }; userId: string }) {
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

function socketCanvasInternal(position: Canvas.ViewPosition) {
	if (!viewportTrackingActive || getSetting('pauseCameraTracking')) {
		return;
	}
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'viewport',
		targetUser: undefined,
		payload: { viewport: position, userId: getCurrentUser() },
	});
}

const debouncedSocketCanvas = debounce(socketCanvasInternal, 100, {
	maxWait: 500,
});

export function socketCanvas(_canvas: Canvas, position: Canvas.ViewPosition) {
	if (getSetting('smoothUserCamera')) {
		debouncedSocketCanvas(position);
	} else {
		socketCanvasInternal(position);
	}
}
