## Version 3.2.4

### Fixes

- Fix typo in module json syntax

## Version 3.2.3

### Localization
- Brazilian Portuguese updated
- Added partial support for Norwegian Bokmål

## Version 3.2.2

### Localization
- Added localization support for the entire module
- Support added for German
- Brazilian Portuguese updated

## Version 3.2.1

### Localization
- Support added for brazilian Portuguese

## Version 3.2.0

### Added
- Preliminary support for Dice so Nice overlays! 

## Version 3.1.0

### Added
- Introduced keybindings support for OBS Utils. Users can now switch director modes via keyboard shortcuts.
- New setting `showKeybindingPopup` to enable or disable keybinding notifications.

### Fixed
- Tracking logic revised to only track a camera if the scene matches that of the stream user, ensuring better synchronization and performance.

## Version 3.0.4

### Fixes:
- Improved `ProgressBarComponent` to handle invalid numerical values gracefully by assigning default values. If the current value is invalid, the progress bar will now show `0.5`, and if the maximum value is invalid, its maximum value will be set to `1`.

This ensures that the progress bar displays valid data and avoids rendering issues caused by incorrect numerical inputs.

## Version 3.0.3

### Fixes:
- Fixed an issue with token data in V12 that causes the camera to lag behind in track target mode.

## Version 3.0.2

### Fixes:
- Resolved issues that would cause the Combat Tracker to misbehave.

## Version 3.0.1

### Added:
- Suppress User Config dialog (can be turned off in Settings).

## Version 3.0.0

### Added:
- A hook called `obs-utils.streamModeInit` that is called when stream mode initializes.
- Boolean AV Image Component that can display an image if an actor's value is truthy or falsey. If no image is specified, the display will remain empty.
- Progress Bar Component that can show an evaluated progress bar to visualize HP and similar values.

### Changed:
- Boolean AV Icon Component now has changeable icons.

### Fixed:
- MultiIcon and MultiImage component editors would break under certain conditions.
- Some components would incorrectly unregister a listener on the wrong event, causing hooks to malfunction.

## Version 2.9.0

### Added:
- Export and Import for Overlay Settings.

## Version 2.8.5

### Fixes:
- Fixed a critical issue that would set the GM Client to be the stream user. It is now only possible to set a GM Client as the stream user if there is more than one. Please ensure your GM client is not the stream user before deleting other GM clients.

## Version 2.8.4

### Fixes:
- Overlays would no longer render correctly in stream mode.

## Version 2.8.3

### Replaced:
- Dependency on SocketLib replaced by module internal code.
- Dependency on Tagger replaced by module internal code.

These changes do not affect any functionality; however, all tokens will revert to being untracked in manual mode.

## Version 2.8.2

### Changes:
- OBS Websocket Settings are now client-side. The data in "OBS Websocket Settings" will no longer be stored in the world data. This means all previous data has been wiped and this may need to be reconfigured.

### Additions:
- OBS Websocket Setting Sync: The Settings data can now be synced to the browser storage of the OBS User via the settings menu, as long as the browser is connected.

## Version 2.8.1

### Additions:
- Global Disable Switch: It is now possible to disable all OBS features globally to configure the OBS client and make adjustments that require the UI to load.

### Fixes:
- Fixing issues caused by lazy-loading the UI.
- Optimized bundle size to reduce load times on OBS clients.

## Version 2.8.0

### Additions:
- Manual OBS Mode: In case you have to use a browser window instead of a browser source, you can now manually set that browser to be the OBS Client. Make sure to use a different browser or incognito tab.
- OBS Mode User: In addition to Manual Mode, you can also set a single user by name to always launch in OBS Mode.
- V12 Support: It should now properly work with V12!

### Removal:
- V10 Support: From this release on, OBS Utils will no longer support V10.

## Version 2.7.0

### Additions:
- New Foundry Scene Load trigger for OBS Remote (#137).
- Introduced special Hook event `obs-utils.init` that gets called after API initialization.
- Introduced special Hook event `obs-utils.refreshActor` that accepts a Foundry actor as input and will update the overlay actor data.

## Version 2.6.0

### Additions:
- Allow setting all popups to a predetermined size and position (Closes #128).

### Fixes:
- Several text errors.

## Version 2.5.1

### Fixes:
- Fixed a small issue with the new Multi-AV Editor where typing would alternate the cursor between both inputs.

## Version 2.5.0

### Additions:
- Added a component to display two different icons depending on two numerical actor values.
- Added a component to display two different images.