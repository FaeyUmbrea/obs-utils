(function(){
const { isOBS } = require('./utils/obs');
const { hideApplication, hideTokenBorder } = require('./utils/foundry');

const ID = "obs-utils"




function updateSettings(settings){
	if(isOBS())	location.reload();
}


function hook(){	
	Hooks.once('init', async function() {

	});
	
	Hooks.once('ready', async function() {
	
	});
	
	Hooks.once("socketlib.ready", () => {
		socket = socketlib.registerModule("obs-utils");
	
		socket.register("settings", updateSettings);
	});

	if(isOBS()){

	Hooks.on("renderSidebar", hideApplication);
	Hooks.on("renderSceneNavigation", hideApplication);
	Hooks.on("renderMainMenu", hideApplication);
	Hooks.on("renderSceneControls", hideApplication);
	Hooks.on("renderTokenHUD", hideApplication);
	Hooks.on("renderSidebarTab", hideApplication);
	Hooks.on("renderUserConfig", hideApplication);
	Hooks.on("renderCameraViews", hideApplication);
	Hooks.on("renderPlayerList", hideApplication);
	Hooks.on("renderHotbar", hideApplication);

	Hooks.on("drawToken", hideTokenBorder);
	Hooks.on("updateToken", hideTokenBorder);
	}
}

hook();})();