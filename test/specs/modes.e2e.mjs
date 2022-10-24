import GMDirector from '../pageobjects/gm.director.element.mjs';
import GMGamePage from '../pageobjects/gm.game.page.mjs';
import GMLoginPage from '../pageobjects/gm.join.page.mjs';
import OBSGamePage from '../pageobjects/obs.game.page.mjs';
import OBSLoginPage from '../pageobjects/obs.join.page.mjs';
import OBSStreamPage from '../pageobjects/obs.stream.page.mjs';
import PlayerGamePage from '../pageobjects/player.game.page.mjs';
import PlayerLoginPage from '../pageobjects/player.join.page.mjs';
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
    GMLoginPage.btnSubmit.waitForExist();
    GMLoginPage.login('Gamemaster', '');
    gmClient.waitUntil(GMGamePage.isReady)

    OBSLoginPage.open();
    OBSLoginPage.btnSubmit.waitForExist();
    OBSLoginPage.login('Player2', '');
    obsClient.waitUntil(OBSGamePage.isReady)

    PlayerLoginPage.open();
    PlayerLoginPage.btnSubmit.waitForExist();
    PlayerLoginPage.login('Player3', '');
    playerClient.waitUntil(PlayerGamePage.isReady);
})

async function prepare() {
    // GM
    await GMGamePage.open();
    await gmClient.waitUntil(GMGamePage.isReady)

    //OBS
    await OBSGamePage.open()
    await obsClient.waitUntil(OBSGamePage.isReady)
}

describe('DM Client Only', () => {
    it('Click Director Button to Open and Close', async () => {
        await GMGamePage.open();
        await gmClient.waitUntil(GMGamePage.isReady)

        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMGamePage.toggleDirectorWithIconButton();
        await sleep(1000);
        await expect(await GMGamePage.director.isExisting()).toBe(false);
    }),
    it('Toggle Tag Via HUD', async () => {
        await GMGamePage.open();
        await gmClient.waitUntil(GMGamePage.isReady)

        await sleep(1000);

        await GMGamePage.takeControlOfToken();
        await GMGamePage.openTokenHUDOnCurrentSelected();
        await GMGamePage.tokenHudButton.waitForExist();
        var before = await GMGamePage.isCurrentTokenTagged();
        await sleep(1000);
        await GMGamePage.tokenHudButton.click();
        await sleep(1000);
        var after = await GMGamePage.isCurrentTokenTagged();

        await expect(before).not.toEqual(after);
        await GMGamePage.tokenHudButton.click();
        await sleep(1000);

    })
});

describe('OBS Client Only', () => {
    it('Test Elements Disappearing', async () => {
        await OBSGamePage.open()
        await obsClient.waitUntil(OBSGamePage.isReady)

        expect(OBSGamePage.macroHotbar).not.toBeDisplayed();
        expect(OBSGamePage.navBar).not.toBeDisplayed();
        expect(OBSGamePage.playerList).not.toBeDisplayed();
        expect(OBSGamePage.sceneNav).not.toBeDisplayed();
        expect(OBSGamePage.sidebar).not.toBeDisplayed();
    });
    it('Test Stream Page Background', async () => {
        await OBSStreamPage.open()
        await OBSStreamPage.chat.waitForExist();

        expect(OBSStreamPage.body).toHaveElementProperty('background','transparent');
        expect(OBSStreamPage.body).not.toHaveElementProperty('background','green');
    })
});

describe('Multi Client Functionality UI', () => {
    it('Journal Popout Close Delay', async () =>{
        prepare();
        await sleep(10000);
        var delay = await GMGamePage.getSetting("popupCloseDelay");

        await GMGamePage.showFirstJournalToPlayers();
        await OBSGamePage.journalPopout.waitForExist();
        await sleep(delay*1100);
        await expect((await OBSGamePage.journalPopout).isExisting()).not.toBe(true);
    });
    it('Image Popout Close Delay', async () =>{
        prepare();
        await sleep(10000);
        var delay = await GMGamePage.getSetting("popupCloseDelay");

        await GMGamePage.showGenericImageToPlayers();
        await OBSGamePage.imagePopout.waitForExist();
        await sleep(delay*1100);
        await expect((await OBSGamePage.imagePopout).isExisting()).not.toBe(true);
    });
    it('Toggle Show Combat Tracker', async () => {
        prepare();
        await sleep(5000);
        var initialSetting = await GMGamePage.getSetting('showTrackerInCombat');

        await GMGamePage.changeSetting('showTrackerInCombat',false);
        await sleep(1000);
        await GMGamePage.startCombatWithAllTokens();

        await expect(await (await OBSGamePage.sidebar).isDisplayed()).not.toBeTruthy();

        await GMGamePage.endCombat();

        await GMGamePage.changeSetting('showTrackerInCombat',true);

        await sleep(1000);

        await GMGamePage.startCombatWithAllTokens();

        await expect(await (await OBSGamePage.sidebar).isDisplayed()).toBeTruthy();

        await GMGamePage.endCombat();

        await GMGamePage.changeSetting('showTrackerInCombat', initialSetting);
    })
})

