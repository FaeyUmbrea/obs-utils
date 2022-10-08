import { getSetting } from "./settings.mjs";

const trackedTokens = [];

export function hideApplication(_, html){
    html.hide();
}
export function hideTokenBorder(token){
    if(token?.border?.alpha){
        token.border.alpha = 0;
    }
}

export function trackToken(token){
    if(token?.document?._actor?.ownership[getCurrentUser()] >= 2){
        trackedTokens.push(token.document);
    }
}

export function untrackToken(token){

    const index = trackedTokens.indexOf(token.document);
    if (index > -1) {
      trackedTokens.splice(index, 1);
    }
}

export function getCurrentUser(){
    return game.userId;
}

export function recalculateViewport(token){

    if(trackedTokens.indexOf(token)>-1){
        var coordinates = [];
        if(game.combat?.started) return;
        else trackedTokens.forEach(token => {
            coordinates.push({x:token.x,y:token.y,width:token.object.w,height:token.object.h});
        });

        var bounds = calculateBoundsOfCoodinates(coordinates);

        if(!bounds) return;

        var screenDimensions = canvas.screenDimensions;

        var scaleX = (screenDimensions[0] / (bounds.maxX - bounds.minX + 300));
        var scaleY = (screenDimensions[1] / (bounds.maxY - bounds.minY + 300)); 

        var scale = Math.min(scaleX, scaleY)
        scale = Math.min(scale,getSetting("maxScale"));
        scale = Math.max(scale,getSetting("minScale"));

        canvas.animatePan({x: bounds.center.x, y: bounds.center.y, scale: scale});

    }
}

function calculateBoundsOfCoodinates(coordSet){
    var minX,maxX,minY,maxY;
    maxX = maxY = Number.MIN_VALUE;
    minX = minY = Number.MAX_VALUE;

    coordSet.forEach(coords => {
        minX = Math.min(minX,coords.x);
        minY = Math.min(minY,coords.y);
        maxX = Math.max(maxX,coords.x+coords.width);
        maxY = Math.max(maxY,coords.y+coords.height);

    })
    if(minX == minY == Number.MAX_VALUE || maxX == maxY == Number.MIN_VALUE ) return undefined;
    return {minX:minX, minY:minY, maxX:maxX, maxY:maxY, center:{x:minX+(maxX-minX)/2,y:minY+(maxY-minY)/2}}
}

export function startCombat(combat){
    if(combat.combatant.isOwner){
        combat.combatant.token.control({releaseOthers: true});
    }
}

export function passTurn(combat){
    if(combat.combatant.isOwner){
        combat.combatant.token.control({releaseOthers: true});
    }
}

export function stopCombat(combat){
    canvas.tokens.controlledObjects.forEach((token) => token.release())
}

export function updateViewport(viewport){
    canvas.animatePan(viewport);
}