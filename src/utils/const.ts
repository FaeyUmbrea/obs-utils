export const MODULE_ID = 'obs-utils';

export interface StringMap {
	[key: string]: string;
}

export const ICCHOICES: StringMap = {
	trackall: 'obs-utils.strings.trackAll',
	trackone: 'obs-utils.strings.trackOne',
	trackPlayerOwned: 'obs-utils.strings.trackPlayerOwned',
	clonePlayer: 'obs-utils.strings.clonePlayer',
	cloneDM: 'obs-utils.strings.cloneDM',
	birdseye: 'obs-utils.strings.birdseye',
	cloneTurnPlayer: 'obs-utils.strings.cloneTurnPlayer',
};
export const OOCCHOICES: StringMap = {
	trackall: 'obs-utils.strings.trackAll',
	trackmanual: 'obs-utils.strings.trackManual',
	trackPlayerOwned: 'obs-utils.strings.trackPlayerOwned',
	// Out-of-combat counterpart to `trackone`, which is combat-turn driven and
	// so has no way to follow one nominated token between encounters.
	trackToken: 'obs-utils.strings.trackToken',
	clonePlayer: 'obs-utils.strings.clonePlayer',
	cloneDM: 'obs-utils.strings.cloneDM',
	birdseye: 'obs-utils.strings.birdseye',
};
export const NAME_TO_ICON: StringMap = {
	trackall: 'fa-solid fa-users',
	trackone: 'fa-solid fa-user',
	trackmanual: 'fa-regular fa-users',
	trackToken: 'fa-solid fa-crosshairs',
	clonePlayer: 'fa-regular fa-users-viewfinder',
	cloneTurnPlayer: 'fa-solid fa-arrows-repeat',
	cloneDM: 'fa-solid fa-dice-d20',
	birdseye: 'fa-solid fa-bird',
	trackPlayerOwned: 'fa-solid fa-people-group',
};

/**
 * How the OBS client decides which floor to stand on, for the modes that have
 * no inherent answer — the multi-token modes and birdseye.
 *
 * Clone modes are absent because they mirror a specific user, whose floor
 * arrives with their viewport. `trackone`/`trackToken` are absent because a
 * single token answers it outright.
 */
export const LEVEL_POLICY_CHOICES: StringMap = {
	relative: 'obs-utils.strings.levelPolicyRelative',
	token: 'obs-utils.strings.levelPolicyToken',
	pinned: 'obs-utils.strings.levelPolicyPinned',
};

/** Which floor to take when the tracked group is spread over several. */
export const LEVEL_RELATIVE_CHOICES: StringMap = {
	lowest: 'obs-utils.strings.levelRelativeLowest',
	middle: 'obs-utils.strings.levelRelativeMiddle',
	highest: 'obs-utils.strings.levelRelativeHighest',
};
