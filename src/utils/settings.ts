import { TJSGameSettings } from '#runtime/svelte/store/fvtt/settings';
import { scaleToFit, tokenMoved, viewportChanged } from './canvas';
import { ICCHOICES, MODULE_ID, NAME_TO_ICON, OOCCHOICES } from './const';
import { isOBS } from './helpers';
import { OBSRemoteSettings, OBSWebsocketSettings } from './types.ts';

export const OBSAction = {
	SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
	ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
	EnableSource: 'obs-utils.applications.obsRemote.enableSource',
	DisableSource: 'obs-utils.applications.obsRemote.disableSource',
};

const SETTINGS_VERSION = 2;

function getGM(): User {
	// @ts-expect-error Ah yes
	return game?.users?.find((user: User) => user.isGM);
}

async function changeMode() {
	if (!isOBS()) return;
	// Trigger modes after mode change, calling the methods avoids doing every conditional twice
	scaleToFit();
	tokenMoved();
	viewportChanged(getSetting('trackedUser'));
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
				new OBSRemoteSettings(),
				obssettings,
			);
			// @ts-expect-error This should not exist, which is why it's deleted here
			delete obssettings.onCloseObs;
			setSetting('obsRemote', obssettings);
		}
		if (version < 2) {
			console.warn('Migrations for Data-Model Version 2');
			let obssettings = getSetting('obsRemote');
			// Code for Migration Setting Models
			obssettings = foundry.utils.mergeObject(
				new OBSRemoteSettings(),
				obssettings,
			);
			setSetting('obsRemote', obssettings);
		}
		console.warn('OBS Utils Migrations Finished');
		setSetting('settingsVersion', SETTINGS_VERSION);
	}
}

export function getSetting<K extends ClientSettings.Key>(settingName: K): ClientSettings.SettingInitializedType<'obs-utils', K> | undefined {
	return game?.settings?.get(MODULE_ID, settingName);
}

export async function setSetting(settingName, value) {
	await game?.settings?.set(MODULE_ID, settingName, value);
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
			icon: NAME_TO_ICON[key],
			tooltip: value,
			id: key,
		});
	}
	for (const [key, value] of Object.entries(OOCCHOICES)) {
		buttonData.ooc.push({
			icon: NAME_TO_ICON[key],
			tooltip: value,
			id: key,
		});
	}
	buttonData.players = game.users?.filter(element => !(element as User).isGM) as User[];
	buttonData.onlineUsers = game.users?.filter(element => (element as User).active) as User[];
	return buttonData;
}

class OBSUtilsSettings extends TJSGameSettings {
	constructor() {
		super('obs-utils');
	}

