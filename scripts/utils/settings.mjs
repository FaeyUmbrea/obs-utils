export function registerSettings(){
    var moduleID = "foundry-obs-utils";

    game.settings.register(moduleID, "minScale", {
        name: `${moduleID}.settings.minScale.Name`,
        default: 0.1,
        type: Number,
        range: {
            min: 0.01,
            max: 5,
            step: 0.01
          },
        scope: 'world',
        config: true,
        hint: `${moduleID}.settings.minScale.Hint`
    });
    game.settings.register(moduleID, "maxScale", {
        name: `${moduleID}.settings.maxScale.Name`,
        default: 2,
        type: Number,
        range: {
            min: 0.01,
            max: 5,
            step: 0.01
          },
        scope: 'world',
        config: true,
        hint: `${moduleID}.settings.maxScale.Hint`
    })
    game.settings.register(moduleID, "defaultOutOfCombat", {
        name: `${moduleID}.settings.defaultOutOfCombat.Name`,
        default: 2,
        type: String,
        choices: {
            "trackall": "Track all Tokens",
            "trackone": "Track one Token",
            "clonePlayer":"Track specific Player",
            "cloneDM": "Track DM"
          },
        scope: 'world',
        config: true,
        hint: `${moduleID}.settings.defaultOutOfCombat.Hint`
    })
    game.settings.register(moduleID, "defaultInCombat", {
        name: `${moduleID}.settings.defaultInCombat.Name`,
        default: 2,
        type: String,
        choices: {
            "trackall": "Track all Tokens",
            "trackone": "Track one Token",
            "clonePlayer":"Track Turn Player",
            "cloneDM": "Track DM"
          },
        scope: 'world',
        config: true,
        hint: `${moduleID}.settings.defaultInCombat.Hint`
    })
}

export function getSetting(settingName){
    return game.settings.get('foundry-obs-utils',settingName)
}