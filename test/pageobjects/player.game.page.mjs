import Page from './page.mjs';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * sub page containing specific selectors and methods for a specific page
 */
class GamePage extends Page {
    
    /**
     * define selectors using getter methods
     */
    get icon () {
        return playerClient.$('li[data-tool=openStreamDirector]');
    }

    get combatSidebar(){
        return playerClient.$("a.item[data-tab=combat]");
    }

    get combatStartButton(){
        return playerClient.$("a.combat-control[data-control=startCombat]");
    }

    get combatEndButton(){
        return playerClient.$("a.combat-control.center[data-control=endCombat]");
    }

    get dialogYesButton(){
        return playerClient.$("button.dialog-button.yes.default[data-button=yes]");
    }

    open (){
        super.open("game",playerClient)
    }

    async openDirector() {
        await this.icon.click();
    }

    async closeDirector() {
        await this.directorCloseButton.click();
    }

    async takeControlOfToken() {
        await playerClient.execute(() => window.game.canvas.tokens.ownedTokens[0].control())
    }

    async panViewport(x,y,scale) {
        await playerClient.execute((x,y,scale) => window.canvas.pan({x: x, y: y, scale: scale}), x,y,scale)
    }

    async isReady() {
        return (await playerClient.execute(() => JSON.stringify(window.game.ready)) == 'true');
    }

    async holdKey(keycode, duration){
        await playerClient.performActions([{type: 'key', id: 'keyboard',actions: [{type: 'keyDown', value: keycode}]}]);
        await sleep(duration);
        await playerClient.performActions([{type: 'key', id: 'keyboard',actions: [{type: 'keyUp', value: keycode}]}]);
    }
}

export default new GamePage();
