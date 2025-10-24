import type { ReadyGame } from 'fvtt-types/configuration';
import type { Readable, Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { scaleToFit, tokenMoved, viewportChanged } from './canvas';
import { ICCHOICES, MODULE_ID, NAME_TO_ICON, OOCCHOICES } from './const';
import { getGM, isOBS } from './helpers';
import { OBSRemoteSettings, OBSWebsocketSettings } from './types.ts';

export const OBSAction = {
	SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
	ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
	EnableSource: 'obs-utils.applications.obsRemote.enableSource',
	DisableSource: 'obs-utils.applications.obsRemote.disableSource',
};

const SETTINGS_VERSION = 2;

const OBS_MODIFIABLE_SETTINGS = [
	'defaultOutOfCombat',
	'defaultInCombat',
	'clampCanvas',
	'pauseCameraTracking',
	'trackedUser',
] as const;

async function changeMode() {
	if (!isOBS()) return;
	// Trigger modes after mode change, calling the methods avoids doing every conditional twice
	scaleToFit();
	tokenMoved();
	viewportChanged(getSetting('trackedUser') ?? '');
	const firstGM = getGM()?.id;
	if (firstGM) viewportChanged(firstGM);
}

export function runMigrations() {
	const version = getSetting('settingsVersion') ?? 0;
	if (version < SETTINGS_VERSION) {
		console.warn('Running OBS Utils Migrations');
		if (version < 1) {
			console.warn('Migrations for Data-Model Version 1');
			let obssettings = getSetting('websocketSettings');
			// Code for Migration Setting Models
			obssettings = foundry.utils.mergeObject(
				new OBSWebsocketSettings(),
				obssettings,
			);
			// @ts-expect-error should not exist, which is why its deleted
			delete obssettings.onCloseObs;
			setSetting('websocketSettings', obssettings).then();
		}
		if (version < 2) {
			console.warn('Migrations for Data-Model Version 2');
			let obssettings = getSetting('obsRemote');
			// Code for Migration Setting Models
			obssettings = foundry.utils.mergeObject(
				new OBSRemoteSettings(),
				obssettings,
			);
			setSetting('obsRemote', obssettings).then();
		}
		console.warn('OBS Utils Migrations Finished');
		setSetting('settingsVersion', SETTINGS_VERSION).then();
	}
}

export function getSetting<K extends ClientSettings.KeyFor<'obs-utils'>>(settingName: K): ClientSettings.SettingInitializedType<'obs-utils', K> | undefined {
	return (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, settingName);
}

export async function setSetting<K extends ClientSettings.KeyFor<'obs-utils'>>(settingName: K, value: ClientSettings.SettingCreateData<'obs-utils', K>) {
	if ((game as ReadyGame).user?.isGM) {
		await (game as ReadyGame | undefined)?.settings?.set(MODULE_ID, settingName, value);
		return;
	}
	if (OBS_MODIFIABLE_SETTINGS.includes(settingName as any) && isOBS() && getSetting('showDirectorInOBSMode') === true) {
		const hasActiveGM = !!(game as ReadyGame).users?.some((u: User) => u.isGM && u.active);
		if (!hasActiveGM) {
			console.warn('No active GM to process setting change.');
			ensureStore(settingName).set(getSetting(settingName) as any);
			return;
		}
		game.socket?.emit(`module.${MODULE_ID}`, {
			action: 'setPlayerModifiableSetting',
			settingName,
			value,
			userId: game.user?.id,
		});
	}
}

function setupOBSModifiableSettingsSocket() {
	(game as ReadyGame)?.socket?.on(`module.${MODULE_ID}`, async (data: any) => {
	// Only GMs should process these requests
		if (!(game as ReadyGame).user?.isGM) return;
		if (data.action !== 'setPlayerModifiableSetting') {
			return;
		}
		const { settingName, value, userId } = data;
		if (!(OBS_MODIFIABLE_SETTINGS.includes(settingName as any))) {
			console.warn(`Player ${userId} attempted to change non-modifiable setting: ${settingName}`);
			return;
		}
		const primaryGM = (game as ReadyGame).users?.find((u: User) => u.isGM && u.active) ?? (game as ReadyGame).users?.find((u: User) => u.isGM);
		if (primaryGM && (game as ReadyGame).user?.id !== primaryGM.id) {
			return;
		}
		await setSetting(settingName, value);
	});
}

Hooks.once('ready', () => {
	setupOBSModifiableSettingsSocket();
});

interface ButtonData {
	icon: string;
	tooltip: string;
	id: string;
}

export function generateDataBlockFromSetting() {
	const buttonData: { ic: ButtonData[]; ooc: ButtonData[]; players: User[]; onlineUsers: User[] } = {
		ic: [],
		ooc: [],
		players: [],
		onlineUsers: [],
	};

	for (const [key, value] of Object.entries(ICCHOICES)) {
		buttonData.ic.push({
			icon: NAME_TO_ICON[key] ?? 'fas fa-question',
			tooltip: value,
			id: key,
		});
	}
	for (const [key, value] of Object.entries(OOCCHOICES)) {
		buttonData.ooc.push({
			icon: NAME_TO_ICON[key] ?? 'fas fa-question',
			tooltip: value,
			id: key,
		});
	}
	buttonData.players = (game as ReadyGame).users?.filter(element => !(element as User).isGM) as User[];
	buttonData.onlineUsers = (game as ReadyGame).users?.filter((element: User) => element.active) as User[];
	return buttonData;
}

export function	initSettings() {
	createSetting('minScale', {
		default: 0.1,
		type: Number,
		range: {
			min: 0.01,
			max: 5,
			step: 0.01,
		},
		scope: 'world',
		config: true,
	});
	createSetting('maxScale', {
		default: 2,
		type: Number,
		range: {
			min: 0.01,
			max: 5,
			step: 0.01,
		},
		scope: 'world',
		config: true,
	});

	createSetting('clampCanvas', {
		default: false,
		type: Boolean,
		scope: 'world',
		config: false,
	});

	createSetting('defaultOutOfCombat', {
		default: 'trackall',
		type: String,
		choices: OOCCHOICES,
		scope: 'world',
		config: false,
		onChange: changeMode,
	});

	createSetting('defaultInCombat', {
		default: 'trackall',
		type: String,
		choices: ICCHOICES,
		scope: 'world',
		config: false,
		onChange: changeMode,
	});

	createSetting('popupCloseDelay', {
		default: 10,
		type: Number,
		range: {
			min: 0,
			max: 300,
			step: 1,
		},
		scope: 'world',
		config: true,
	});

	createSetting('showTrackerInCombat', {
		default: false,
		type: Boolean,
		scope: 'world',
		config: true,
	});

	createSetting('trackedUser', {
		default: (game as ReadyGame).userId ?? '',
		type: String,
		scope: 'world',
		config: false,
		onChange: changeMode,
	});

	createSetting('pauseCameraTracking', {
		type: Boolean,
		scope: 'world',
		config: false,
		default: false,
	});

	createSetting('obsRemote', {
		type: Object,
		scope: 'world',
		config: false,
		default: new OBSRemoteSettings(),
	});

	createSetting('enableOBSWebsocket', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
	});

	createSetting('allowWebsocketAPI', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
	});
	createSetting('websocketSettings', {
		type: Object,
		scope: 'client',
		config: false,
		default: new OBSWebsocketSettings(),
		onChange: () => foundry.utils.debouncedReload(),
	});

	createSetting('streamOverlays', {
		type: Object,
		scope: 'world',
		config: false,
		default: [],
	});

	createSetting('overlayActors', {
		type: Object,
		scope: 'world',
		config: false,
		default: [],
	});
	createSetting('settingsVersion', {
		type: Number,
		scope: 'world',
		config: false,
		default: 2,
	});

	createSetting('showAV', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
	});

	createSetting('showUserConfig', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
	});

	createSetting('diceSoNice', {
		default: !!(game as ReadyGame | undefined)?.modules?.get('dice-so-nice')?.active,
		type: Boolean,
		scope: 'world',
		config: !!(game as ReadyGame | undefined)?.modules?.get('dice-so-nice')?.active,
		requiresReload: true,
	});

	createSetting('diceSoNiceOverlayWidth', {
		default: 500,
		type: Number,
		scope: 'world',
		config: !!(game as ReadyGame | undefined)?.modules?.get('dice-so-nice')?.active,
		requiresReload: true,
	});

	createSetting('diceSoNiceOverlayHeight', {
		default: 500,
		type: Number,
		scope: 'world',
		config: !!(game as ReadyGame | undefined)?.modules?.get('dice-so-nice')?.active,
		requiresReload: true,
	});

	createSetting('fixedPopups', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
	});

	createSetting('fixedPopupX', {
		type: Number,
		scope: 'world',
		config: true,
		default: 1000,
	});

	createSetting('fixedPopupY', {
		type: Number,
		scope: 'world',
		config: true,
		default: 1000,
	});

	createSetting('fixedPopupWidth', {
		type: Number,
		scope: 'world',
		config: true,
		default: 1000,
	});

	createSetting('fixedPopupHeight', {
		type: Number,
		scope: 'world',
		config: true,
		default: 800,
	});

	createSetting('obsMode', {
		default: false,
		type: Boolean,
		scope: 'client',
		config: true,
		requiresReload: true,
	});

	createSetting('obsModeUser', {
		default: 'none',
		type: String,
		scope: 'world',
		choices: {},
		config: true,
		requiresReload: true,
	});
	createSetting('obsModeGlobalDisable', {
		default: false,
		type: Boolean,
		scope: 'world',
		config: true,
		requiresReload: true,
	});

	createSetting('forceStreamPageOBSMode', {
		default: false,
		type: Boolean,
		scope: 'world',
		config: true,
		requiresReload: true,
	});

	createSetting('showKeybindingPopup', {
		default: true,
		type: Boolean,
		scope: 'user',
		config: true,
	});

	createSetting('smoothUserCamera', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: true,
	});

	createSetting('proxyOBSMessages', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
	});

	createSetting('showChatNotificationsOnCanvas', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
		requiresReload: true,
	});

	createSetting('leftAlignChatNotifications', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
		requiresReload: true,
	});

	createSetting('trackObserverTokens', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
		onChange: changeMode,
	});

	createSetting('showDirectorInOBSMode', {
		type: Boolean,
		scope: 'world',
		config: true,
		default: false,
		requiresReload: true,
	});
}

