import { ObsUtilsApi, registerDefaultTypes } from './utils/api.js';
import { expandTokenHud, isGM } from './utils/canvas.ts';
import { isOBS, removeBG } from './utils/helpers.js';
import { registerKeybindings } from './utils/keybinds.ts';
import { initOBS } from './utils/obs.ts';
import { rollOverlaySettings, runMigrations, settings } from './utils/settings.ts';
import { activateViewportTracking, deactivateViewportTracking, socketCanvas } from './utils/socket.js';

function start() {
	removeBG();
	Hooks.once('init', async () => {
		// Register API
		const moduleData = game?.modules?.get('obs-utils');
		if (moduleData) {
			moduleData.api = new ObsUtilsApi();
			registerDefaultTypes();
			Hooks.call('obs-utils.init');
		}

		settings.init();
		rollOverlaySettings.init();
		registerKeybindings();

		// Load UI Component only on /game
		if (game.view === 'game') {
			const ui = await import('./utils/ui.ts');
			ui.registerUI();

			// Show notifications panel if UI is loaded
			Hooks.once('ready', () => ui.showNotifications());
		}

		// Load OBS Stuff only in OBS
		if (isOBS()) {
			initOBS();
		}
	});

	Hooks.once('ready', async () => {
		if (isGM()) {
			Hooks.on('renderTokenHUD', expandTokenHud);
			runMigrations();
		}
		if (isOBS()) {
			// Simulate a user interaction to start video playback
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
		}

		// Update obsModeUser choice list once usernames are available
		game.settings.settings.get('obs-utils.obsModeUser').choices
      = Object.fromEntries(
				[['none', 'None']].concat(
					game.users
						.filter(
							e =>
								!e.isGM || game.users.filter(user => user.isGM).length > 1,
						)
						.map(e => [e.id, e.name]),
				),
			);
	});

	Hooks.on('canvasTearDown', deactivateViewportTracking);
	Hooks.on('canvasPan', socketCanvas);
	Hooks.on('canvasReady', activateViewportTracking);

	// Register updateActor for System agnostic default. This allows for custom and system-specific actor refresh triggers.
	Hooks.on('updateActor', actor =>
		Hooks.call('obs-utils.refreshActor', actor));

	Hooks.on('getSceneControlButtons', buildButtons);
}
start();

function buildButtons(buttons) {
	if (!game.user?.isGM) return;
	const buttonGroup = buttons.find(element => element.name === 'token');
	const newButton = {
		icon: 'fa-solid fa-signal-stream',
		name: 'openStreamDirector',
		title: 'Open Stream Director',
		toggle: true,
		onClick: async () => {
			const ui = await import('./utils/ui.ts');
			await ui.openDirector(newButton);
		},
	};
	buttonGroup?.tools.push(newButton);
}
