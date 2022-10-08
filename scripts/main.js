import {isOBS} from './utils/obs.mjs';
import { socketCanvas} from './utils/socket.mjs';
import { hideApplication, hideTokenBorder,trackToken,untrackToken,recalculateViewport,startCombat,passTurn,stopCombat } from './utils/foundry.mjs';
import { registerSettings } from './utils/settings.mjs';

const ID = "foundry-obs-utils";

let socket;

function changeViewport(viewport){
	if(isOBS()) updateViewport(viewport)
};

function changeMode(mode){

}

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule(ID);

    socket.register("viewport", changeViewport);	
    socket.register("modechange", changeMode);	
});

function socketCanvas(_canvas, position){
    socket.executeForOthers("viewport", position, getCurrentUser());
}


function start(){	

	Hooks.once('init', async function() {
		
	});
	
	Hooks.once('ready', async function() {
		registerSettings();
	});
	
	Hooks.on("canvasPan", socketCanvas);

	if(isOBS()){

		Hooks.once("ready", async function() {
			if(game.view == "stream") $('body.stream').css('background-color', 'transparent');
		})

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

		$("section#ui-left img#logo").remove()

		Hooks.on("drawToken", hideTokenBorder);
		Hooks.on("refreshToken", hideTokenBorder);

		Hooks.on("drawToken", trackToken);
		Hooks.on("destroyToken", untrackToken);
		Hooks.on("updateToken", recalculateViewport);

		Hooks.on("combatStart", startCombat);
		Hooks.on("combatTurn", passTurn);
		Hooks.on("combatEnd", stopCombat);


	}
}

start();