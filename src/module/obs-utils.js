import { isOBS } from './helpers/obs.mjs';
import {
  hideApplication,
  hideTokenBorder,
  tokenMoved,
  startCombat,
  passTurn,
  stopCombat,
  getCurrentUser,
  isGM,
  expandTokenHud,
  scaleToFit,
} from './helpers/canvas.mjs';
import { generateDataBlockFromSetting, registerSettings } from './helpers/settings.mjs';
import Director from './applications/director.mjs';
import { changeMode, sendMode, sendTrack, socket } from './helpers/socket.mjs';
import { preloadTemplates } from './preloadTemplates.js';

function socketCanvas(_canvas, position) {
  socket.executeForOthers('viewport', position, getCurrentUser());
}

function buildButtons(buttons) {
  if (!game.user.isGM) return;
  var buttonGroup = buttons.find((element) => element.name === 'token');
  if (!buttonGroup) return;
  buttonGroup.tools.push({
    icon: 'fa-solid fa-signal-stream',
    name: 'openStreamDirector',
    title: 'Open Stream Director',
    toggle: true,
    onClick: openDirector,
  });

  console.warn(buttons);
}

function openDirector() {
  let d = new Director(generateDataBlockFromSetting(sendMode, sendTrack));
  d.render(true);
}

Hooks.once('init', async function () {
  registerSettings();
  preloadTemplates();
});

Hooks.once('ready', async function () {
  if (isGM()) {
    Hooks.on('renderTokenHUD', expandTokenHud);
  }
});

Hooks.on('canvasPan', socketCanvas);

if (isOBS()) {
  Hooks.once('ready', async function () {
    if (game.view == 'stream') $('body.stream').css('background-color', 'transparent');
    //Init Mode Object
    changeMode();
    //Simulate a user interaction to start video playback
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
  });

  Hooks.once('canvasReady', scaleToFit);

  Hooks.on('renderSidebar', hideApplication);
  Hooks.on('renderSceneNavigation', hideApplication);
  Hooks.on('renderMainMenu', hideApplication);
  Hooks.on('renderSceneControls', hideApplication);
  Hooks.on('renderTokenHUD', hideApplication);
  Hooks.on('renderSidebarTab', hideApplication);
  Hooks.on('renderUserConfig', hideApplication);
  Hooks.on('renderCameraViews', hideApplication);
  Hooks.on('renderPlayerList', hideApplication);
  Hooks.on('renderHotbar', hideApplication);

  $('section#ui-left img#logo').remove();

  Hooks.on('drawToken', hideTokenBorder);
  Hooks.on('refreshToken', hideTokenBorder);

  Hooks.on('updateToken', tokenMoved);

  Hooks.on('combatStart', startCombat);
  Hooks.on('combatTurn', passTurn);
  Hooks.on('combatEnd', stopCombat);
} else {
  Hooks.on('getSceneControlButtons', buildButtons);
}
