import GamePage from '../pageobjects/game.page.mjs';
import LoginPage from  '../pageobjects/join.page.mjs';
import SetupPage from '../pageobjects/setup.page.mjs';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

before('Start World', async () => {
    await SetupPage.open();
    await sleep(1000);
    if(await SetupPage.btnSubmit.isExisting()) await SetupPage.setup();
})

describe('My Login application', () => {
    it('should login with valid credentials', async () => {    
        await LoginPage.open();
        expect(LoginPage.btnSubmit).toBeExisting();
        await LoginPage.login('Gamemaster', '');
        await browser.waitUntil(GamePage.isReady,{timeout: 5000})
        await GamePage.openDirector();
        expect(GamePage.director).toBeExisting();
        console.log()
        await sleep(5000);
    });
});