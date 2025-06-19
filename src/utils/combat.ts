import { screenReload } from './canvas.ts';

export function stopCombat() {
	canvas?.tokens?.controlledObjects.forEach(token => token.release());
	screenReload();
}

export function handleCombat(runningCombat: Combat) {
	if (runningCombat.combatant?.isOwner) {
		runningCombat.combatant?.token?.object?.control({ releaseOthers: true });
	}
}

export function getCurrentCombatants() {
	return (game as ReadyGame).combat?.combatant?.players;
}
