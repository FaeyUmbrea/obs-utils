import Page from './page.mjs';
import _ from 'lodash';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class GamePage extends Page {

    /**
     * define selectors using getter methods
     */
    get icon () {
        return obsClient.$('li[data-tool=openStreamDirector]');
    }

    get navBar () {
        return obsClient.$('nav#controls');
    }

    get sceneNav() {
        return obsClient.$('nav#navigation');
    }

    get macroHotbar() {
        return obsClient.$('div#hotbar');
    }

    get playerList() {
        return obsClient.$('aside#players.app');
    }

    get sidebar() {
        return obsClient.$('div#sidebar.app');
    }

    get journalPopout(){
        return obsClient.$("div.app.window-app.sheet.journal-sheet");
    }

    get imagePopout(){
        return obsClient.$("div.app.window-app.image-popout");
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

    async isCombat() {
        return (await obsClient.execute(() => JSON.stringify(window.game.combat.started)));
    }

    async shouldBeCombat() {
        return (await obsClient.execute(() => JSON.stringify(window.game.settings.get('obs-utils','showTrackerInCombat'))));
    }
}

export default new GamePage();
