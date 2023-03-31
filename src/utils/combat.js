import { getCanvas, getGame } from './helpers.js';

export function stopCombat() {
  getCanvas().tokens?.controlledObjects.forEach((token) => token.release());
}

export function handleCombat(runningCombat) {
  if (runningCombat.combatant?.isOwner) {
    runningCombat.combatant?.token?.object?.control({ releaseOthers: true });
  }
}

export function getCurrentCombatants() {
  return getGame().combat?.combatant?.players;
}
