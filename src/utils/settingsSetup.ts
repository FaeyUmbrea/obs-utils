import type { ReadyGame } from 'fvtt-types/configuration';
import { scaleToFit, tokenMoved, viewportChanged } from './canvas';
import { ICCHOICES, MODULE_ID, OOCCHOICES } from './const';
import { getGM, isOBS } from './helpers';
import { ensureStore, getSetting, OBS_MODIFIABLE_SETTINGS, setSetting } from './settings.ts';
import { OBSRemoteSettings, OBSWebsocketSettings } from './types.ts';

async function changeMode() {
	if (!isOBS()) return;
	// Trigger modes after mode change, calling the methods avoids doing every conditional twice
	scaleToFit();
	tokenMoved();
	viewportChanged(getSetting('trackedUser') ?? '');
	const firstGM = getGM()?.id;
	if (firstGM) viewportChanged(firstGM);
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

export function initOverlayDefaultsHooks() {
	Hooks.on('updateUser', (_user: User, diff: Record<string, any>) => {
		if (!(game as ReadyGame).user?.isGM) return;
		if (getSetting('overlayActorsModified')) return;
		if (diff.character === undefined && diff.character !== null) return;
		const userActors = (game as ReadyGame).users?.filter((u: User) => !u.isGM && !!(u as any).character).map((u: User) => ((u as any).character as Actor)?.id).filter(Boolean) as string[] ?? [];
		setSetting('overlayActors', userActors).then();
	});
}