	init() {
		const settings: TJSGameSettings.Data.GameSetting[] = [];
		settings.push(
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
			}),
		);
		settings.push(
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
			}),
		);
		settings.push(
			createSetting('clampCanvas', {
				default: false,
				type: Boolean,
				scope: 'world',
				config: false,
			}),
		);
		settings.push(
			createSetting('defaultOutOfCombat', {
				default: 'trackall',
				type: String,
				choices: OOCCHOICES,
				scope: 'world',
				config: false,
				onChange: changeMode,
			}),
		);
		settings.push(
			createSetting('defaultInCombat', {
				default: 'trackall',
				type: String,
				choices: ICCHOICES,
				scope: 'world',
				config: false,
				onChange: changeMode,
			}),
		);
		settings.push(
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
			}),
		);
		settings.push(
			createSetting('showTrackerInCombat', {
				default: false,
				type: Boolean,
				scope: 'world',
				config: true,
			}),
		);
		settings.push(
			createSetting('trackedUser', {
				default: game.userId ?? '',
				type: String,
				scope: 'world',
				config: false,
				onChange: changeMode,
			}),
		);
		settings.push(
			createSetting('pauseCameraTracking', {
				type: Boolean,
				scope: 'world',
				config: false,
				default: false,
			}),
		);
		settings.push(
			createSetting('obsRemote', {
				type: Object,
				scope: 'world',
				config: false,
				default: new OBSRemoteSettings(),
			}),
		);
		settings.push(
			createSetting('enableOBSWebsocket', {
				type: Boolean,
				scope: 'world',
				config: true,
				default: false,
			}),
		);
		settings.push(
			createSetting('websocketSettings', {
				type: Object,
				scope: 'client',
				config: false,
				default: new OBSWebsocketSettings(),
				onChange: () => foundry.utils.debouncedReload(),
			}),
		);
		settings.push(
			createSetting('streamOverlays', {
				type: Object,
				scope: 'world',
				config: false,
				default: [],
			}),
		);
		settings.push(
			createSetting('overlayActors', {
				type: Object,
				scope: 'world',
				config: false,
				default: [],
			}),
		);
		settings.push(
			createSetting('settingsVersion', {
				type: Number,
				scope: 'world',
				config: false,
				default: 2,
			}),
		);
		settings.push(
			createSetting('showAV', {
				type: Boolean,
				scope: 'world',
				config: true,
				default: false,
			}),
		);
		settings.push(
			createSetting('showUserConfig', {
				type: Boolean,
				scope: 'world',
				config: true,
				default: false,
			}),
		);
		settings.push(
			createSetting('diceSoNice', {
				default: !!game?.modules?.get('dice-so-nice')?.active,
				type: Boolean,
				scope: 'world',
				config: !!game?.modules?.get('dice-so-nice')?.active,
				requiresReload: true,
			}),
		);
		settings.push(
			createSetting('diceSoNiceOverlayWidth', {
				default: 500,
				type: Number,
				scope: 'world',
				config: !!game?.modules?.get('dice-so-nice')?.active,
				requiresReload: true,
			}),
		);
		settings.push(
			createSetting('diceSoNiceOverlayHeight', {
				default: 500,
				type: Number,
				scope: 'world',
				config: !!game?.modules?.get('dice-so-nice')?.active,
				requiresReload: true,
			}),
		);
		settings.push(
			createSetting('lastReadNotification', {
				type: String,
				scope: 'client',
				config: false,
				default: '',
			}),
		);
		settings.push(
			createSetting('fixedPopups', {
				type: Boolean,
				scope: 'world',
				config: true,
				default: false,
			}),
		);
		settings.push(
			createSetting('fixedPopupX', {
				type: Number,
				scope: 'world',
				config: true,
				default: 1000,
			}),
		);
		settings.push(
			createSetting('fixedPopupY', {
				type: Number,
				scope: 'world',
				config: true,
				default: 1000,
			}),
		);
		settings.push(
			createSetting('fixedPopupWidth', {
				type: Number,
				scope: 'world',
				config: true,
				default: 1000,
			}),
		);
		settings.push(
			createSetting('fixedPopupHeight', {
				type: Number,
				scope: 'world',
				config: true,
				default: 800,
			}),
		);
		settings.push(
			createSetting('obsMode', {
				default: false,
				type: Boolean,
				scope: 'client',
				config: true,
				requiresReload: true,
			}),
		);
		settings.push(
			createSetting('obsModeUser', {
				default: 'none',
				type: String,
				scope: 'world',
				choices: {},
				config: true,
				requiresReload: true,
			}),
		);
		settings.push(
			createSetting('obsModeGlobalDisable', {
				default: false,
				type: Boolean,
				scope: 'world',
				config: true,
				requiresReload: true,
			}),
		);

		settings.push(
			createSetting('showKeybindingPopup', {
				default: true,
				type: Boolean,
				scope: 'client',
				config: true,
			}),
		);

		settings.push(
			createSetting('smoothUserCamera', {
				type: Boolean,
				scope: 'world',
				config: true,
				default: true,
			}),
		);

		this.registerAll(settings, true);
	}
}

class RollOverlaySettings extends TJSGameSettings {
	constructor() {
		super('obs-utils');
	}

	init() {
		const settings: TJSGameSettings.Data.GameSetting[] = [];
		settings.push(
			createSetting('rollOverlayPreRollDelay', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayRollFadeIn', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayRollFadeOut', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayRollStay', {
				type: Number,
				scope: 'world',
				config: false,
				default: 5000,
			}),
		);
		settings.push(
			createSetting('rollOverlayPreRollFadeIn', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayPreRollFadeOut', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayPreRollStay', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayPostRollFadeIn', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayPostRollFadeOut', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayPostRollStay', {
				type: Number,
				scope: 'world',
				config: false,
				default: 0,
			}),
		);
		settings.push(
			createSetting('rollOverlayPreRollImage', {
				type: String,
				scope: 'world',
				config: false,
				default: '',
			}),
		);
		settings.push(
			createSetting('rollOverlayRollBackground', {
				type: String,
				scope: 'world',
				config: false,
				default: '',
			}),
		);
		settings.push(
			createSetting('rollOverlayRollForeground', {
				type: String,
				scope: 'world',
				config: false,
				default: '',
			}),
		);
		settings.push(
			createSetting('rollOverlayPostRollImage', {
				type: String,
				scope: 'world',
				config: false,
				default: '',
			}),
		);
		settings.push(
			createSetting('rollOverlayPostRollEnabled', {
				type: Boolean,
				scope: 'world',
				config: false,
				default: false,
			}),
		);
		settings.push(
			createSetting('rollOverlayPreRollEnabled', {
				type: Boolean,
				scope: 'world',
				config: false,
				default: false,
			}),
		);

		this.registerAll(settings, false);
	}
}

function createSetting(settingName: string, config: TJSGameSettings.Options.CoreSetting) {
	return {
		namespace: MODULE_ID,
		key: settingName,
		options: {
			name: `${MODULE_ID}.settings.${settingName}.Name`,
			hint: `${MODULE_ID}.settings.${settingName}.Hint`,
			...config,
		},
	};
}

export const settings = new OBSUtilsSettings();
export const rollOverlaySettings = new RollOverlaySettings();
