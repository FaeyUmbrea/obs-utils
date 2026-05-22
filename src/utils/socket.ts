import type { CameraPreset } from './cameraPresets.ts';
import type { SequenceController } from './cameraSequencePlayer.ts';
import type { OBSWebsocketSettings } from './types.ts';
import { playSequence } from './cameraSequencePlayer.ts';
import { clampAndApplyExternal, getCurrentUser, getLocalViewport, VIEWPORT_DATA, viewportChanged } from './canvas';
import { isOBS } from './helpers.ts';
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
	} else if (eventType === 'gmHandoverRequest') {
		await handleGMHandoverRequest(payload);
	} else if (eventType === 'gmHandoverGrant') {
		await handleGMHandoverGrant(payload);
	} else if (eventType === 'playPreset') {
		handlePlayPreset(payload);
	} else if (eventType === 'stopPreset') {
		handleStopPreset();
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

// ─── Camera tracking pipeline ─────────────────────────────────────────────
// Three modes, all routed through a 30 Hz throttle so we never spam the socket
// faster than the receiver can usefully apply:
//
//   raw         — emit the latest sample on each tick (just rate-limited)
//   smooth      — moving-average over the most recent samples, then throttled
//   dragRelease — buffer locally and emit one final position once the pan stops
//
// The previous debounce implementation produced jitter because each emit
// restarted the receiver's animatePan tween mid-flight. Holding a steady ~30 Hz
// stream lets the receiver chain tweens that finish just as the next one
// arrives, so motion stays continuous.

const EMIT_INTERVAL_MS = 33;
const SMOOTH_WINDOW = 5;
const DRAG_SETTLE_MS = 150;

let lastEmitWall = 0;
let pendingPosition: Canvas.ViewPosition | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let dragSettleTimer: ReturnType<typeof setTimeout> | null = null;
const smoothBuf: Canvas.ViewPosition[] = [];

function avgPosition(buf: Canvas.ViewPosition[]): Canvas.ViewPosition {
	// Pick the latest scale verbatim — smoothing zoom feels laggy.
	const n = buf.length;
	let sx = 0;
	let sy = 0;
	for (const p of buf) {
		sx += p.x;
		sy += p.y;
	}
	return { x: sx / n, y: sy / n, scale: buf[n - 1].scale };
}

function flushNow(p: Canvas.ViewPosition) {
	lastEmitWall = performance.now();
	pendingPosition = null;
	socketCanvasInternal(p);
}

function throttledEmit(p: Canvas.ViewPosition) {
	const now = performance.now();
	const elapsed = now - lastEmitWall;
	if (elapsed >= EMIT_INTERVAL_MS) {
		flushNow(p);
		return;
	}
	pendingPosition = p;
	if (throttleTimer === null) {
		throttleTimer = setTimeout(() => {
			throttleTimer = null;
			if (pendingPosition) flushNow(pendingPosition);
		}, EMIT_INTERVAL_MS - elapsed);
	}
}

function smoothedEmit(p: Canvas.ViewPosition) {
	smoothBuf.push(p);
	if (smoothBuf.length > SMOOTH_WINDOW) smoothBuf.shift();
	throttledEmit(avgPosition(smoothBuf));
}

function dragReleaseEmit(p: Canvas.ViewPosition) {
	if (dragSettleTimer !== null) clearTimeout(dragSettleTimer);
	dragSettleTimer = setTimeout(() => {
		dragSettleTimer = null;
		flushNow(p);
	}, DRAG_SETTLE_MS);
}

export function socketCanvas(_canvas: Canvas, position: Canvas.ViewPosition) {
	const mode = (getSetting('cameraTrackingMode') as 'raw' | 'smooth' | 'dragRelease') ?? 'smooth';
	if (mode === 'dragRelease') {
		dragReleaseEmit(position);
	} else if (mode === 'raw') {
		throttledEmit(position);
	} else {
		smoothedEmit(position);
	}
}

// ─── Multi-GM handover ────────────────────────────────────────────────────
// Flow: claimant emits gmHandoverRequest → current active GM responds with
// gmHandoverGrant carrying their current viewport → claimant applies it and
// writes activeGMUserId. Only GMs participate.

interface GMHandoverRequestPayload { fromUserId: string; toUserId: string }
interface GMHandoverGrantPayload { viewport: { x: number; y: number; scale: number }; toUserId: string }

/** Claimant invokes this. Asks the named GM to grant control. */
export function requestGMHandover(fromUserId: string) {
	const me = (game as ReadyGame).user?.id;
	if (!me) return;
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'gmHandoverRequest',
		targetUser: fromUserId,
		payload: { fromUserId, toUserId: me } satisfies GMHandoverRequestPayload,
	});
}

