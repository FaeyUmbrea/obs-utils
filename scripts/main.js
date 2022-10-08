import {isOBS} from './utils/obs.mjs';
import { socketCanvas, socketReload } from './utils/socket.mjs';
import { hideApplication, hideTokenBorder,trackToken,untrackToken,recalculateViewport,startCombat,passTurn,stopCombat } from './utils/foundry.mjs';
import { registerSettings } from './utils/settings.mjs';

const ID = "foundry-obs-utils";

function start(){	

	Hooks.once('init', async function() {
		
	});
	
	Hooks.once('ready', async function() {
		registerSettings(socketReload);
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