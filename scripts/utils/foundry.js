const trackedTokens = [];

function hideApplication(_, html){
    html.hide();
}
function hideTokenBorder(token){
    if(token?._object?.border?.alpha){
        token._object.border.alpha = 0;
    }
}

function trackToken(token){
    if(token?.document?._actor?.ownership[getCurrentUser()] >= 2){
        trackedTokens.push(token);
    }
}

function untrackToken(token){
    const index = trackedTokens.indexOf(token);
    if (index > -1) {
      trackedTokens.splice(index, 1);
    }
}

function getCurrentUser(){
    return game.userid;
}

function recalculateViewport(token){
    if(trackedTokens.indexOf(token)>-1){
        var coordinates = [];
        var sumX = 0;
        var sumY = 0;
        for(var token in trackedTokens){
            coordinates.push({x:token.x,y:token.y});
            sumX += token.x;
            sumY += token.y;
        }

        var bounds = calculateBoundsOfCoodinates(coordinates);

        if(!bounds) return;

        var centerX = sumX / trackedTokens.length();
        var centerY = sumY / trackedTokens.length();

        var screenDimensions = canvas.screenDimensions;

        var scaleX = (bounds.maxX - bounds.minX) / screenDimensions[0];
        var scaleY = (bounds.maxY - bounds.minY) / screenDimensions[1]; 

        canvas.animatePan({x: centerX, y: centerY, scale: Math.max(scaleX, scaleY)});

    }
}

function calculateBoundsOfCoodinates(coordSet){
    var minX,maxX,minY,maxY = -1;
    for(coords in coordSet){
        minX = Math.min(minX,coords.x);
        minY = Math.min(minY,coords.y);
        maxX = Math.max(minX,coords.x);
        maxY = Math.max(minY,coords.y);

    }   
    if(minX == maxX && minY == maxY) return undefined;
    return {minX:minX, minY:minY, maxX:maxX, maxY:maxY}
}

module.exports = {
    hideApplication: hideApplication,
    hideTokenBorder: hideTokenBorder,
    untrackToken: untrackToken,
    trackToken: trackToken,
    recalculateViewport: recalculateViewport
}