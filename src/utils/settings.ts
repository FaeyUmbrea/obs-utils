import type { ReadyGame } from 'fvtt-types/configuration';
import type { Readable, Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { ICCHOICES, MODULE_ID, NAME_TO_ICON, OOCCHOICES } from './const';
import { isOBS } from './helpers';

export const OBSAction = {
	SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
	ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
	EnableSource: 'obs-utils.applications.obsRemote.enableSource',
	DisableSource: 'obs-utils.applications.obsRemote.disableSource',
};

export const SETTINGS_VERSION = 4;

export const OBS_MODIFIABLE_SETTINGS = new Set<ClientSettings.KeyFor<'obs-utils'>>([
	'defaultOutOfCombat',
	'defaultInCombat',
	'clampCanvas',
	'pauseCameraTracking',
	'trackedUser',
]);

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
export function ensureStore<T = any>(key: ClientSettings.KeyFor<'obs-utils'>): Writable<T> {
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

export const settings = {
	getSetting,
	setSetting,
	getStore,
	getReadableStore,
};
