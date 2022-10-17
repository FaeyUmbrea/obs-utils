const ICCHOICES = {
  "trackall": "Track all Owned Tokens",
  "trackone": "Track the currently active Owned Token",
  "clonePlayer":"Clone the Turn Player's Viewport",
  "cloneDM": "Clone the DM's Viewport"
}
const OOCCHOICES = {
  "trackall": "Track all Owned Tokens",
  "trackmanual": "Track a manual List of Tokens",
  "clonePlayer":"Clone a Player's Viewport",
  "cloneDM": "Clone the DM's Viewport"
}

export function registerSettings(){
    var moduleID = "obs-utils";

    game.settings.register(moduleID, "minScale", {
        name: `obs-utils.settings.minScale.Name`,
        default: 0.1,
        type: Number,
        range: {
            min: 0.01,
            max: 5,
            step: 0.01
          },
        scope: 'world',
        config: true,
        hint: `obs-utils.settings.minScale.Hint`
    });
    game.settings.register(moduleID, "maxScale", {
        name: `obs-utils.settings.maxScale.Name`,
        default: 2,
        type: Number,
        range: {
            min: 0.01,
            max: 5,
            step: 0.01
          },
        scope: 'world',
        config: true,
        hint: `obs-utils.settings.maxScale.Hint`
    })
    game.settings.register(moduleID, "defaultOutOfCombat", {
        name: `obs-utils.settings.defaultOutOfCombat.Name`,
        default: "trackall",
        type: String,
        choices: OOCCHOICES,
        scope: 'world',
        config: false,
        hint: `obs-utils.settings.defaultOutOfCombat.Hint`
    })
    game.settings.register(moduleID, "defaultInCombat", {
        name: `obs-utils.settings.defaultInCombat.Name`,
        default: "trackall",
        type: String,
        choices: ICCHOICES,
        scope: 'world',
        config: false,
        hint: `obs-utils.settings.defaultInCombat.Hint`
    })
}

export function getSetting(settingName){
    return game.settings.get('foundry-obs-utils',settingName)
}

export async function setSetting(settingName, value){
  await game.settings.set('foundry-obs-utils',settingName,value)
}

export function generateDataBlockFromSetting(callback, trackCallback){
  let buttonData = {
    ic: [], 
    ooc: [],
    currentIC: getSetting("defaultInCombat"),
    currentOOC: getSetting("defaultOutOfCombat"),
    callback: callback,
    trackCallback: trackCallback
  }

  for (const [key, value] of Object.entries(ICCHOICES)){
    buttonData.ic.push({
      icon: "fa-solid fa-signal-stream", label: key, id: key
    });
  }
  for (const [key, value] of Object.entries(OOCCHOICES)){
    buttonData.ooc.push({
      icon: "fa-solid fa-signal-stream", label: key, id: key
    });
  }
  buttonData.players = game.users
  return buttonData
}