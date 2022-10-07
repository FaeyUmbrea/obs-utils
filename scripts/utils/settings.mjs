export function registerSettings(socketReload){
    var moduleID = "foundry-obs-utils";

    game.settings.register(moduleID, "minScale", {
        name: moduleID+'.settings.minScale.Name',
        default: 0.1,
        type: Number,
        scope: 'world',
        config: true,
        hint: moduleID+'.settings.minScale.Hint',
        onChange: socketReload
    });
    game.settings.register(moduleID, "maxScale", {
        name: moduleID+'.settings.maxScale.Name',
        default: 0.8,
        type: Number,
        scope: 'world',
        config: true,
        hint: moduleID+'.settings.maxScale.Hint',
        onChange: socketReload
    })
}

export function getSetting(settingName){
    return game.settings.get('foundry-obs-utils',settingName)
}