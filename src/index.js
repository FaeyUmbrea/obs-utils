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
import {registerSettings, runMigrations} from './utils/settings.js';
import {socketCanvas} from './utils/socket.js';
import {handleCombat, stopCombat} from './utils/combat.js';
import {isOBS} from './utils/helpers.js';
import {renderOverlays} from './utils/stream.js';
import {ObsUtilsApi, registerDefaultTypes} from './utils/api.js';

function start() {
  Hooks.once('init', async function () {
    const moduleData = game?.modules?.get('obs-utils');
    if (moduleData) {
      moduleData.api = new ObsUtilsApi();
      registerDefaultTypes();
      Hooks.call('obsUtilsInit');
    }
    registerSettings();
    if (game.view === 'game') {
      await (await import('./utils/menus.js')).registerMenus();
    }
  });

  Hooks.once('ready', async function () {
    if (isGM()) {
      Hooks.on('renderTokenHUD', expandTokenHud);
      runMigrations();
    }
    if (isOBS()) {
      //Simulate a user interaction to start video playback
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    }
  });

  Hooks.on('canvasPan', socketCanvas);

  if (isOBS()) {
    Hooks.once('init', async function () {
      if (game.view === 'stream') {
        Hooks.once('renderChatLog', () => renderOverlays());
      }
      if (game.view !== 'game') return;
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

      registerOBSEvents();
    });
  }
}
start();
