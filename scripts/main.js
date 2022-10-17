import {isOBS} from './utils/obs.mjs';
import { hideApplication,hideTokenBorder,tokenMoved,startCombat,passTurn,stopCombat,getCurrentUser,viewportChanged,mode } from './utils/helpers.mjs';
import { generateDataBlockFromSetting, getSetting, registerSettings, setSetting } from './utils/settings.mjs';
import Director from './director.mjs';

const ID = "foundry-obs-utils";

let socket;

function changeViewport(viewport, userId){
	if(isOBS()) viewportChanged(viewport, userId)
};

async function changeMode(){
	//Using an object to avoid reading Settings every time a token moves
	mode.normal = await getSetting("defaultOutOfCombat");
	mode.combat = await getSetting("defaultInCombat");
	console.warn(mode);
}

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule(ID);

    socket.register("viewport", changeViewport);	
    socket.register("modechange", changeMode);	
});

function socketCanvas(_canvas, position){
    socket.executeForOthers("viewport", position, getCurrentUser());
}

function buildButtons(buttons){
	
	if (!game.user.isGM) return;
    	var buttonGroup = buttons.find(element => element.name === "token");
    	if (!buttonGroup) return;
    	buttonGroup.tools.push({
        icon: "fa-solid fa-signal-stream",
        name: "openStreamDirector",
        title: "Open Stream Director",
        toggle: true,
        onClick: openDirector
    	})

	console.warn(buttons)
}

async function sendMode(isInCombat, mode){
	if(isInCombat)await setSetting("defaultInCombat",mode);
	else await setSetting("defaultOutOfCombat",mode);
	socket.executeForOthers("modechange");
}

function openDirector(){
	let d = new Director(generateDataBlockFromSetting(sendMode))
	d.render(true);
}


function start(){	

	Hooks.once('init', async function() {
		
	});
	
	Hooks.once('ready', async function() {
		registerSettings();
		if(isOBS){
			//Init Mode Object
			changeMode();
		}
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

		Hooks.on("updateToken", tokenMoved);

		Hooks.on("combatStart", startCombat);
		Hooks.on("combatTurn", passTurn);
		Hooks.on("combatEnd", stopCombat);


	}
	else{
		Hooks.on("getSceneControlButtons", buildButtons);
	}
}

start();