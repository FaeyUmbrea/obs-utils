import GMGamePage from '../pageobjects/gm.game.page.mjs';
import GMLoginPage from  '../pageobjects/gm.join.page.mjs';
import OBSGamePage from '../pageobjects/obs.game.page.mjs';
import OBSLoginPage from  '../pageobjects/obs.join.page.mjs';
import SetupPage from '../pageobjects/setup.page.mjs';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

before('Start World', async () => {
    await SetupPage.open();
    await sleep(1000);
    if(await SetupPage.btnSubmit.isExisting()) await SetupPage.setup();
})

before('Emulate OBS', async () => {
    //await obsClient.setCookies({name:'obs',value:'true'})
})

describe('Director Functionality', () => {
    it('should login with valid credentials', async () => {    
        // GM
    await GMLoginPage.open();
    expect(GMLoginPage.btnSubmit).toBeExisting();
    await GMLoginPage.login('Gamemaster', '');
    await gmClient.waitUntil(GMGamePage.isReady, { timeout: 5000 })
    await GMGamePage.openDirector();
    expect(GMGamePage.director).toBeExisting();
    
    //OBS
    await OBSLoginPage.open();
    expect(OBSLoginPage.btnSubmit).toBeExisting();
    await OBSLoginPage.login('Player2', '');
    await obsClient.waitUntil(OBSGamePage.isReady, { timeout: 5000 })
    });
});