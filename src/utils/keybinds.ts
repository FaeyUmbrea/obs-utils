import { ICCHOICES, MODULE_ID, OOCCHOICES } from './const.js';
import { getSetting, setSetting } from './settings.ts';

export function registerKeybindings() {
	Object.entries(ICCHOICES).forEach(([choice, name], index) => {
		registerKeybinding(
			choice,
			name,
			'obs-utils.strings.ic',
			`Digit${index + 1}`,
			[KeyboardManager.MODIFIER_KEYS.SHIFT, KeyboardManager.MODIFIER_KEYS.CONTROL],
			'defaultInCombat',
		);
	});
	Object.entries(OOCCHOICES).forEach(([choice, name], index) => {
		registerKeybinding(
			choice,
			name,
			'obs-utils.strings.ooc',
			`Digit${index + 1}`,
			[KeyboardManager.MODIFIER_KEYS.SHIFT],
			'defaultOutOfCombat',
		);
	});
}

function registerKeybinding<K extends ClientSettings.KeyFor<'obs-utils'>>(choice: ClientSettings.SettingCreateData<'obs-utils', K>, name: string, hint: string, key: string, modifiers: (KeyboardManager.MODIFIER_KEYS | keyof KeyboardManager.ModifierKeys)[], setting: K) {
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
