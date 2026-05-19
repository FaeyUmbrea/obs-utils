import type { ReadyGame } from 'fvtt-types/configuration';
import { ObsUtilsApi, registerDefaultTypes } from './utils/api.js';
import { expandTokenHud, isGM } from './utils/canvas.ts';
import { backfillIds } from './utils/cssInjection.ts';
import { initDirectorStateBridge } from './utils/directorState.ts';
import { isManualOBS, isOBS, removeBG } from './utils/helpers.js';
import { registerKeybindings } from './utils/keybinds.ts';
import { initOBS } from './utils/obs.ts';
import { getSetting, initOverlayDefaultsHooks, initSettings, runMigrations, setSetting } from './utils/settings.ts';
import { activateViewportTracking, deactivateViewportTracking, socketCanvas } from './utils/socket.js';

// Conditionally load the polyfill module only when the host browser is missing
// one or more of the features it polyfills (e.g., Chromium 127 in OBS, where
// Foundry V14 was only verified against Chromium 146). The polyfill file is
// emitted as its own chunk and is not fetched on a fully-featured browser.
async function loadPolyfillsIfNeeded() {
	if (
		typeof (RegExp as any).escape !== 'function'
		|| typeof (Error as any).isError !== 'function'
		|| typeof (Intl as any).DurationFormat !== 'function'
	) {
		await import('./utils/polyfill.ts');
	}
}

async function start() {
	await loadPolyfillsIfNeeded();
	removeBG();
	Hooks.once('init', async () => {
		// Register API
		const moduleData = (game as ReadyGame | undefined)?.modules?.get('obs-utils');
		if (moduleData) {
			moduleData.api = new ObsUtilsApi();
			registerDefaultTypes();
			Hooks.call('obs-utils.init');
		}

		initSettings();
		initOverlayDefaultsHooks();
		initDirectorStateBridge();
		registerKeybindings();

		// Load UI Component only on /game
		if ((game as ReadyGame).view === 'game') {
			const ui = await import('./utils/ui.ts');
			ui.registerUI();
		}

		// Load OBS Stuff only in OBS
		if (isOBS()) {
			initOBS();
		}
	});

	Hooks.once('ready', async () => {
		if (isGM()) {
			// @ts-expect-error Typed incorrectly
			Hooks.on('renderTokenHUD', expandTokenHud);
			runMigrations();
			// Stamp any pre-existing overlays/components with stable IDs (one-time, idempotent).
			const overlays = getSetting('streamOverlays');
			if (backfillIds(overlays)) {
				await setSetting('streamOverlays', overlays!);
			}
		}
		if (isOBS()) {
			// Simulate a user interaction to start video playback
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
			if (isManualOBS()) {
				// @ts-expect-error doing some funky stuff here
				ui?.notifications?.warn((game as ReadyGame).i18n.localize('obs-utils.strings.manualOBSWarning'), { obsLocal: true });
			}
		}

		// Update obsModeUser choice list once usernames are available
		(game as ReadyGame)!.settings!.settings!.get('obs-utils.obsModeUser')!.choices = Object.fromEntries(
			[['none', 'None']].concat(
				(game as ReadyGame | undefined)?.users?.filter(
					(e: User) =>
						!e.isGM || (game as ReadyGame).users.filter((user: User) => user.isGM).length > 1,
				).map(e => [e.id, e.name]) ?? [[]],
			),
		);
	});

	Hooks.on('canvasTearDown', deactivateViewportTracking);
	Hooks.on('canvasPan', socketCanvas);
	Hooks.on('canvasReady', activateViewportTracking);

	// Register updateActor for System agnostic default. This allows for custom and system-specific actor refresh triggers.
	Hooks.on('updateActor', actor =>
		Hooks.call('obs-utils.refreshActor', actor));

	// Fire built-in overlay triggers off Foundry chat. Public rolls fire
	// core.onPlayerRoll with critical/fumble derived from the first d20 die;
	// every public message fires core.onChatMessage.
	Hooks.on('createChatMessage', (message: any) => {
		const api = (game as ReadyGame | undefined)?.modules?.get('obs-utils')?.api as ObsUtilsApi | undefined;
		if (!api) return;
		if (message.whisper?.length) return;
		const actor = (game as ReadyGame | undefined)?.actors?.get(message.speaker?.actor) ?? undefined;
		const rolls = message.rolls ?? (message.roll ? [message.roll] : []);
		if (message.isRoll && rolls.length > 0) {
			const total = rolls.reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);
			const formula = rolls.map((r: any) => r.formula).join(' + ');
			const d20 = rolls[0]?.dice?.find((d: any) => d.faces === 20);
			const firstD20 = d20?.results?.[0]?.result;
			api.fireOverlayTrigger('core.onPlayerRoll', {
				actor,
				roll: rolls[0],
				total,
				formula,
				isCritical: firstD20 === 20,
				isFumble: firstD20 === 1,
			});
		}
		api.fireOverlayTrigger('core.onChatMessage', {
			message,
			content: message.content ?? '',
			speakerAlias: message.speaker?.alias ?? '',
		});
	});

	// @ts-expect-error Bluh
	Hooks.on('getSceneControlButtons', buildButtons);
}
start();

function isDirectorUser() {
	if ((game as ReadyGame).user?.isGM) {
		return true;
	}
	if (getSetting('showDirectorInOBSMode') && isOBS()) {
		return true;
	}
	return false;
}

function buildButtons(buttons: any) {
	if (!isDirectorUser()) {
		return;
	}
	const buttonGroup = buttons.tokens;
	const newButton = {
		icon: 'fa-solid fa-signal-stream',
		name: 'openStreamDirector',
		title: 'Open Stream Director',
		toggle: true,
		onChange: async () => {
			const ui = await import('./utils/ui.ts');
			await ui.openDirector(newButton);
		},
	};
	buttonGroup.tools.openStreamDirector = newButton;
}