describe('Multi Client Functionality Non-Combat', () => {
    // OOC Tests
    
    it('OOC Track All', async () => {

        await prepare();

        // Set Mode to TrackAll
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();
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
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();
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
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMDirector.buttonCloneDMOOC.click();

        await sleep(3000);

        // Move Viewport

        await GMGamePage.panViewport(100,100,1);

        await sleep(3000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await GMGamePage.panViewport(300,300,0.5);

        await sleep(3000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

    });
    it('OOC Birdseye', async () => {

        await prepare();

        // Set Mode to Copy GM
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

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
    it('OOC Copy Player', async () => {

        await prepare();

        await PlayerGamePage.open();
        await playerClient.waitUntil(PlayerGamePage.isReady);

        // Set Mode to Copy GM
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMDirector.buttonClonePlayerOOC.click();
        await GMDirector.dropdownCopyPlayer.selectByVisibleText("Player3");

        await sleep(6000);

        // Move Viewport

        await PlayerGamePage.panViewport(100,100,1);

        await sleep(1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await PlayerGamePage.panViewport(300,300,0.5);

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);
        before = after;
        // Change Player 

        await GMDirector.dropdownCopyPlayer.selectByVisibleText("Player4");

        await sleep(1000);
        await PlayerGamePage.panViewport(300,300,0.5);

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).toEqual(before);

    });
});

describe('Multi Client Functionality Combat', () => {
    it('Track All', async () => {

        await prepare();

        await GMGamePage.startCombatWithAllTokens();

        // Set Mode to TrackAll
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();
        await sleep(1000);
        await GMDirector.buttonAllTokensIC.click();

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

        await GMGamePage.endCombat();
    });
    it('Track Turn Token', async () => {

        await prepare();

        await GMGamePage.startCombatWithAllTokens();

        // Set Mode to TrackAll
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();
        await sleep(1000);
        await GMDirector.buttonCurrentTokensIC.click();

        await sleep(1000);

        await GMGamePage.closeDirector();

        // Take Token

        await GMGamePage.takeControlOfCombatant();

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

        await GMGamePage.takeControlOfNextCombatant();
        await sleep(3000);

        await GMGamePage.holdKey('a', 1000);

        var after2 = await OBSGamePage.getViewport();
        await expect(after).toEqual(after2);

        await GMGamePage.holdKey('d', 1000);

        await GMGamePage.endCombat();
    });
    it('Birdseye', async () => {

        await prepare();

        await GMGamePage.startCombatWithAllTokens();

        // Set Mode to Copy GM
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMDirector.buttonCloneDMIC.click();

        await sleep(1000);

        // Move Viewport

        await GMGamePage.panViewport(100,100,1);

        await sleep(1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await GMDirector.buttonBirdsEyeIC.click();

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

        await GMGamePage.endCombat();

    });
    it('Copy GM', async () => {

        await prepare();

        await GMGamePage.startCombatWithAllTokens();

        // Set Mode to Copy GM
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMDirector.buttonCloneDMIC.click();

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

        await GMGamePage.endCombat();
    });
    it('Copy Player', async () => {

        await prepare();

        await GMGamePage.startCombatWithAllTokens();

        await PlayerGamePage.open();
        await playerClient.waitUntil(PlayerGamePage.isReady);

        // Set Mode to Copy GM
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMDirector.buttonClonePlayerIC.click();
        await GMDirector.dropdownCopyPlayer.selectByVisibleText("Player3");

        await sleep(1000);

        // Move Viewport

        await PlayerGamePage.panViewport(100,100,1);

        await sleep(1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        await PlayerGamePage.panViewport(300,300,0.5);

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        await expect(after).not.toEqual(before);

        await GMGamePage.endCombat();
    });
    it('Copy Turn Player', async () => {

        await prepare();

        await GMGamePage.startCombatWithAllTokens();

        await PlayerGamePage.open();
        await playerClient.waitUntil(PlayerGamePage.isReady);

        // Set Mode to Copy GM
        await GMGamePage.toggleDirectorWithIconButton();
        await GMGamePage.director.waitForExist();

        await GMDirector.buttonTurnPlayerIC.click();
        await GMDirector.dropdownCopyPlayer.selectByVisibleText("Player3");

        // Begin Test

        await sleep(1000);

        // Move Viewport

        await PlayerGamePage.panViewport(100,100,1);

        await sleep(1000);

        // Take Viewport on OBS Side

        var before = await OBSGamePage.getViewport();

        var testedOwned = false;
        var testedUnowned = false;
        var run = 1;

        while(!(testedOwned && testedUnowned)){
        await PlayerGamePage.panViewport(run,run,run);
        var player = await GMGamePage.getCurrentCombatantOwnerNames();

        await sleep(1000);

        // See if Viewport Changed
        var after = await OBSGamePage.getViewport();
        if(player.find((element) => (element == 'Player3'))){
            await expect(after).not.toEqual(before);
            before = after;
            testedOwned = true;
        }
        else {
            await expect(after).toEqual(before);
            before = after;
            testedUnowned = true;
        }
        await GMGamePage.advanceTurn();
        run++;
        }

        await GMGamePage.endCombat();
    });
});