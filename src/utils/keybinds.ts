import { toggleToken } from './canvas.ts';
import { ICCHOICES, MODULE_ID, OOCCHOICES } from './const.js';
import { getSetting, setSetting } from './settings.ts';

export function registerKeybindings() {
	Object.entries(ICCHOICES).forEach(([choice, name], index) => {
		registerKeybinding(
			choice,
			name,
			'obs-utils.strings.ic',
			`Digit${index + 1}`,
			[foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT, foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL],
			'defaultInCombat',
		);
	});
	Object.entries(OOCCHOICES).forEach(([choice, name], index) => {
		registerKeybinding(
			choice,
			name,
			'obs-utils.strings.ooc',
			`Digit${index + 1}`,
			[foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT],
			'defaultOutOfCombat',
		);
	});
	(game as ReadyGame).keybindings.register(MODULE_ID, 'disableOBSMode', {
		editable: [{ key: 'KeyO', modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT, foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT, foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL] }],
		name: 'obs-utils.strings.disableOBSMode',
		hint: 'obs-utils.strings.disableOBSModeHint',
		onDown: () => {
			setSetting('obsMode', false).then();
		},
	});
	(game as ReadyGame).keybindings.register(MODULE_ID, 'toggleTokenTracking', {
		editable: [{ key: 'KeyT', modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
		// The flag write is a document update, so this is GM-only for the same
		// reason the token HUD toggle is. `restricted` also hides it from a
		// player's controls config entirely.
		restricted: true,
		name: 'obs-utils.strings.toggleTokenTracking',
		hint: 'obs-utils.strings.toggleTokenTrackingHint',
		onDown: () => {
			const layer = (game as ReadyGame).canvas?.tokens;
			if (!layer) return;
			// Controlled tokens win; the hovered token is the fallback, matching
			// how core targeting behaves.
			const targets = layer.controlled.length ? layer.controlled : layer.hover ? [layer.hover] : [];
			if (!targets.length) return;

			const tracked: string[] = [];
			const untracked: string[] = [];
			targets.forEach((token) => {
				const name = token.document.name ?? '';
				(toggleToken(token.document) ? tracked : untracked).push(name);
			});

			// Manual tracking has no visible token state outside the HUD, which
			// isn't open when a hotkey is pressed — without this the key looks dead.
			if (!getSetting('showKeybindingPopup')) return;
			const i18n = (game as ReadyGame).i18n;
			const prefix = i18n.localize('obs-utils.strings.module');
			if (tracked.length) {
				ui?.notifications?.info(`${prefix} | ${i18n.format('obs-utils.strings.tokenTrackingOn', { names: tracked.join(', ') })}`);
			}
			if (untracked.length) {
				ui?.notifications?.info(`${prefix} | ${i18n.format('obs-utils.strings.tokenTrackingOff', { names: untracked.join(', ') })}`);
			}
		},
	});
}

function registerKeybinding<K extends ClientSettings.KeyFor<'obs-utils'>>(choice: ClientSettings.SettingCreateData<'obs-utils', K>, name: string, hint: string, key: string, modifiers: (foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS | keyof foundry.helpers.interaction.KeyboardManager.ModifierKeys)[], setting: K) {
	(game as ReadyGame | undefined)?.keybindings?.register(MODULE_ID, name, {
		editable: [{ key, modifiers }],
		restricted: true,
		name,
		hint,
		onDown: () => {
			setSetting(setting, choice).then();
			if (getSetting('showKeybindingPopup')) {
				ui?.notifications?.info(
					`${(game as ReadyGame).i18n.localize('obs-utils.strings.module')
					} | ${
						(game as ReadyGame).i18n.localize('obs-utils.strings.keypressInfo1')
					}${(game as ReadyGame).i18n.localize(hint)
					} ${
						(game as ReadyGame).i18n.localize('obs-utils.strings.keypressInfo2')
					}${(game as ReadyGame).i18n.localize(name)}`,
				);
			}
		},
	});
}