export function	initRollOverlaySettings() {
	createSetting('rollOverlayPreRollDelay', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});
	createSetting('rollOverlayRollFadeIn', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});

	createSetting('rollOverlayRollFadeOut', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});

	createSetting('rollOverlayRollStay', {
		type: Number,
		scope: 'world',
		config: false,
		default: 5000,
	});

	createSetting('rollOverlayPreRollFadeIn', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});

	createSetting('rollOverlayPreRollFadeOut', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});

	createSetting('rollOverlayPreRollStay', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});

	createSetting('rollOverlayPostRollFadeIn', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});
	createSetting('rollOverlayPostRollFadeOut', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});
	createSetting('rollOverlayPostRollStay', {
		type: Number,
		scope: 'world',
		config: false,
		default: 0,
	});

	createSetting('rollOverlayPreRollImage', {
		type: String,
		scope: 'world',
		config: false,
		default: '',
	});

	createSetting('rollOverlayRollBackground', {
		type: String,
		scope: 'world',
		config: false,
		default: '',
	});

	createSetting('rollOverlayRollForeground', {
		type: String,
		scope: 'world',
		config: false,
		default: '',
	});

	createSetting('rollOverlayPostRollImage', {
		type: String,
		scope: 'world',
		config: false,
		default: '',
	});

	createSetting('rollOverlayPostRollEnabled', {
		type: Boolean,
		scope: 'world',
		config: false,
		default: false,
	});

	createSetting('rollOverlayPreRollEnabled', {
		type: Boolean,
		scope: 'world',
		config: false,
		default: false,
	});
}