async function handleGMHandoverRequest(payload: GMHandoverRequestPayload) {
	if (!(game as ReadyGame).user?.isGM) return;
	const viewport = getLocalViewport();
	if (!viewport) return;
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'gmHandoverGrant',
		targetUser: payload.toUserId,
		payload: { viewport, toUserId: payload.toUserId } satisfies GMHandoverGrantPayload,
	});
}

async function handleGMHandoverGrant(payload: GMHandoverGrantPayload) {
	const me = (game as ReadyGame).user?.id;
	if (!me || me !== payload.toUserId) return;
	if (!(game as ReadyGame).user?.isGM) return;
	clampAndApplyExternal(payload.viewport);
	await setSetting('activeGMUserId', me);
}

// ─── Preset playback broadcast ────────────────────────────────────────────
// Presets and animations play *on the OBS client*, not on the DM's machine.
// The DM that clicks the preset orchestrates state (claim control, switch
// tracking mode, pause local broadcast), then ships the preset over the wire.
// The OBS client receives it and runs the same GSAP timeline locally so the
// camera moves smoothly without dragging the DM's view along.

interface PlayPresetPayload { preset: CameraPreset }

// Track the OBS-side active controller so a new play cancels the old, and so
// the stop event has a target to kill.
let activePresetController: SequenceController | null = null;

export function broadcastPlayPreset(preset: CameraPreset) {
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'playPreset',
		targetUser: undefined,
		payload: { preset } satisfies PlayPresetPayload,
	});
}

export function broadcastStopPreset() {
	(game as ReadyGame | undefined)?.socket?.emit('module.obs-utils', {
		eventType: 'stopPreset',
		targetUser: undefined,
		payload: {},
	});
}

function handlePlayPreset(payload: PlayPresetPayload) {
	if (!isOBS()) return;
	// Cancel any preset that's still running before starting the new one —
	// otherwise looping presets would stack indefinitely.
	if (activePresetController) {
		activePresetController.stop();
		activePresetController = null;
	}
	activePresetController = playSequence(payload.preset);
}

function handleStopPreset() {
	if (!isOBS()) return;
	if (activePresetController) {
		activePresetController.stop();
		activePresetController = null;
	}
}

/**
 * Orchestrate a preset play. Called by the DM that clicked. Side-effects, all
 * sticky (never restored after the preset finishes):
 *   1. Switches both `defaultInCombat` and `defaultOutOfCombat` to `cloneDM`,
 *      since a preset is an explicit "follow me" gesture and the operator
 *      shouldn't have to redo the choice when combat starts or ends.
 *   2. Claims `activeGMUserId` so this DM owns the broadcast camera.
 *   3. Pauses the DM's outgoing viewport stream. This stays on; the operator
 *      flips it off manually once they want live tracking back.
 *   4. Broadcasts the preset; OBS clients run it locally.
 */
export async function orchestratePresetPlay(preset: CameraPreset) {
	const me = (game as ReadyGame).user?.id;
	if (!me) return;

	if (getSetting('defaultInCombat') !== 'cloneDM') {
		await setSetting('defaultInCombat', 'cloneDM');
	}
	if (getSetting('defaultOutOfCombat') !== 'cloneDM') {
		await setSetting('defaultOutOfCombat', 'cloneDM');
	}
	if (getSetting('activeGMUserId') !== me) {
		await setSetting('activeGMUserId', me);
	}
	if (!getSetting('pauseCameraTracking')) {
		await setSetting('pauseCameraTracking', true);
	}

	broadcastPlayPreset(preset);
}
