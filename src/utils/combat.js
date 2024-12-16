export function stopCombat() {
	canvas.tokens?.controlledObjects.forEach(token => token.release());
}

export function handleCombat(runningCombat) {
	if (runningCombat.combatant?.isOwner) {
		runningCombat.combatant?.token?.object?.control({ releaseOthers: true });
	}
}

export function getCurrentCombatants() {
	return game.combat?.combatant?.players;
}
