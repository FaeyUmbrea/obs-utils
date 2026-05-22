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

export const SETTINGS_VERSION = 4;

const OBS_MODIFIABLE_SETTINGS = new Set<ClientSettings.KeyFor<'obs-utils'>>([
	'defaultOutOfCombat',
	'defaultInCombat',
	'clampCanvas',
	'pauseCameraTracking',
	'trackedUser',
]);

async function changeMode() {
	if (!isOBS()) return;
	// Trigger modes after mode change, calling the methods avoids doing every conditional twice
	scaleToFit();
	tokenMoved();
	viewportChanged(getSetting('trackedUser') ?? '');
	const firstGM = getGM()?.id;
	if (firstGM) viewportChanged(firstGM);
}

export async function runMigrations(): Promise<void> {
	const version = (getSetting('settingsVersion') ?? 0) as number;
	if (version >= SETTINGS_VERSION) return;
	// Per-version migration code is in a separate chunk — only worlds that
	// actually need to migrate pay the bundle cost.
	const { runMigrationsImpl } = await import('./migrations.ts');
	await runMigrationsImpl(version);
}

export function getSetting<K extends ClientSettings.KeyFor<'obs-utils'>>(settingName: K): ClientSettings.SettingInitializedType<'obs-utils', K> | undefined {
	return (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, settingName);
}

export async function setSetting<K extends ClientSettings.KeyFor<'obs-utils'>>(settingName: K, value: ClientSettings.SettingCreateData<'obs-utils', K>) {
	if ((game as ReadyGame).user?.isGM) {
		await (game as ReadyGame | undefined)?.settings?.set(MODULE_ID, settingName, value);
		return;
	}
	const currentValue = getSetting(settingName);
	if (currentValue === value) {
		ensureStore(settingName).set(currentValue);
		return;
	}
	if (OBS_MODIFIABLE_SETTINGS.has(settingName) && isOBS() && getSetting('showDirectorInOBSMode') === true) {
		const hasActiveGM = !!(game as ReadyGame).users?.some((u: User) => u.isGM && u.active);
		if (!hasActiveGM) {
			return;
		}
		game.socket?.emit(`module.${MODULE_ID}`, {
			action: 'setPlayerModifiableSetting',
			settingName,
			value,
			userId: game.user?.id,
		});
		return;
	}
	const settingScope = (game as ReadyGame).settings.settings.get(`${MODULE_ID}.${settingName}`)?.scope;
	if (settingScope === 'world') {
		ensureStore(settingName).set(currentValue);
		return;
	}
	await (game as ReadyGame | undefined)?.settings?.set(MODULE_ID, settingName, value);
}

function setupOBSModifiableSettingsSocket() {
	(game as ReadyGame)?.socket?.on(`module.${MODULE_ID}`, async (data: any) => {
	// Only GMs should process these requests
		if (!(game as ReadyGame).user?.isGM) return;
		if (data.action !== 'setPlayerModifiableSetting') {
			return;
		}
		const { settingName, value, userId } = data;
		if (!(OBS_MODIFIABLE_SETTINGS.has(settingName))) {
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
	createSetting('overlayActorsModified', {
		type: Boolean,
		scope: 'world',
		config: false,
		default: false,
	});
	createSetting('globalOverlayCSS', {
		type: String,
		scope: 'world',
		config: false,
		default: '',
	});
	createSetting('actorOverlayCSS', {
		type: Object,
		scope: 'world',
		config: false,
		default: {},
	});
	createSetting('settingsVersion', {
		type: Number,
		scope: 'world',
		config: false,
		// -1 = never persisted. Only legacy Foundry-11/12 upgrade paths actually
		// ran a migration body that wrote a value here, so anything < 0 is a
		// fresh world that doesn't need any migration work.
		default: -1,
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

	// Driven from the Director's Controls panel, not the Foundry settings UI:
	//   - 'raw'         emit every viewport tick (lowest latency, jitter on receiver)
	//   - 'smooth'      moving-average smoothing on sender (default)
	//   - 'dragRelease' buffer locally; only emit once the GM stops panning
	createSetting('cameraTrackingMode', {
		type: String,
		scope: 'world',
		config: false,
		default: 'smooth',
	});

	createSetting('cameraSmoothing', {
		type: Number,
		scope: 'world',
		config: false,
		default: 400,
		range: { min: 0, max: 1500, step: 50 },
	});

	createSetting('cameraEasing', {
		type: String,
		scope: 'world',
		config: false,
		default: 'easeOutCircle',
	});

	createSetting('activeGMUserId', {
		type: String,
		scope: 'world',
		config: false,
		default: '',
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

export function initOverlayDefaultsHooks() {
	Hooks.on('updateUser', (_user: User, diff: Record<string, any>) => {
		if (!(game as ReadyGame).user?.isGM) return;
		if (getSetting('overlayActorsModified')) return;
		if (diff.character === undefined && diff.character !== null) return;
		const userActors = (game as ReadyGame).users?.filter((u: User) => !u.isGM && !!(u as any).character).map((u: User) => ((u as any).character as Actor)?.id).filter(Boolean) as string[] ?? [];
		setSetting('overlayActors', userActors).then();
	});
}
