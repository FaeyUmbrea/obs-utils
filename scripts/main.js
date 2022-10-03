import  { isOBS } from './utils/obs.mjs';
import  { hideApplication, hideTokenBorder, trackToken, untrackToken, recalculateViewport,startCombat,passTurn,stopCombat } from './utils/foundry.mjs';

(function(){

const ID = "foundry-obs-utils"




function updateSettings(settings){
	if(isOBS())	location.reload();
}

function changeViewport(viewport){

};


function hook(){	
	Hooks.once('init', async function() {

	});
	
	Hooks.once('ready', async function() {
		
	});
	
	Hooks.once("socketlib.ready", () => {
		var socket = socketlib.registerModule(ID);
	
		socket.register("settings", updateSettings);
		socket.register("viewport", changeViewport);
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
	Hooks.on("refreshToken", hideTokenBorder);

	Hooks.on("drawToken", trackToken);
	Hooks.on("destroyToken", untrackToken);
	Hooks.on("refreshToken", recalculateViewport);

	Hooks.on("combatStart", startCombat);
	Hooks.on("combatTurn", passTurn);
	Hooks.on("combatEnd", stopCombat);
	}
}

hook();})();