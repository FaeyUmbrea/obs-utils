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
        return gmClient.$('li[data-tool=openStreamDirector]');
    }

    get director () {
        return gmClient.$('div[id=director-application]');
    }

    get directorCloseButton () {
        return gmClient.$('div[id=director-application] a.header-button.close')
    }

    open (){
        super.open("game",gmClient)
    }

    async openDirector() {
        await this.icon.click();
    }

    async closeDirector() {
        await this.directorCloseButton.click();
    }

    async takeControlOfToken() {
        await gmClient.execute(() => window.game.canvas.tokens.ownedTokens[0].control())
    }

    async panViewport(x,y,scale) {
        await gmClient.execute((x,y,scale) => window.canvas.pan({x: x, y: y, scale: scale}), x,y,scale)
    }

    async isReady() {
        return (await gmClient.execute(() => JSON.stringify(window.game.ready)) == 'true');
    }

    async holdKey(keycode, duration){
        await gmClient.performActions([{type: 'key', id: 'keyboard',actions: [{type: 'keyDown', value: keycode}]}]);
        await sleep(duration);
        await gmClient.performActions([{type: 'key', id: 'keyboard',actions: [{type: 'keyUp', value: keycode}]}]);
    }
}

export default new GamePage();
