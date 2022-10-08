import {isOBS} from './utils/obs.mjs';
import { hideApplication,hideTokenBorder,trackToken,untrackToken,tokenMoved,startCombat,passTurn,stopCombat,getCurrentUser,viewportChanged,mode } from './utils/foundry.mjs';
import { getSetting, registerSettings } from './utils/settings.mjs';

const ID = "foundry-obs-utils";

let socket;

function changeViewport(viewport, userId){
	if(isOBS()) viewportChanged(viewport, userId)
};

function changeMode(combatMode,normalMode){
	mode.combat = combatMode;
	mode.normal = normalMode;
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
		changeMode(getSetting("defaultOutOfCombat"),getSetting("defaultInCombat"));
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
		Hooks.on("updateToken", tokenMoved);

		Hooks.on("combatStart", startCombat);
		Hooks.on("combatTurn", passTurn);
		Hooks.on("combatEnd", stopCombat);


	}
}

start();