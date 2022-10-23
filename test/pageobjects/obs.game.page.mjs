import Page from './page.mjs';
import _ from 'lodash';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class GamePage extends Page {
    
    lastPosition;
    currentPosition;

    /**
     * define selectors using getter methods
     */
    get icon () {
        return obsClient.$('li[data-tool=openStreamDirector]');
    }

    async getViewport(){
        return (await obsClient.execute(() => JSON.stringify([window.canvas.stage.position.scope.pivot.x,window.canvas.stage.position.scope.pivot.y,window.canvas.stage.position.scope.scale.x,window.canvas.stage.position.scope.scale.y])));
    }

    open (){
        super.open("game",obsClient)
    }

    async isReady() {
        return (await obsClient.execute(() => JSON.stringify(window.game.ready)) == 'true');
    }
}

export default new GamePage();
