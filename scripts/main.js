import  './utils/obs.mjs';
import  './utils/foundry.mjs';
import { isOBS } from './utils/obs.mjs';

const ID = "foundry-obs-utils";

function updateSettings(settings){
	if(isOBS())	location.reload();
}

function changeViewport(viewport){
	if(isOBS()) updateViewport(viewport)
};


function start(){	

	let socket;

	Hooks.once('init', async function() {

	});
	
	Hooks.once('ready', async function() {
		
	});
	
	Hooks.once("socketlib.ready", () => {
		socket = socketlib.registerModule(ID);
	
		socket.register("settings", updateSettings);
		socket.register("viewport", changeViewport);		
	});
	
	if(isOBS()){

		if(game.view == "stream" && isOBS()){
			Hooks.once("ready", async function() {
				$('body.stream').css('background-color', 'transparent');
			})
		}

		if(game.view == "game"){
		Hooks.on("canvasPan", (_canvas, position) => {
			socket.executeForEveryone("viewport", position);
		});

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