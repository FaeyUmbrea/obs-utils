import  './utils/obs.mjs';
import  './utils/foundry.mjs';
import 	'./utils/settings.mjs';
import 	'./utils/socket.mjs';

const ID = "foundry-obs-utils";

function start(){	

	Hooks.once('init', async function() {
		
	});
	
	Hooks.once('ready', async function() {
		registerSettings(socketReload);
	});
	
	if(isOBS()){

		if(game.view == "stream"){
			Hooks.once("ready", async function() {
				$('body.stream').css('background-color', 'transparent');
			})
		}

		if(game.view == "game"){
		Hooks.on("canvasPan", socketCanvas);

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
}

start();