import {expect, test} from '@playwright/test';
import v8toIstanbul from 'v8-to-istanbul';
import fs from 'fs';

test.describe.configure({ mode: 'serial' });

let obsPage;
let gmPage;

test.beforeAll(async ({browser})=>{

  let gmContext = await browser.newContext();

  gmPage = await gmContext.newPage();

  await gmPage.coverage.startJSCoverage();
  await gmPage.goto("/setup");
  
  if(gmPage.url().includes("/auth")){
    await gmPage.locator("input#key").fill(process.env.TEST_INSTALL_PASSWORD ? process.env.TEST_INSTALL_PASSWORD : '');
    await gmPage.getByRole('button', { name: ' Submit' }).click();
    await gmPage.waitForURL("/setup");
  }

  if(gmPage.url().includes("/setup")){
    await gmPage.getByRole('button', { name: ' Launch World' }).click();
  }

  await expect(gmPage).toHaveURL("/join")
  await gmPage.goto("/join");

  await gmPage.locator('select[name="userid"]').selectOption({label:"Gamemaster"});
  await gmPage.locator("input[name=password]").fill(process.env.TEST_INSTALL_PASSWORD ? process.env.TEST_INSTALL_PASSWORD : '');
    
  await gmPage.getByRole('button', { name: ' Join Game Session' }).click();
  await expect(gmPage).toHaveURL('/game');
})

test.beforeAll(async ({browser})=>{

  let obsContext = await browser.newContext();

  await obsContext.addInitScript({path:'tests/initScripts/fakeobs.js'})

  obsPage = await obsContext.newPage(); 

  await obsPage.coverage.startJSCoverage();

  await obsPage.goto("/join");

  await obsPage.locator('select[name="userid"]').selectOption({label:"Player2"});
  await obsPage.locator("input[name=password]").fill(process.env.TEST_INSTALL_PASSWORD ? process.env.TEST_INSTALL_PASSWORD : '');
  await obsPage.getByRole('button', { name: ' Join Game Session' }).click();
  await expect(obsPage).toHaveURL('/game');
})


