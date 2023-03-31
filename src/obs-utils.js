import {handleOBS, registerOBSEvents} from './utils/obs.js';
import {
  closePopupWithDelay,
  expandTokenHud,
  hideApplication,
  hideSidebar,
  hideTokenBorder,
  isGM,
  preserveSideBar,
  scaleToFit,
  showTracker,
  tokenMoved,
} from './utils/canvas.js';
import {registerSettings} from './utils/settings.js';
import DirectorApplication from './applications/director.js';
import {socketCanvas} from './utils/socket.js';
import {handleCombat, stopCombat} from './utils/combat.js';
import {getGame, isOBS} from './utils/helpers.js';
import {renderOverlays} from './utils/stream.js';
import {ObsUtilsApi, registerDefaultTypes} from './utils/api.js';

let d;

function buildButtons(buttons) {
  if (!getGame().user?.isGM) return;
  const buttonGroup = buttons.find((element) => element.name === 'token');
  const newButton = {
    icon: 'fa-solid fa-signal-stream',
    name: 'openStreamDirector',
    title: 'Open Stream Director',
    toggle: true,
    onClick: ()=> openDirector(newButton),
  };
  buttonGroup?.tools.push(newButton);
}

function openDirector(button) {
  if (!d) d = new DirectorApplication(button);
  if (!d.rendered) d.render(true);
  else d.close();
}

function start() {
  Hooks.once('init', async function () {
    const moduleData = getGame()?.modules?.get('obs-utils');
    if (moduleData) {
      moduleData.api = new ObsUtilsApi();
      registerDefaultTypes();
      Hooks.call('obsUtilsInit');
    }
    registerSettings();
    if (getGame().view === 'game') {
      await (await import('./utils/menus.js')).registerMenus();
    }
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
      if (getGame().view === 'stream') {
        Hooks.once('renderChatLog', () => renderOverlays());
      }
      if (getGame().view !== 'game') return;
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
      Hooks.on('updateCombat', (_combat, change) => {
        if (change.turn === 0 && change.round === 1) handleOBS('onCombatStart');
      });
      Hooks.on('deleteCombat', () => {
        handleOBS('onCombatEnd');
      });
      Hooks.on('pauseGame', (pause) => {
        if (pause) {
          handleOBS('onPause');
        } else {
          handleOBS('onUnpause');
        }
      });
      Hooks.once('ready', () => handleOBS('onLoad'));

      await registerOBSEvents();
    });
  } else {
    Hooks.on('getSceneControlButtons', buildButtons);
  }
}
start();
