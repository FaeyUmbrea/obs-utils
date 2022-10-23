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
        return gmClient.$('div[id=director-application] a.header-button.close');
    }

    get combatSidebar(){
        return gmClient.$("a.item[data-tab=combat]");
    }

    get combatStartButton(){
        return gmClient.$("a.combat-control[data-control=startCombat]");
    }

    get combatEndButton(){
        return gmClient.$("a.combat-control.center[data-control=endCombat]");
    }

    get combatNextButton(){
        return gmClient.$("a.combat-control[data-control=nextTurn]");
    }

    get dialogYesButton(){
        return gmClient.$("button.dialog-button.yes.default[data-button=yes]");
    }

    get tokenHudButton(){
        return gmClient.$("div#hud i[title='Track Token']");
    }

    open (){
        super.open("game",gmClient)
    }

    async toggleDirectorWithIconButton() {
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

    async startCombatWithAllTokens(){
        await this.combatSidebar.click();

        await sleep(1000);

        await gmClient.execute(() => {window.canvas.tokens.ownedTokens.forEach((token)=>token.control({releaseOthers: false}))});
        await gmClient.execute(() => {window.canvas.tokens.toggleCombat(true)})

        
        await this.combatStartButton.waitForExist();
        await this.combatStartButton.click();

        await sleep(1000);
    }
    
    async advanceTurn(){
        await this.combatSidebar.click();
        await this.combatNextButton.waitForExist();

        await this.combatNextButton.click();
        await sleep(100);
    }

    async endCombat(){
        await this.combatSidebar.click();
        await this.combatEndButton.waitForExist();
        await this.combatEndButton.click();

        await this.dialogYesButton.waitForExist();
        await this.dialogYesButton.click();

        await sleep(1000);
    }

    async takeControlOfCombatant(){
        await gmClient.execute(() => window.game.combat.combatant.token.object.control())
    }

    async takeControlOfNextCombatant(){
        await gmClient.execute(() => window.game.combat.nextCombatant.token.object.control())
    }

    async getPlayerIdByName(name){
        return await gmClient.execute((name) => JSON.stringify(window.game.users.find((element) => (element.name==name)).id),name)
    }

    async getCombatantByOwnerName(name){
        return await gmClient.execute((name) => JSON.stringify(window.game.combat.combatants.find((element) => (element.players.some((player) => (player.name == name))) )), name)
    }

    async getCurrentCombatantOwnerNames(){
        return JSON.parse(await gmClient.execute(() => JSON.stringify(window.game.combat.combatant.players.map((player)=>(player.name)))));
    }

    async getNumberOfCombatants(){
        return await gmClient.execute(() => JSON.stringify(window.game.combat.combatants.size));
    }

    async openTokenHUDOnCurrentSelected(){
        await gmClient.execute(() => (window.canvas.hud.token.bind(canvas.tokens.controlled[0])));
    }

    async isCurrentTokenTagged(){
        return await gmClient.execute(() => JSON.stringify(Tagger.hasTags(canvas.tokens.controlled[0],"obs_manual_track")));
    }
}

export default new GamePage();
