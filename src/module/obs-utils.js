import { isOBS } from './utils/obs.mjs';
import {
  hideApplication,
  hideTokenBorder,
  tokenMoved,
  startCombat,
  passTurn,
  stopCombat,
  isGM,
  expandTokenHud,
  scaleToFit,
} from './utils/canvas.mjs';
import { generateDataBlockFromSetting, registerSettings } from './utils/settings.mjs';
import Director from './applications/director.mjs';
import '../less/obs-utils.less';
import { changeMode, sendMode, sendTrack, socketCanvas } from './utils/socket.mjs';

let d;

function buildButtons(buttons) {
  if (!game.user.isGM) return;
  var buttonGroup = buttons.find((element) => element.name === 'token');
  if (!buttonGroup) return;
  var newButton = {
    icon: 'fa-solid fa-signal-stream',
    name: 'openStreamDirector',
    title: 'Open Stream Director',
    toggle: true,
    onClick: () => openDirector(newButton),
  };
  buttonGroup.tools.push(newButton);
}

function openDirector(button) {
  if (!d) d = new Director(generateDataBlockFromSetting(sendMode, sendTrack), button);
  if (!d.rendered) d.render(true);
  else d.close();
}

function start() {
  Hooks.once('init', async function () {
    registerSettings();
  });

  Hooks.once('ready', async function () {
    if (isGM()) {
      Hooks.on('renderTokenHUD', expandTokenHud);
    }
  });

  Hooks.on('canvasPan', socketCanvas);

  if (isOBS()) {
    Hooks.once('ready', async function () {
      //Init Mode Object
      changeMode();
      //Simulate a user interaction to start video playback
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    Hooks.once('init', async function () {
      if (game.view == 'stream') $('body.stream').css('background-color', 'transparent');
      if (game.view != 'game') return;
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
    });
  } else {
    Hooks.on('getSceneControlButtons', buildButtons);
  }
}

start();
