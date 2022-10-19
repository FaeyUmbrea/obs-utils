export const ID = 'obs-utils';

export const mode = {
  combat: 'trackall',
  normal: 'trackall',
  trackedPlayer: undefined,
};
export const ICCHOICES = {
  trackall: 'Track all Owned Tokens',
  trackone: 'Track the currently active Owned Token',
  clonePlayer: "Clone the Selected Player's Viewport",
  cloneDM: "Clone the DM's Viewport",
  birdseye: 'Fit Map to Screen',
  cloneTurnPlayer: "Clone the Turn Player's Viewport",

};
export const OOCCHOICES = {
  trackall: 'Track all Owned Tokens',
  trackmanual: 'Track a manual List of Tokens',
  clonePlayer: "Clone a Player's Viewport",
  cloneDM: "Clone the DM's Viewport",
  birdseye: 'Fit Map to Screen',
};
export const NAME_TO_ICON = {
  trackall: 'fa-solid fa-users',
  trackone: 'fa-solid fa-user',
  trackmanual: 'fa-regular fa-users',
  clonePlayer: 'fa-regular fa-users-viewfinder',
  cloneTurnPlayer: 'fa-sharp fa-solid fa-arrows-repeat',
  cloneDM: 'fa-solid fa-dice-d20',
  birdseye: 'fa-solid fa-bird',
};

export const UI_ELEMENTS = {
  sidebar: undefined,
};