type StoreMap = Map<string, Writable<any>>;
const stores: StoreMap = new Map();

/**
 * Get a readable store for a setting key, if it exists.
 */
export function getReadableStore<T = any>(key: ClientSettings.KeyFor<'obs-utils'>): Readable<T> | undefined {
	const s = stores.get(key as string);
	return s ? { subscribe: s.subscribe } : undefined;
}

/**
 * Get a writable store for a setting key, if it exists.
 */
export function getStore<K extends ClientSettings.KeyFor<'obs-utils'>, T = ClientSettings.SettingInitializedType<'obs-utils', K>>(key: K): Writable<T> {
	return stores.get(key as string) as Writable<T>;
}

/**
 * Internal: ensure a store exists for key, initialized from game settings.
 * Also wires two-way sync between the store and Foundry settings.
 */
function ensureStore<T = any>(key: ClientSettings.KeyFor<'obs-utils'>): Writable<T> {
	let store = stores.get(key as string) as Writable<T> | undefined;
	if (store) return store;

	// Initialize with current value (or undefined until Foundry returns)
	const initial = getSetting(key);
	store = writable<T>(initial as T);
	stores.set(key as string, store);

	// Gate to avoid loops when syncing both ways
	let gate = false;

	// When Foundry setting changes -> update store
	Hooks.on('updateSetting', (data: any) => {
		const fullKey: string | undefined
			= typeof data?.key === 'string' ? data.key : (typeof data?.key === 'object' ? data?.key?.key : undefined);
		const namespace: string | undefined
			= typeof data?.namespace === 'string' ? data.namespace : data?.key?.namespace;

		const matches
			= (namespace === MODULE_ID && data?.key === key)
				|| fullKey === `${MODULE_ID}.${key}`;

		if (!matches) return;

		if (!gate) {
			gate = true;
			store!.set((game as ReadyGame).settings.get(MODULE_ID, key) as T);
			gate = false;
		}
	});

	// When store changes -> set Foundry setting (skip the very first emission which is initial)
	let first = true;
	store.subscribe(async (value) => {
		if (first) {
			first = false;
			return;
		}
		if (!gate && game.ready) {
			gate = true;
			// await (game as ReadyGame).settings.set(MODULE_ID, key, value as any);
			await setSetting(key, value as any);
			gate = false;
		}
	});

	return store;
}

