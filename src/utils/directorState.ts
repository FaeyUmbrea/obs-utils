import { getSetting } from './settings.ts';

export interface DirectorState {
	/** The user-configured tracking mode when combat is active. */
	trackingModeInCombat: string;
	/** The user-configured tracking mode out of combat. */
	trackingModeOutOfCombat: string;
	/** Whether a combat is currently active. */
	isInCombat: boolean;
	/** The currently-active tracking mode (in-combat or out-of-combat depending on state). */
	activeTrackingMode: string;
	/** User ID of the OBS-mode (focused) user, or null. */
	obsModeUserId: string | null;
}

export function getDirectorState(): DirectorState {
	const trackingModeInCombat = (getSetting('defaultInCombat') as string | undefined) ?? '';
	const trackingModeOutOfCombat = (getSetting('defaultOutOfCombat') as string | undefined) ?? '';
	const isInCombat = !!(game as ReadyGame | undefined)?.combat?.started;
	const obsModeUserId = (getSetting('obsModeUser') as string | undefined) ?? null;
	return {
		trackingModeInCombat,
		trackingModeOutOfCombat,
		isInCombat,
		activeTrackingMode: isInCombat ? trackingModeInCombat : trackingModeOutOfCombat,
		obsModeUserId: obsModeUserId === 'none' ? null : obsModeUserId,
	};
}

let prev: DirectorState | undefined;

function emitIfChanged() {
	const next = getDirectorState();
	const changed = !prev
		|| prev.trackingModeInCombat !== next.trackingModeInCombat
		|| prev.trackingModeOutOfCombat !== next.trackingModeOutOfCombat
		|| prev.isInCombat !== next.isInCombat
		|| prev.obsModeUserId !== next.obsModeUserId;
	if (!changed) return;
	const before = prev;
	prev = next;
	// Cast required — fvtt-types only knows built-in hook names.
	(Hooks.callAll as (hook: string, ...args: any[]) => boolean)('obs-utils.director.stateChanged', next, before);
}

/**
 * Wire Foundry hooks that observe Director-state inputs (settings + combat) and
 * re-emit a unified `obs-utils.director.stateChanged` hook. Consumers can read
 * the new state from the hook payload or via `getDirectorState()`.
 */
export function initDirectorStateBridge() {
	prev = getDirectorState();
	// Re-emit on relevant setting changes.
	(Hooks.on as (hook: string, fn: (...args: any[]) => void) => number)('updateSetting', (setting: any) => {
		if (typeof setting?.key !== 'string') return;
		if (!setting.key.startsWith('obs-utils.')) return;
		const k = setting.key.slice('obs-utils.'.length);
		if (k === 'defaultInCombat' || k === 'defaultOutOfCombat' || k === 'obsModeUser') {
			emitIfChanged();
		}
	});
	// Re-emit on combat lifecycle.
	Hooks.on('combatStart', emitIfChanged);
	Hooks.on('deleteCombat', emitIfChanged);
}
