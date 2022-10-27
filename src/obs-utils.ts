import { handleOBS, isOBS, registerOBSEvents } from './utils/obs';
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
} from './utils/canvas.js';
import { registerSettings } from './utils/settings';
import DirectorApplication from './applications/director';
import { socketCanvas } from './utils/socket';
import { handleCombat, stopCombat } from './utils/combat';
import { getGame } from './utils/helpers';

let d: any;

function buildButtons(buttons: SceneControl[]) {
  if (!getGame().user?.isGM) return;
  const buttonGroup = buttons.find((element) => element.name === 'token');
  const newButton = {
    icon: 'fa-solid fa-signal-stream',
    name: 'openStreamDirector',
    title: 'Open Stream Director',
    toggle: true,
    onClick: (): void => openDirector(newButton),
  };
  buttonGroup?.tools.push(newButton);
}

function openDirector(button: SceneControlTool) {
  if (!d) d = new DirectorApplication(button);
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
      if (getGame().view == 'stream') $('body.stream').css('background-color', 'transparent');
      if (getGame().view != 'game') return;
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

      // Adding OBS Remote hooks;
      Hooks.on('updateCombat', (combat: Combat, change: any) => {
        if (change.turn == 0 && change.round == 1) handleOBS('onCombatStart');
      });
      Hooks.on('deleteCombat', () => {
        handleOBS('onCombatEnd');
      });
      Hooks.on('pauseGame', (pause: boolean) => {
        if (pause) {
          handleOBS('onPause');
        } else {
          handleOBS('onUnpause');
        }
      });
      Hooks.once('ready', () => handleOBS('onLoad'));

      registerOBSEvents();
    });
  } else {
    Hooks.on('getSceneControlButtons', buildButtons);
  }
}

start();
