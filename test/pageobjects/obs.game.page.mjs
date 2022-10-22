import Page from './page.mjs';

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

    get director () {
        return obsClient.$('div[id=director-application]');
    }


    async openDirector() {
        await this.icon.click();
    }

    async isReady() {
        return (await obsClient.execute(() => JSON.stringify(window.game.ready)) == 'true');
    }
}

export default new GamePage();