test.describe('DM Client Only Tests', () => {
  test.beforeEach(async () => {
    await gmPage.goto('/game');
  
    await gmPage.waitForFunction(() => window['game'].ready)
  })
  test('Click Director Button to Open and Close', async () => {
    await openDirector(gmPage);

    await closeDirector(gmPage);
  })
  test('Toggle Tag Via HUD', async () => {
    await takeControlOfToken(gmPage);
    await gmPage.evaluate(() => window['game'].canvas.hud.token.bind(window["game"].canvas.tokens.controlled[0]))

    let button = gmPage.locator("div#hud i[title='Track Token']");
    let before = await gmPage.evaluate(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track"))
    if(!before){
      button.click()
      await gmPage.waitForFunction(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track")===true)
    }
    await button.click();
    await gmPage.waitForFunction(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track")===false)
    await button.click();
    await gmPage.waitForFunction(() => window['Tagger'].hasTags(window['canvas'].tokens.controlled[0],"obs_manual_track")===true)
  })
})

test.describe('OBS Client Only Tests', () => {
  test.beforeEach(async () => {
    await obsPage.goto('/game');
  
    await obsPage.waitForFunction(() => window['game'].ready)
  })
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
  test.beforeEach(async () => {
    await gmPage.goto('/game');
  
    await gmPage.waitForFunction(() => window['game'].ready)
  
    await obsPage.goto('/game');
  
    await obsPage.waitForFunction(() => window['game'].ready)
  })
  test('Journal Popout Close Delay', async () => {
    let delay = await gmPage.evaluate(()=> window['game'].settings.get('obs-utils', 'popupCloseDelay')) * 1100;

    await gmPage.evaluate(() => [...window['game'].journal][0].show())
    await expect(obsPage.locator("div.app.window-app.sheet.journal-sheet")).toBeVisible();
    await obsPage.waitForTimeout(delay);
    await expect(obsPage.locator("div.app.window-app.sheet.journal-sheet")).not.toBeVisible();
  });
  test('Image Popout Close Delay', async () => {
    let delay = await gmPage.evaluate(()=> window['game'].settings.get('obs-utils', 'popupCloseDelay')) * 1000 + 1000;

    await gmPage.evaluate(() => window['game'].journal.constructor.showImage('https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home.png'));
    await expect(obsPage.locator("div.app.window-app.image-popout")).toBeVisible();
    await obsPage.waitForTimeout(delay);
    await expect(obsPage.locator("div.app.window-app.image-popout")).not.toBeVisible();
  })
  test('Toggle Show Combat Tracker', async () =>{
    await gmPage.evaluate(()=> window['game'].settings.set('obs-utils', 'showTrackerInCombat', false)) 
    await gmPage.waitForFunction(()=> window['game'].settings.get('obs-utils', 'showTrackerInCombat')===false)

    await startCombatWithAllTokens(gmPage);

    await expect(obsPage.locator("div#sidebar.app")).not.toBeVisible();

    await endCombat(gmPage);

    await gmPage.evaluate(()=> window['game'].settings.set('obs-utils', 'showTrackerInCombat', true)) 
    await gmPage.waitForFunction(()=> window['game'].settings.get('obs-utils', 'showTrackerInCombat')===true)

    await startCombatWithAllTokens(gmPage);

    await expect(obsPage.locator("div#sidebar.app")).toBeVisible();

    await endCombat(gmPage);

    await expect(obsPage.locator("div#sidebar.app")).not.toBeVisible();

  })
});

test.describe('Multiclient Functionality Non-Combat', () => {
  test.beforeEach(async () => {
    await gmPage.goto('/game');
  
    await gmPage.waitForFunction(() => window['game'].ready)
  
    await obsPage.goto('/game');
  
    await obsPage.waitForFunction(() => window['game'].ready)
  })
  test('Track All', async () => {

    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioooctrackall]").click();

    await closeDirector(gmPage);

    await takeControlOfToken(gmPage);

    await gmPage.keyboard.press('a',{delay:1000});

    let before = await getOBSViewport();

    await gmPage.keyboard.press('d',{delay:1000});

    await expect(before).not.toEqual(getOBSViewport());

  });
  test('Tag Based', async () =>{
    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioooctrackmanual]").click();

    await closeDirector(gmPage);

    await takeControlOfToken(gmPage);

    await gmPage.keyboard.press('a',{delay:1000});

    let before = await getOBSViewport();

    await gmPage.keyboard.press('d',{delay:1000});

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);
  })
  test('Copy GM', async () =>{
    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioooccloneDM]").click();

    await closeDirector(gmPage);

    await panGMViewport(gmPage,100,100,0.5);

    let before = await getOBSViewport();

    await gmPage.waitForTimeout(1000);

    await panGMViewport(gmPage,200,200,1);
    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);
  })
  test('Birdseye', async () => {

    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioooccloneDM]").click();

    await closeDirector(gmPage);

    await panGMViewport(gmPage,100,100,0.5);
    let before = await getOBSViewport();



    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radiooocbirdseye]").click();

    await closeDirector(gmPage);

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

  })
  
})

test.describe('Multiclient Functionality Combat', () => {
  test.beforeEach(async () => {
    await gmPage.goto('/game');
  
    await gmPage.waitForFunction(() => window['game'].ready)
  
    await obsPage.goto('/game');
  
    await obsPage.waitForFunction(() => window['game'].ready)
  })
  test('Track All', async () => {

    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioictrackall]").click();

    await closeDirector(gmPage);

    await startCombatWithAllTokens(gmPage);

    await takeControlOfToken(gmPage);

    await gmPage.keyboard.press('a',{delay:1000});

    let before = await getOBSViewport();

    await gmPage.keyboard.press('d',{delay:1000});

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

    await endCombat(gmPage);

  });
  test('Copy GM', async () =>{
    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioiccloneDM]").click();

    await closeDirector(gmPage);

    await startCombatWithAllTokens(gmPage)

    await panGMViewport(gmPage,100,100,0.5);

    let before = await getOBSViewport();

    await gmPage.waitForTimeout(1000);

    await panGMViewport(gmPage,200,200,1);
    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

    await endCombat(gmPage);
  })
  test('Birdseye', async () => {

    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radioiccloneDM]").click();

    await closeDirector(gmPage);

    await startCombatWithAllTokens(gmPage)


    await panGMViewport(gmPage,100,100,0.5);
    let before = await getOBSViewport();



    await openDirector(gmPage);

    await gmPage.locator("div[id=director-application] label[for=radiooocbirdseye]").click();

    await closeDirector(gmPage);

    let after = await getOBSViewport();

    await expect(before).not.toEqual(after);

    await endCombat(gmPage);

  })
  
})