// Change: createSetting now also creates/wires the Svelte store for the setting key.
function createSetting(settingName: ClientSettings.KeyFor<'obs-utils'>, config: any) {
	(game as ReadyGame).settings.register(MODULE_ID, settingName, {
		name: `${MODULE_ID}.settings.${settingName}.Name`,
		hint: `${MODULE_ID}.settings.${settingName}.Hint`,
		...config,
		onChange: (value: unknown) => {
			if (typeof config?.onChange === 'function') {
				try {
					config.onChange(value);
				} catch (e) {
					console.error(e);
				}
			}
			const store = ensureStore(settingName);
			store.set(value);
		},
	});

	const store = ensureStore(settingName);
	store.set((game as ReadyGame).settings.get(MODULE_ID, settingName));
}

export const settings = {
	getSetting,
	setSetting,
	getStore,
	getReadableStore,
};

export function getPlayerRollStores() {
	const pre = settings.getStore('rollOverlayPostRollEnabled');
	const post = settings.getStore('rollOverlayPreRollEnabled');

	const preRollDelay = settings.getStore('rollOverlayPreRollDelay');
	const preRollStay = settings.getStore('rollOverlayPreRollStay');
	const preRollFadeIn = settings.getStore('rollOverlayPreRollFadeIn');
	const preRollFadeOut = settings.getStore('rollOverlayPreRollFadeOut');

	const rollStay = settings.getStore('rollOverlayRollStay');
	const rollFadeIn = settings.getStore('rollOverlayRollFadeIn');
	const rollFadeOut = settings.getStore('rollOverlayRollFadeOut');

	const postRollStay = settings.getStore('rollOverlayPostRollStay');
	const postRollFadeIn = settings.getStore('rollOverlayPostRollFadeIn');
	const postRollFadeOut = settings.getStore('rollOverlayPostRollFadeOut');

	const preRollImage = settings.getStore('rollOverlayPreRollImage');
	const rollBackgroundImage = settings.getStore('rollOverlayRollBackground');
	const rollForegroundImage = settings.getStore('rollOverlayRollForeground');
	const postRollImage = settings.getStore('rollOverlayPostRollImage');

	return {
		pre,
		post,
		preRollDelay,
		preRollStay,
		preRollFadeIn,
		preRollFadeOut,
		rollStay,
		rollFadeIn,
		rollFadeOut,
		postRollStay,
		postRollFadeIn,
		postRollFadeOut,
		preRollImage,
		rollBackgroundImage,
		rollForegroundImage,
		postRollImage,
	};
}
