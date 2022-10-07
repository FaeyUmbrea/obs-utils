export function registerSettings(){
    var moduleID = "obs-utils";

    game.settings.register(moduleID, "minScale", {
        name: moduleID+'.settings.minScale.Name',
        default: 0.1,
        type: Number,
        scope: 'world',
        config: true,
        hint: moduleID+'.settings.minScale.Hint'
    });
    game.settings.register(moduleID, "maxScale", {
        name: moduleID+'.settings.maxScale.Name',
        default: 0.8,
        type: Number,
        scope: 'world',
        config: true,
        hint: moduleID+'.settings.maxScale.Hint'
    })
}

export function getSetting(settingName){
    return game.settings.get('obs-utils',settingName)
}