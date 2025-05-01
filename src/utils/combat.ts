export function stopCombat() {
	canvas?.tokens?.controlledObjects.forEach(token => token.release());
}

export function handleCombat(runningCombat) {
	if (runningCombat.combatant?.isOwner) {
		runningCombat.combatant?.token?.object?.control({ releaseOthers: true });
	}
}

export function getCurrentCombatants() {
	// @ts-expect-error mixins dont work
	return (game as ReadyGame).combat?.combatant?.players;
}
