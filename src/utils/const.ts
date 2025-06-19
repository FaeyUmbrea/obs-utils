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
	clonePlayer: 'obs-utils.strings.clonePlayer',
	cloneDM: 'obs-utils.strings.cloneDM',
	birdseye: 'obs-utils.strings.birdseye',
};
export const NAME_TO_ICON: StringMap = {
	trackall: 'fa-solid fa-users',
	trackone: 'fa-solid fa-user',
	trackmanual: 'fa-regular fa-users',
	clonePlayer: 'fa-regular fa-users-viewfinder',
	cloneTurnPlayer: 'fa-solid fa-arrows-repeat',
	cloneDM: 'fa-solid fa-dice-d20',
	birdseye: 'fa-solid fa-bird',
	trackPlayerOwned: 'fa-solid fa-people-group',
};
