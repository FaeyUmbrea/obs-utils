import GMDirector from '../pageobjects/gm.director.element.mjs';
import GMGamePage from '../pageobjects/gm.game.page.mjs';
import GMLoginPage from '../pageobjects/gm.join.page.mjs';
import OBSGamePage from '../pageobjects/obs.game.page.mjs';
import OBSLoginPage from '../pageobjects/obs.join.page.mjs';
import SetupPage from '../pageobjects/setup.page.mjs';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

before('Start World', async () => {
    await SetupPage.open(gmClient);
    await sleep(1000);
    if (await SetupPage.btnSubmit.isExisting()) await SetupPage.setup();
})

before('Emulate OBS', async () => {
    await SetupPage.open(obsClient);
    await sleep(1000);
    await obsClient.setCookies({ name: 'obs', value: 'true' })
})

before('Log Into Foundry', () => {
    GMLoginPage.open();
    expect(GMLoginPage.btnSubmit).toBeExisting();
    GMLoginPage.login('Gamemaster', '');
    gmClient.waitUntil(GMGamePage.isReady)

    OBSLoginPage.open();
    expect(OBSLoginPage.btnSubmit).toBeExisting();
    OBSLoginPage.login('Player2', '');
    obsClient.waitUntil(OBSGamePage.isReady)
})

async function prepare() {
    // GM
    await GMGamePage.open();
    await gmClient.waitUntil(GMGamePage.isReady)

    //OBS
    await OBSGamePage.open()
    await obsClient.waitUntil(OBSGamePage.isReady)
}

describe('Director Functionality', () => {
    it('OOC TrackAll', async () => {

        await prepare();

        // Set Mode to TrackAll
        await GMGamePage.openDirector();
        expect(GMGamePage.director).toBeExisting();
        await sleep(1000);
        await GMDirector.buttonAllTokensOOC.click();

        await sleep(1000);

        await GMGamePage.closeDirector();

        // Take Token

        await GMGamePage.takeControlOfToken();

        await sleep(3000);

        // Move into position

        await GMGamePage.holdKey('a', 1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await sleep(3000);

        // Move Token

        await GMGamePage.holdKey('d', 1000);
        await sleep(3000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

    });
    it('OOC Tag Based', async () => {

        await prepare();

        // Set Mode to Selected Tokens
        await GMGamePage.openDirector();
        expect(GMGamePage.director).toBeExisting();
        await sleep(1000);
        await GMDirector.buttonSelectedTokensOOC.click();

        await sleep(1000);

        await GMGamePage.closeDirector();

        // Take Token

        await GMGamePage.takeControlOfToken();

        await sleep(3000);

        // Move into position

        await GMGamePage.holdKey('a', 1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await sleep(3000);

        // Move Token

        await GMGamePage.holdKey('d', 1000);
        await sleep(3000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

    });
    it('OOC Copy GM', async () => {

        await prepare();

        // Set Mode to Copy GM
        await GMGamePage.openDirector();
        expect(GMGamePage.director).toBeExisting();

        await GMDirector.buttonCloneDMOOC.click();

        await sleep(1000);

        // Move Viewport

        await GMGamePage.panViewport(100,100,1);

        await sleep(1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await GMGamePage.panViewport(300,300,0.5);

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

    });
    it('OOC Birdseye', async () => {

        await prepare();

        // Set Mode to Copy GM
        await GMGamePage.openDirector();
        expect(GMGamePage.director).toBeExisting();

        await GMDirector.buttonCloneDMOOC.click();

        await sleep(1000);

        // Move Viewport

        await GMGamePage.panViewport(100,100,1);

        await sleep(1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await GMDirector.buttonBirdsEyeOOC.click();

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

    });
});