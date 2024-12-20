import type { ComponentConstructorOptions, SvelteComponent } from 'svelte';
import type { ObsUtilsApi } from './utils/api';
import type { OBSRemoteSettings, OBSWebsocketSettings } from './utils/types.ts';

declare global {
	class obsUtilsModule extends Module {
		api: ObsUtilsApi;
	}

	interface SvelteComponentConstructor {
		new (options: ComponentConstructorOptions): SvelteComponent;
	}

	interface ModuleConfig {
		'obs-utils': {
			api: ObsUtilsApi;
		};
	}

	interface CharacterDataSource {
		character: typeof Actor;
	}

	interface SourceConfig {
		Actor: CharacterDataSource;
	}

	interface FlagConfig {
		Token: {
			'obs-utils': {
				tracked: boolean;
			};
		};
	}

	interface SettingConfig {
		'obs-utils.minScale': number;
		'obs-utils.maxScale': number;
		'obs-utils.clampCanvas': boolean;
		'obs-utils.defaultOutOfCombat': string;
		'obs-utils.defaultInCombat': string;
		'obs-utils.popupCloseDelay': number;
		'obs-utils.showTrackerInCombat': boolean;
		'obs-utils.trackedUser': string;
		'obs-utils.pauseCameraTracking': boolean;
		'obs-utils.obsRemote': typeof OBSRemoteSettings;
		'obs-utils.enableOBSWebsocket': boolean;
		'obs-utils.websocketSettings': typeof OBSWebsocketSettings;
		'obs-utils.streamOverlays': typeof OverlayData[];
		'obs-utils.overlayActors': string[];
		'obs-utils.settingsVersion': number;
		'obs-utils.showAV': boolean;
		'obs-utils.showUserConfig': boolean;
		'obs-utils.diceSoNice': boolean;
		'obs-utils.diceSoNiceOverlayWidth': number;
		'obs-utils.diceSoNiceOverlayHeight': number;
		'obs-utils.lastReadNotification': string;
		'obs-utils.fixedPopups': boolean;
		'obs-utils.fixedPopupX': number;
		'obs-utils.fixedPopupY': number;
		'obs-utils.fixedPopupWidth': number;
		'obs-utils.fixedPopupHeight': number;
		'obs-utils.obsMode': boolean;
		'obs-utils.obsModeUser': string;
		'obs-utils.obsModeGlobalDisable': boolean;
		'obs-utils.showKeybindingPopup': boolean;
		'obs-utils.smoothUserCamera': boolean;
		'obs-utils.rollOverlayPreRollDelay': number;
		'obs-utils.rollOverlayRollFadeIn': number;
		'obs-utils.rollOverlayRollFadeOut': number;
		'obs-utils.rollOverlayRollStay': number;
		'obs-utils.rollOverlayPreRollFadeIn': number;
		'obs-utils.rollOverlayPreRollFadeOut': number;
		'obs-utils.rollOverlayPreRollStay': number;
		'obs-utils.rollOverlayPostRollFadeIn': number;
		'obs-utils.rollOverlayPostRollFadeOut': number;
		'obs-utils.rollOverlayPostRollStay': number;
		'obs-utils.rollOverlayPreRollImage': string;
		'obs-utils.rollOverlayRollBackground': string;
		'obs-utils.rollOverlayRollForeground': string;
		'obs-utils.rollOverlayPostRollImage': string;
		'obs-utils.rollOverlayPostRollEnabled': boolean;
		'obs-utils.rollOverlayPreRollEnabled': boolean;
	}

}
