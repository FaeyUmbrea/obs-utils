import { updateViewport, getCurrentUser } from "./foundry.mjs";
import { isOBS } from "./obs.mjs";

const ID = "foundry-obs-utils";


let socket;

function updateSettings(){
	if(isOBS())	foundry.utils.debounce(() => window.location.reload(), 100);
}

function changeViewport(viewport){
	if(isOBS()) updateViewport(viewport)
};

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule(ID);

    socket.register("settings", updateSettings);
    socket.register("viewport", changeViewport);		
});


export function socketReload(){
	socket.executeForEveryone("settings");
}
export function socketCanvas(_canvas, position){
    socket.executeForOthers("viewport", position, getCurrentUser());
}