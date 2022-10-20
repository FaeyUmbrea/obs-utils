import { isOBS } from './utils/obs.mjs';
import {
  hideApplication,
  hideTokenBorder,
  tokenMoved,
  isGM,
  expandTokenHud,
  scaleToFit,
  closePopupWithDelay,
  preserveSideBar,
  showTracker,
  hideSidebar,
} from './utils/canvas.mjs';
import { registerSettings } from './utils/settings.mjs';
import Director from './applications/director.mjs';
import '../less/obs-utils.less';
import { socketCanvas } from './utils/socket.mjs';
import { handleCombat, stopCombat } from './utils/combat.mjs';

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
  if (!d) d = new Director(button);
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
    if (isOBS()) {
      //Simulate a user interaction to start video playback
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    }
  });

  Hooks.on('canvasPan', socketCanvas);

  if (isOBS()) {
    Hooks.once('init', async function () {
      if (game.view == 'stream') $('body.stream').css('background-color', 'transparent');
      if (game.view != 'game') return;
      Hooks.once('canvasReady', scaleToFit);

      Hooks.on('renderSidebar', hideApplication);
      Hooks.on('renderSceneNavigation', hideApplication);
      Hooks.on('renderMainMenu', hideApplication);
      Hooks.on('renderSceneControls', hideApplication);
      Hooks.on('renderTokenHUD', hideApplication);
      Hooks.on('renderUserConfig', hideApplication);
      Hooks.on('renderCameraViews', hideApplication);
      Hooks.on('renderPlayerList', hideApplication);
      Hooks.on('renderHotbar', hideApplication);

      Hooks.on('renderSidebar', preserveSideBar);

      $('section#ui-left img#logo').remove();

      Hooks.on('drawToken', hideTokenBorder);
      Hooks.on('refreshToken', hideTokenBorder);

      Hooks.on('updateToken', tokenMoved);

      Hooks.on('updateCombat', handleCombat);
      Hooks.on('updateCombat', tokenMoved);
      Hooks.on('updateCombat', showTracker);
      Hooks.on('deleteCombat', stopCombat);
      Hooks.on('deleteCombat', hideSidebar);

      // Close Popups after configurable Time
      Hooks.on('renderJournalSheet', closePopupWithDelay);
      Hooks.on('renderImagePopout', closePopupWithDelay);
    });
  } else {
    Hooks.on('getSceneControlButtons', buildButtons);
  }
}

start();
