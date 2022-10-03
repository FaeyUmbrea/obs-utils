const trackedTokens = [];

export function hideApplication(_, html){
    html.hide();
}
export function hideTokenBorder(token){
    if(token?._object?.border?.alpha){
        token._object.border.alpha = 0;
    }
}

export function trackToken(token){
    console.log("Tracking ");
    console.log(token);
    if(token?.document?._actor?.ownership[getCurrentUser()] >= 2){
        trackedTokens.push(token.document);
    }
}

export function untrackToken(token){
    console.log("Un-Tracking ");
    console.log(token);

    const index = trackedTokens.indexOf(token);
    if (index > -1) {
      trackedTokens.splice(index, 1);
    }
}

function getCurrentUser(){
    return game.userId;
}

export function recalculateViewport(token){
    console.log("Moving");
    console.log(token);


    if(trackedTokens.indexOf(token)>-1){
        var coordinates = [];
        var sumX = 0;
        var sumY = 0;
        trackedTokens.forEach(token => {
            coordinates.push({x:token.x,y:token.y});
            sumX += token.x;
            sumY += token.y;
        })

        var bounds = calculateBoundsOfCoodinates(coordinates);

        if(!bounds) return;

        var centerX = sumX / trackedTokens.length;
        var centerY = sumY / trackedTokens.length;

        var screenDimensions = canvas.screenDimensions;

        var scaleX = ((bounds.maxX - bounds.minX) / screenDimensions[0]);
        var scaleY = ((bounds.maxY - bounds.minY) / screenDimensions[1]); 

        canvas.animatePan({x: centerX, y: centerY, scale: Math.min(scaleX, scaleY)});

    }
}

function calculateBoundsOfCoodinates(coordSet){
    var minX,maxX,minY,maxY;
    maxX = maxY = Number.MIN_VALUE;
    minX = minY = Number.MAX_VALUE;

    coordSet.forEach(coords => {
        minX = Math.min(minX,coords.x);
        minY = Math.min(minY,coords.y);
        maxX = Math.max(maxX,coords.x);
        maxY = Math.max(maxY,coords.y);

    })
    if(minX == minY == Number.MAX_VALUE || maxX == maxY == Number.MIN_VALUE ) return undefined;
    return {minX:minX, minY:minY, maxX:maxX, maxY:maxY}
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