import GamePage from '../pageobjects/game.page';
import LoginPage from  '../pageobjects/join.page';
import SetupPage from '../pageobjects/setup.page';

async function foundryLogin(){

}

before('Start World', async () => {
    await SetupPage.open();
    if(await (await SetupPage.btnSubmit).isExisting()) await SetupPage.setup();
})

describe('My Login application', () => {
    it('should login with valid credentials', async () => {
        await LoginPage.open();
        await expect(LoginPage.btnSubmit).toBeExisting();
        await LoginPage.login('Gamemaster', '');
        await expect(GamePage.canvas).toBeExisting();
    });
});



