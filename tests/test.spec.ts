import { test, expect, Page } from '@playwright/test';
import v8toIstanbul from 'v8-to-istanbul';
import fs from 'fs';

test.describe.configure({ mode: 'serial' });

let gmPage: Page;
let obsPage: Page;

test.beforeAll(async ({browser})=>{

  let gmContext = await browser.newContext();
  let obsContext = await browser.newContext();

  await obsContext.addInitScript({path:'tests/initScripts/fakeobs.js'})

  gmPage = await gmContext.newPage();
  obsPage = await obsContext.newPage(); 

  await gmPage.coverage.startJSCoverage();
  await obsPage.coverage.startJSCoverage();

  await gmPage.goto("/setup");
  
  if(gmPage.url().includes("/setup")){
    await gmPage.getByRole('button', { name: ' Launch World' }).click();
  }

  await expect(gmPage).toHaveURL("/join")
  await gmPage.goto("/join");
  await obsPage.goto("/join");

  await gmPage.locator('select[name="userid"]').selectOption({label:"Gamemaster"});
  await gmPage.getByPlaceholder('Password').fill('');
    
  await gmPage.getByRole('button', { name: ' Join Game Session' }).click();
  await expect(gmPage).toHaveURL('http://localhost:31000/game');

  await obsPage.locator('select[name="userid"]').selectOption({label:"Player2"});
  await obsPage.getByPlaceholder('Password').fill('');
  await obsPage.getByRole('button', { name: ' Join Game Session' }).click();
  await expect(obsPage).toHaveURL('http://localhost:31000/game');
})

test.beforeEach(async () => {
  await gmPage.goto('/game');

  await gmPage.waitForFunction(() => window['game'].ready)

  await obsPage.goto('/game');

  await obsPage.waitForFunction(() => window['game'].ready)
})

