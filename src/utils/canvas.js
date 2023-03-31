/* global Tagger */

import { getCurrentCombatants } from './combat.js';
import { UI_ELEMENTS } from './const.js';
import { getCanvas, getGame, sleep } from './helpers.js';
import { getSetting } from './settings.js';

export const VIEWPORT_DATA = new Map();

export function hideApplication(_, html) {
  html.hide();
}
export function hideTokenBorder(token) {
  if (token?.border?.alpha) {
    token.border.alpha = 0;
  }
}

function getAutoTokens() {
  return getGame().canvas?.tokens?.ownedTokens;
}

function getManualToken() {
  return Tagger.getByTag('obs_manual_track').map((manualToken) => manualToken.object);
}

function toggleToken(token) {
  Tagger.toggleTags(token, 'obs_manual_track');
}

export function getCurrentUser() {
  return getGame().userId;
}

function trackAll() {
  trackTokenList(getAutoTokens());
}

function trackTokenList(tokens) {
  const coordinates = [];

  tokens?.forEach((token) => {
    const object = { x: token?.document.x, y: token?.document.y, width: token?.w, height: token?.h };
    coordinates.push(object);
  });

  const bounds = calculateBoundsOfCoodinates(coordinates);

  if (!bounds) return;

  const screenDimensions = getCanvas().screenDimensions;

  const scaleX = screenDimensions[0] / (bounds.maxX - bounds.minX + 300);
  const scaleY = screenDimensions[1] / (bounds.maxY - bounds.minY + 300);

  let scale = Math.min(scaleX, scaleY);
  scale = Math.min(scale, getSetting('maxScale'));
  scale = Math.max(scale, getSetting('minScale'));

  getCanvas().animatePan({ x: bounds.center.x, y: bounds.center.y, scale: scale });
}

export function tokenMoved() {
  if (getGame().combat?.started) {
    switch (getSetting('defaultInCombat')) {
      case 'trackall':
        trackAll();
        break;
      case 'trackone':
        trackTokenList([getAutoTokens()?.find((element) => element.id === getGame().combat?.combatant?.tokenId)]);
        break;
      default:
        break;
    }
  } else {
    switch (getSetting('defaultOutOfCombat')) {
      case 'trackall':
        trackAll();
        break;
      case 'trackmanual':
        trackTokenList(getManualToken());
        break;
      default:
        break;
    }
  }
}

function calculateBoundsOfCoodinates(coordSet) {
  let minX, maxX, minY, maxY;
  maxX = maxY = Number.MIN_VALUE;
  minX = minY = Number.MAX_VALUE;

  coordSet.forEach((coords) => {
    minX = Math.min(minX, coords);
    minY = Math.min(minY, coords);
    maxX = Math.max(maxX, (coords) + (coords.width));
    maxY = Math.max(maxY, (coords) + (coords.height));
  });
  if ((minX === minY && minX === Number.MAX_VALUE) || (maxX === maxY && maxX === Number.MIN_VALUE)) return undefined;
  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    center: { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 },
  };
}

export function viewportChanged(userId) {
  if (getGame().combat?.started) {
    switch (getSetting('defaultInCombat')) {
      case 'cloneDM':
        if (getGame().users?.get(userId)?.isGM) getCanvas().animatePan(VIEWPORT_DATA.get(userId));
        break;
      case 'cloneTurnPlayer':
        if (getCurrentCombatants()?.some((e) => e.id === userId)) getCanvas().animatePan(VIEWPORT_DATA.get(userId));
        break;
      case 'clonePlayer':
        if (userId === getSetting('trackedUser')) getCanvas().animatePan(VIEWPORT_DATA.get(userId));
        break;
      default:
        break;
    }
  } else {
    switch (getSetting('defaultOutOfCombat')) {
      case 'cloneDM':
        if (getGame().users?.get(userId)?.isGM) getCanvas().animatePan(VIEWPORT_DATA.get(userId));
        break;
      case 'clonePlayer':
        if (userId === getSetting('trackedUser')) getCanvas().animatePan(VIEWPORT_DATA.get(userId));
        break;
      default:
        break;
    }
  }
}

export function isGM() {
  return getGame().user?.isGM;
}
export function expandTokenHud(_tokenHud, html, token) {
  if (getGame().user?.isGM) {
    const currenToken = getCanvas().tokens?.get(token._id);
    const rightSide = html.find('div.col.right');
    const isTracked = Tagger.hasTags(currenToken, 'obs_manual_track');
    const element = $(
      `<div class="control-icon ${
        isTracked ? 'active' : ''
      }"><i title='Track Token' class='fa-solid fa-signal-stream' /></div>`,
    );
    element.on('click', function () {
      toggleToken(currenToken);
      $(this).toggleClass('active');
    });
    rightSide.append(element);
  }
}

export function scaleToFit() {
  if (
    !(
      (getGame().combat?.started && getSetting('defaultInCombat') == 'birdseye') ||
      (!getGame().combat?.started && getSetting('defaultOutOfCombat') == 'birdseye')
    )
  )
    return;
  const screenDimensions = getCanvas().screenDimensions;
  const sceneDimensions = getCanvas().scene?.dimensions;

  const center = { x: sceneDimensions.width / 2, y: sceneDimensions.height / 2 };
  const scale = Math.min(screenDimensions[0] / sceneDimensions.width, screenDimensions[1] / sceneDimensions.height);

  getCanvas().animatePan({ ...center, scale: scale });
}

export async function closePopupWithDelay(popout) {
  await sleep((getSetting('popupCloseDelay')) * 1000);
  popout.close();
}

export async function preserveSideBar(sidebar) {
  UI_ELEMENTS.sidebar = sidebar;
}

export async function showTracker() {
  if (!getSetting('showTrackerInCombat')) return;
  UI_ELEMENTS.sidebar?.element.show();
  UI_ELEMENTS.sidebar?.tabs['combat']?.element.show();
  UI_ELEMENTS.sidebar?.activateTab('combat');
}

export async function hideSidebar() {
  UI_ELEMENTS.sidebar?.element.hide();
}
