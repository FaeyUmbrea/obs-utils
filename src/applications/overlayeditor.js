import OverlayEditorUI from "../svelte/OverlayEditorUI.svelte";
import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";
import { getSetting, setSetting } from "../utils/settings.js";

export default class OverlayEditor extends SvelteApplication {
  dataArray = [];

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["overlayeditor"],
      id: "overlayeditor-application",
      title: "Overlay Editor",
      //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 600,
      width: 1000,
      zIndex: 95,
      resizable: true,
      focusAuto: false,
      svelte: {
        class: OverlayEditorUI,
        target: document.body,
      },
    });
  }
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    buttons.unshift(
      {
        icon: "fas fa-file-import",
        title: "Import",
        label: "Import",

        onPress: async function () {
          new Dialog(
            {
              title: `Import Data: Overlays`,
              content: await renderTemplate("templates/apps/import-data.html", {
                hint1:
                  "You are about to import an exported Overlay configuration. Please ensure that it was exported in the same system or AV Overlays may not work.",
                hint2:
                  "Please choose if you want to replace your existing overlays or add the imported list.",
              }),
              buttons: {
                replace: {
                  icon: '<i class="fas fa-file-import"></i>',
                  label: "Replace",
                  callback: (html) => {
                    const form = html.find("form")[0];
                    if (!form.data.files.length)
                      return ui.notifications.error(
                        "You did not upload a data file!",
                      );
                    readTextFromFile(form.data.files[0]).then((json) =>
                      importChatCommands(json, false),
                    );
                  },
                },
                append: {
                  icon: '<i class="fas fa-file-import"></i>',
                  label: "Append",
                  callback: (html) => {
                    const form = html.find("form")[0];
                    if (!form.data.files.length)
                      return ui.notifications.error(
                        "You did not upload a data file!",
                      );
                    readTextFromFile(form.data.files[0]).then((json) =>
                      importChatCommands(json, true),
                    );
                  },
                },
                no: {
                  icon: '<i class="fas fa-times"></i>',
                  label: "Cancel",
                },
              },
              default: "import",
            },
            {
              width: 400,
            },
          ).render(true);
        },
      },
      {
        icon: "fas fa-file-export",
        title: "Export",
        label: "Export",

        onPress: function () {
          new Dialog({
            title: "Export your settings?",
            content: "Do you want to export your Overlay Settings?",
            buttons: {
              yes: {
                label: "Yes",
                callback: () => exportChatCommands(),
              },
              no: {
                label: "No",
              },
            },
          }).render(true);
        },
      },
    );

    return buttons;
  }
}

function exportChatCommands() {
  const overlays = foundry.utils.deepClone(getSetting("streamOverlays"));

  let data = {
    type: "ObsUtilsOverlays",
    version: 1,
    overlays: overlays,
    system: game.system?.id,
  };

  const filename = [
    "obsu",
    game.system?.id,
    game.world.id,
    "overlays",
    new Date().toString(),
  ].filterJoin("-");
  saveDataToFile(
    JSON.stringify(data, null, 2),
    "text/json",
    `${filename}.json`,
  );
}

/**
 * @param {String} data
 * @param {boolean} join
 */
async function importChatCommands(data, join) {
  /**
   * @type {{version:number, type: String,system: String, overlays:[]}}
   */
  const imported = JSON.parse(data);
  if (imported.type !== "ObsUtilsOverlays") {
    throw new Error("Imported file is not an OBS Utils Export");
  }
  if (imported.version !== 1) {
    throw new Error("Version unsupported");
  }
  if (join) {
    const overlays = getSetting("streamOverlays");
    overlays.push(...imported.overlays);
    await setSetting("streamOverlays", overlays);
  } else {
    await setSetting("streamOverlays", imported.overlays);
  }
}