test.describe('DM Client Only Tests', () => {
  test('Click Director Button to Open and Close', async () => {
    await openDirector();

    await closeDirector();
  })
  test('Toggle Tag Via HUD', async () => {
    await takeControlOfToken();
    await gmPage.evaluate(() => window['game'].canvas.hud.token.bind(window["game"].canvas.tokens.controlled[0]))

    let button = gmPage.locator("div#hud i[title='Track Token']");
    let before = await gmPage.evaluate(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track"))
    if(!before){
      button.click()
      await gmPage.waitForFunction(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track")==true)
    }
    await gmPage.screenshot({path: 'before.png'});
    await button.click();
    await gmPage.waitForFunction(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track")==false)
    await gmPage.screenshot({path: 'after.png'});
    await button.click();
    await gmPage.waitForFunction(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track")==true)
  })
})

test.describe('OBS Client Only Tests', () => {
  test('Test Elements Disappearing', async () => {
    await expect(obsPage.locator('nav#controls')).not.toBeVisible();
    await expect(obsPage.locator('nav#navigation')).not.toBeVisible();
    await expect(obsPage.locator('div#hotbar')).not.toBeVisible();
    await expect(obsPage.locator('aside#players.app')).not.toBeVisible();
    await expect(obsPage.locator('div#sidebar.app')).not.toBeVisible();
  })
  test('Test Stream Page Background', async () => {
    await obsPage.goto('/stream');

    await obsPage.locator('ol#chat-log').waitFor({state:'visible'});

    await expect(obsPage.locator('body.stream')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })
});

test.describe('Multiclient UI', () => {
  test('Journal Popout Close Delay', async () => {
    let delay = await gmPage.evaluate(()=> window['game'].settings.get('obs-utils', 'popupCloseDelay')) * 1100;

    await gmPage.evaluate(() => [...window['game'].journal][0].show())
    await expect(obsPage.locator("div.app.window-app.sheet.journal-sheet")).toBeVisible();
    await expect(obsPage.locator("div.app.window-app.sheet.journal-sheet")).not.toBeVisible({timeout:delay});
  });
  test('Image Popout Close Delay', async () => {
    let delay = await gmPage.evaluate(()=> window['game'].settings.get('obs-utils', 'popupCloseDelay')) * 1000 + 1000;

    await gmPage.evaluate(() => window['game'].journal.constructor.showImage('https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home.png'));
    await expect(obsPage.locator("div.app.window-app.image-popout")).toBeVisible();
    await expect(obsPage.locator("div.app.window-app.image-popout")).not.toBeVisible({timeout:delay});
  })
  test('Toggle Show Combat Tracker', async () =>{
    let initialSetting = await gmPage.evaluate(()=> window['game'].settings.get('obs-utils', 'showTrackerInCombat')) 

    await gmPage.evaluate(()=> window['game'].settings.set('obs-utils', 'showTrackerInCombat', false)) 
    await gmPage.waitForFunction(()=> window['game'].settings.get('obs-utils', 'showTrackerInCombat')==false)

    await startCombatWithAllTokens();

    await expect(obsPage.locator("div#sidebar.app")).not.toBeVisible();

    await endCombat();

    await gmPage.evaluate(()=> window['game'].settings.set('obs-utils', 'showTrackerInCombat', true)) 
    await gmPage.waitForFunction(()=> window['game'].settings.get('obs-utils', 'showTrackerInCombat')==true)

    await startCombatWithAllTokens();

    await expect(obsPage.locator("div#sidebar.app")).toBeVisible();

    await endCombat();

    await expect(obsPage.locator("div#sidebar.app")).not.toBeVisible();

  })
});

test.describe('Multi Client Functionality Non-Combat', () => {
  test('OOC Track All', async () => {

    await openDirector();

    await gmPage.locator("div[id=director-application] label[for=radioooctrackall]").click();

    await closeDirector();

    await takeControlOfToken();

    await gmPage.keyboard.press('a',{delay:1000});

    let before = await getOBSViewport();

    await gmPage.keyboard.press('d',{delay:1000});

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

  });
  test('OOC Tag Based', async () =>{
    await openDirector();

    await gmPage.locator("div[id=director-application] label[for=radioooctrackmanual]").click();

    await closeDirector();

    await takeControlOfToken();

    await gmPage.keyboard.press('a',{delay:1000});

    let before = await getOBSViewport();

    await gmPage.keyboard.press('d',{delay:1000});

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);
  })
  test('OOC Copy GM', async () =>{
    await openDirector();

    await gmPage.locator("div[id=director-application] label[for=radioooccloneDM]").click();

    await closeDirector();

    await panGMViewport(100,100,0.5);

    let before = await getOBSViewport();

    await gmPage.waitForTimeout(1000);

    await panGMViewport(200,200,1);
    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);
  })
  test('OOC Birdseye', async () => {

    await openDirector();

    await gmPage.locator("div[id=director-application] label[for=radioooccloneDM]").click();

    await closeDirector();

    await panGMViewport(100,100,0.5);
    let before = await getOBSViewport();



    await openDirector();

    await gmPage.locator("div[id=director-application] label[for=radiooocbirdseye]").click();

    await closeDirector();

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

  })
  test('OOC Copy Player', async ({browser}) =>{
    await openDirector();

    await gmPage.locator("div[id=director-application] label[for=radiooocclonePlayer]").click();
    await gmPage.locator("select[name=trackedPlayer]").selectOption({label:'Player3'});

    await closeDirector();

    let playerPage = await (await browser.newContext()).newPage();
    playerPage.goto("/join")
    await playerPage.locator('select[name="userid"]').selectOption({label:"Player3"});
    await playerPage.getByPlaceholder('Password').fill('');
    await playerPage.getByRole('button', { name: ' Join Game Session' }).click();
    await expect(playerPage).toHaveURL('http://localhost:31000/game');
    await playerPage.waitForFunction(() => window['game'].ready)

    await playerPage.evaluate(() => window['canvas'].pan({x: 100, y: 100, scale: 0.5}));
    
    let before = await getOBSViewport();
    
    await playerPage.waitForTimeout(2000);

    await playerPage.evaluate(() => window['canvas'].pan({x: 200, y: 200, scale: 1}));
    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

    before = after;

    await panGMViewport(300,300,10);

    await expect(before).toEqual(await getOBSViewport());

    playerPage.close();
  })
})

test.afterAll(async ()=>{
  let coverageGM = await gmPage.coverage.stopJSCoverage();
  let coverageOBS = await obsPage.coverage.stopJSCoverage();
  let coverage = [...coverageGM,...coverageOBS];
  fs.rmSync(process.cwd()+"/.nyc_output",{recursive:true,force:true});
  fs.mkdirSync(process.cwd()+"/.nyc_output");
  for (const entry of coverage) {
    if(!entry.source) continue;
    const converter = v8toIstanbul('dist/obs-utils.mjs',undefined,undefined,(path)=>path.includes('node_modules'));
    await converter.load();
    entry.url.replace('obs-utils/','')
    converter.applyCoverage(entry.functions);
    let data = JSON.stringify(converter.toIstanbul());
    
    fs.writeFileSync(process.cwd() + '/.nyc_output/'+entry.scriptId+'.json',data);
  }
})

async function startCombatWithAllTokens(){
  await gmPage.locator("a.item[data-tab=combat]").click();


  await gmPage.evaluate(() => {window['canvas'].tokens.ownedTokens.forEach((token)=>token.control({releaseOthers: false}))});
  await gmPage.evaluate(() => {window['canvas'].tokens.toggleCombat(true)})

  await gmPage.locator("a.combat-control[data-control=startCombat]").click();
}

async function endCombat(){
  await gmPage.locator("a.item[data-tab=combat]").click();

  await gmPage.locator("a.combat-control.center[data-control=endCombat]").click();

  await gmPage.locator("button.dialog-button.yes.default[data-button=yes]").click();

  await gmPage.locator("button.dialog-button.yes.default[data-button=yes]").waitFor({state:'hidden'});

}

async function openDirector(){
  gmPage.locator('li[data-tool=openStreamDirector]').click();
  await expect(gmPage.locator('div[id=director-application]')).toBeVisible();
}

async function closeDirector(){
  gmPage.locator('li[data-tool=openStreamDirector]').click();
  await expect(gmPage.locator('div[id=director-application]')).not.toBeVisible();
}

async function takeControlOfToken(){
  await gmPage.evaluate(() => window['game'].canvas.tokens.ownedTokens[0].control())
}

async function getOBSViewport(){
  return await obsPage.evaluate(() => [window['canvas'].stage.position.scope.pivot.x,window['canvas'].stage.position.scope.pivot.y,window['canvas'].stage.position.scope.scale.x,window['canvas'].stage.position.scope.scale.y])
}

async function panGMViewport(x,y,scale){
  await gmPage.evaluate((arg) => window['canvas'].pan({x: arg.x, y: arg.y, scale: arg.scale}), {x,y,scale})
}