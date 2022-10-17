/* global Tagger user */

import { mode } from './const.mjs';
import { getSetting } from './settings.mjs';

export function hideApplication(_, html) {
  html.hide();
}
export function hideTokenBorder(token) {
  if (token?.border?.alpha) {
    token.border.alpha = 0;
  }
}

function getAutoTokens() {
  return game.canvas.tokens.ownedTokens;
}

function getManualToken() {
  return Tagger.getByTag('obs_manual_track').map((manualToken) => manualToken.object);
}

function toggleToken(token) {
  Tagger.toggleTags(token, 'obs_manual_track');
}

export function getCurrentUser() {
  return game.userId;
}

function trackAll() {
  trackTokenList(getAutoTokens());
}

function trackTokenList(tokens) {
  var coordinates = [];

  tokens.forEach((token) => {
    coordinates.push({ x: token.document.x, y: token.document.y, width: token.w, height: token.h });
  });

  var bounds = calculateBoundsOfCoodinates(coordinates);

  if (!bounds) return;

  var screenDimensions = canvas.screenDimensions;

  var scaleX = screenDimensions[0] / (bounds.maxX - bounds.minX + 300);
  var scaleY = screenDimensions[1] / (bounds.maxY - bounds.minY + 300);

  var scale = Math.min(scaleX, scaleY);
  scale = Math.min(scale, getSetting('maxScale'));
  scale = Math.max(scale, getSetting('minScale'));

  canvas.animatePan({ x: bounds.center.x, y: bounds.center.y, scale: scale });
}

export function tokenMoved() {
  if (game.combat?.started) {
    switch (mode.combat) {
      case 'trackall':
        trackAll();
        break;
      case 'trackone':
        if (getAutoTokens().indexOf(game.combat?.combatant) > -1) trackTokenList([game.combat.combatant]);
        break;
      default:
        break;
    }
  } else {
    switch (mode.normal) {
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
  var minX, maxX, minY, maxY;
  maxX = maxY = Number.MIN_VALUE;
  minX = minY = Number.MAX_VALUE;

  coordSet.forEach((coords) => {
    minX = Math.min(minX, coords.x);
    minY = Math.min(minY, coords.y);
    maxX = Math.max(maxX, coords.x + coords.width);
    maxY = Math.max(maxY, coords.y + coords.height);
  });
  if ((minX == minY && minX == Number.MAX_VALUE) || (maxX == maxY && maxX == Number.MIN_VALUE)) return undefined;
  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    center: { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 },
  };
}

export function startCombat(startedCombat) {
  if (startedCombat.combatant.isOwner) {
    startedCombat.combatant.token.control({ releaseOthers: true });
  }
}

export function passTurn(passedCombat) {
  if (passedCombat.combatant.isOwner) {
    passedCombat.combatant.token.control({ releaseOthers: true });
  }
}

export function stopCombat() {
  canvas.tokens.controlledObjects.forEach((token) => token.release());
}

function getCurrentCombatants() {
  return game.combat.combatant.players;
}

export function viewportChanged(viewport, userId) {
  if (game.combat?.started) {
    switch (mode.combat) {
      case 'cloneDM':
        if (game.users.get(user).isGM) canvas.animatePan(viewport);
        break;
      case 'clonePlayer':
        if (getCurrentCombatants().indexOf(userId) > -1) canvas.animatePan(viewport);
        break;
      default:
        break;
    }
  } else {
    switch (mode.normal) {
      case 'cloneDM':
        if (game.users.get(userId).isGM) canvas.animatePan(viewport);
        break;
      case 'clonePlayer':
        if (userId == mode.trackedPlayer) canvas.animatePan(viewport);
        break;
      default:
        break;
    }
  }
}

export function isGM() {
  return game.user?.isGM;
}
export function expandTokenHud(_tokenHud, html, token) {
  if (game.user.isGM) {
    var currenToken = canvas.tokens.get(token._id);
    var rightSide = html.find('div.col.right');
    var isTracked = Tagger.hasTags(currenToken, 'obs_manual_track');
    var element = $(
      `<div class="control-icon ${
        isTracked ? 'active' : ''
      }"><i title='Track Token' class='fa-solid fa-signal-stream' /></div>`,
    );
    element.click(function () {
      toggleToken(currenToken);
      $(this).toggleClass('active');
    });
    rightSide.append(element);
  }
}

export function scaleToFit() {
  if (!((game.combat?.started && mode.combat == 'birdseye') || (!game.combat?.started && mode.normal == 'birdseye')))
    return;
  var screenDimensions = canvas.screenDimensions;
  var sceneDimensions = canvas.scene.dimensions;

  var center = { x: sceneDimensions.width / 2, y: sceneDimensions.height / 2 };
  var scale = Math.min(screenDimensions[0] / sceneDimensions.width, screenDimensions[1] / sceneDimensions.height);

  canvas.animatePan({ ...center, scale: scale });
}
