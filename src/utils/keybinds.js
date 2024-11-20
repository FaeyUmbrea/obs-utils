import { ICCHOICES, ID, OOCCHOICES } from "./const.js";
import { getSetting, setSetting } from "./settings.js";
import { localize } from "#runtime/util/i18n";

export function registerKeybindings() {
  Object.entries(ICCHOICES).forEach(([choice, name], index) => {
    registerKeybinding(
      choice,
      name,
      "obs-utils.strings.ic",
      "Digit" + (index + 1),
      ["Shift", "Control"],
      "defaultInCombat",
    );
  });
  Object.entries(OOCCHOICES).forEach(([choice, name], index) => {
    registerKeybinding(
      choice,
      name,
      "obs-utils.strings.ooc",
      "Digit" + (index + 1),
      ["Shift"],
      "defaultOutOfCombat",
    );
  });
}

function registerKeybinding(choice, name, hint, key, modifiers, setting) {
  game.keybindings.register(ID, name, {
    editable: [{ key: key, modifiers: modifiers }],
    restricted: true,
    name: name,
    hint: hint,
    onDown: async () => {
      await setSetting(setting, choice);
      if (getSetting("showKeybindingPopup")) {
        ui.notifications.info(
          localize("obs-utils.strings.module") +
            " | " +
            localize("obs-utils.strings.keypressInfo1") +
            localize(hint) +
            " " +
            localize("obs-utils.strings.keypressInfo2") +
            localize(name),
        );
      }
    },
  });
}