test.describe('Player Client Additional Tests', () => {
    let playerPage;
    let playerContext;

    test.beforeAll(async ({browser}) => {
      playerContext = await browser.newContext()
      playerPage = await playerContext.newPage();
      playerPage.goto("/join")
      await playerPage.locator('select[name="userid"]').selectOption({label:"Player3"});
      await playerPage.locator("input[name=password]").fill(process.env.TEST_INSTALL_PASSWORD ? process.env.TEST_INSTALL_PASSWORD : '');
      await playerPage.getByRole('button', { name: ' Join Game Session' }).click();
      await expect(playerPage).toHaveURL('/game');
      await playerPage.waitForFunction(() => window['game']?.ready)
    })

    test.beforeEach(async () => {
      await gmPage.goto('/game');
    
      await gmPage.waitForFunction(() => window['game'].ready)
    
      await obsPage.goto('/game');
    
      await obsPage.waitForFunction(() => window['game'].ready)

      await playerPage.goto('/game');
    
      await playerPage.waitForFunction(() => window['game'].ready)
    })

    test('Copy Player', async () =>{
      await openDirector(gmPage);
  
      await gmPage.locator("div[id=director-application] label[for=radiooocclonePlayer]").click();
      await gmPage.locator("select[name=trackedPlayer]").selectOption({label:'Player3'});
  
      await closeDirector(gmPage);
  
  
      await playerPage.evaluate(() => window['canvas'].pan({x: 100, y: 100, scale: 0.5}));
      
      await expect.poll(async () => {return await getOBSViewport()}).toEqual([100,100,0.5,0.5]);
  
      await playerPage.evaluate(() => window['canvas'].pan({x: 200, y: 200, scale: 1}));
  
      await expect.poll(async () => {return await getOBSViewport()}).toEqual([200,200,1,1]);
  
      await panGMViewport(gmPage,300,300,10);
  
      await expect.poll(async () => {return await getOBSViewport()}).toEqual([200,200,1,1]);
    })

    test.afterAll(async () =>{
      await playerContext.close();
    })
  })

test.afterAll(async ()=>{
  let coverageGM = await gmPage.coverage.stopJSCoverage();
  let coverageOBS = await obsPage.coverage.stopJSCoverage();
  let coverage = [...coverageGM,...coverageOBS];
  fs.rmSync(process.cwd()+"/.nyc_output",{recursive:true,force:true});
  fs.mkdirSync(process.cwd()+"/.nyc_output");
  const converter = v8toIstanbul('dist/indexindex.js', undefined, undefined, (path) => path.includes('node_modules'));
    await converter.load();
  for (const entry of coverage) {
    if(!entry.source) continue;
    converter.applyCoverage(entry.functions);
  }
  let data = JSON.stringify(converter.toIstanbul());
    
  fs.writeFileSync(process.cwd() + '/.nyc_output/data.json',data);
})

async function startCombatWithAllTokens(gmPage){
  await gmPage.locator("a.item[data-tab=combat]").click();


  await gmPage.evaluate(() => {window['canvas'].tokens.ownedTokens.forEach((token)=>token.control({releaseOthers: false}))});
  await gmPage.evaluate(() => {window['canvas'].tokens.toggleCombat(true)})

  await gmPage.locator("a.combat-control[data-control=startCombat]").click();
}

async function endCombat(gmPage){
  await gmPage.locator("a.item[data-tab=combat]").click();

  await gmPage.locator("a.combat-control.center[data-control=endCombat]").click();

  await gmPage.locator("button.dialog-button.yes.default[data-button=yes]").click();

  await gmPage.locator("button.dialog-button.yes.default[data-button=yes]").waitFor({state:'hidden'});

}

async function openDirector(gmPage){
  await gmPage.locator('li[data-tool=openStreamDirector]').click();
  await expect(gmPage.locator('div[id=director-application]')).toBeVisible();
}

async function closeDirector(gmPage){
  await gmPage.locator('li[data-tool=openStreamDirector]').click();
  await expect(gmPage.locator('div[id=director-application]')).not.toBeVisible();
}

async function takeControlOfToken(gmPage){
  await gmPage.evaluate(() => window['game'].canvas.tokens.ownedTokens[0].control())
}

async function getOBSViewport(){
  return await obsPage.evaluate(() => [window['canvas'].stage.position.scope.pivot.x,window['canvas'].stage.position.scope.pivot.y,window['canvas'].stage.position.scope.scale.x,window['canvas'].stage.position.scope.scale.y])
}

async function panGMViewport(gmPage,x,y,scale){
  await gmPage.evaluate((arg) => window['canvas'].pan({x: arg.x, y: arg.y, scale: arg.scale}), {x,y,scale})
}
