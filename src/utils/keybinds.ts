import { localize } from '#runtime/util/i18n';
import { ICCHOICES, MODULE_ID, OOCCHOICES } from './const.js';
import { getSetting, setSetting } from './settings.ts';

export function registerKeybindings() {
	Object.entries(ICCHOICES).forEach(([choice, name], index) => {
		registerKeybinding(
			choice,
			name,
			'obs-utils.strings.ic',
			`Digit${index + 1}`,
			['Shift', 'Control'],
			'defaultInCombat',
		);
	});
	Object.entries(OOCCHOICES).forEach(([choice, name], index) => {
		registerKeybinding(
			choice,
			name,
			'obs-utils.strings.ooc',
			`Digit${index + 1}`,
			['Shift'],
			'defaultOutOfCombat',
		);
	});
}

function registerKeybinding(choice: string, name: string, hint: string, key: string, modifiers: string[], setting: string) {
	(game as ReadyGame | undefined)?.keybindings?.register(MODULE_ID, name, {
		editable: [{ key, modifiers }],
		restricted: true,
		name,
		hint,
		onDown: () => {
			setSetting(setting, choice).then();
			if (getSetting('showKeybindingPopup')) {
				ui?.notifications?.info(
					`${localize('obs-utils.strings.module')
					} | ${
						localize('obs-utils.strings.keypressInfo1')
					}${localize(hint)
					} ${
						localize('obs-utils.strings.keypressInfo2')
					}${localize(name)}`,
				);
			}
		},
	});
}
