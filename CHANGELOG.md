## Version 4.2.4

### Fixed

- Fixed Dice so Nice integration

## Version 4.2.3.1

### Fixes

- Fixes another place where corrupted overlay data can cause issues

## Version 4.2.3

### Fixes

- Added some checks to repair certain types of overlay data corruption. 

## Version 4.2.2.1

### Hotfix

- The previous fix didn't quite catch all fallback cases

## Version 4.2.2

### Fixed

- Progress bar components only updated their initial value of 0.5 when the actor was updated
- Added a fallback value for all editors in case the data somehow becomes invalid

## Version 4.2.1

### Added

- Added a keybind to help people break out of OBS Mode if they accidentally trapped themselves in it
  - CTRL + SHIFT + ALT + O by default
  - Requires manually refreshing the page after
  - Also added a notification popup in manual OBS Mode to inform people of it

## Version 4.2.0

### Added

- A completely new style editor has been added to the overlay editor. It is still in beta, but it should be much easier to use.

### Changed

- The entire module has been updated to use ApplicationV2 in preparation for Foundry V14
- The way that actor values are resolved now also supports getting actor values that are inside arrays, maps and even objects by their index
  - Arrays can be accessed using the index notation as expected like `items[0]`
  - Maps can also be accessed using the dot notation for the key name `dataMap.entry`
  - Maps can also be accessed using an index, the keys will be sorted alphabetically `dataMap[0]`
  - Object can now also be accessed using an index, the keys will be sorted alphabetically `dataObject[0]`

## Version 4.1.4

### Added

- Added a new setting to allow the chat notification popups introduced in V13 to show up on stream on top of the game canvas
  - The text input will still be hidden, so the notifications will appear to pop up a bit higher than expected

## Version 4.1.3

### Fix

- removed debug statement
- fixed odd scrolling issue in actor selection

### Changed

- as a side effect of the above fix, the actor selection window now can no longer be resized

## Version 4.1.2

### Updated

- Translations have been updated with new data from Weblate

## Version 4.1.1

### Fixed

- Fixed an issue causing progress bar notifications to remain open indefinitely

## Version 4.1.0

### Added

- Notifications Toasts (like the Browser Compatibility warning) are now hidden in OBS
  - "Progress Bar" type notifications are still show, such as the loading scene notification
  - A new setting was introduced to allow the GM clients to recieve the hidden notifications for debugging purposes

### Changed

- The overlay editor now has scroll bars to make the preview easier to view if it gets absurdly large

### Fixed

- The viewport is now refreshed when exiting combat
- CSS has been added to restore the V12 display of images, please check your overlays after updating
- The roll overlay is now working properly again
- The roll value is now displayed centered on the background image by default

## Version 4.0.1

### Fixed

- Fixed a rare bug that would cause the overlay editor to break if the system did not contain an Actor definition with the ID "character".
  - Added a fallback using the default selection in actor creation

## Version 4.0.0

### Added
- Support for Foundry V13 was added

### Removed
- Support for Foundry V11 and V12 was removed as differences between V12 and V13 are too large to support older versions
- Notification Center has been removed as it is planned to be replaced by a standalone module

## Version 3.6.2

### Added

- Added function "getOBSWebsocketClient" to API, this allows extension modules to use the Websocket Client instance.
- Added function "isOBS" to API, this allows extension modules to determine if OBS Utils is running in OBS Mode
- Corrected some display issues due to new styling

## Version 3.6.1

### Fixed

- Fixed a UI display issue caused by the new sort order display elements

## Version 3.6.0

### Major Changes

- **Actor Selection Index Display**: Added functionality to show the selection index of actors in the selection UI
- **OBS Mode Enhancements**:
    - Introduced a permanent setting to enforce OBS mode on `/stream`.
    - Fixed WebSocket Settings reload issues for OBS
    - Added a force settings button to the director

### Languages

- **Russian**: Added at 0.6% completeness, contributions to Weblate would be very welcome

## Version 3.3.5

### Fixed

- Fixed an issue that caused Multi-AV Components to output incorrect amounts of icons/images

## Version 3.3.4

### Added

- French translation courtesy of wirgeen. Many thanks for your contribution!

## Version 3.3.3

### Fixed

- Added a failsafe for the progress-bar component in case the value passed to it is infinite.

## Version 3.3.2

### Fixed

- Fixed an error introduced by the typescript conversion that would cause multi icon and multi image components to fail

## Version 3.3.1

### Added

- Introduced additional values for boolean components to make targeting based on value easier.

### Changed

- Moved the codebase to TS, it has been tested as thoroughly as I can, but issues might arise.

## Version 3.3.0

### Changes

- The /stream view will now have a green background again if opened outside of an OBS browser source. This is to make OBS mode a bit more useful if capturing a browser window directly and chromakeying out the background

### Added

- New "Player Characters" tracking mode, that will track all characters that are configured as a players character in the "Setup Player" screen. This uses Foundrys builtin "players" filter, which means GMs are not selected for this
- New "Pause Camera Tracking" Feature, that can, as the name suggest, temporarily pause the camera cloning so you can look around without affecting the stream view. Please keep in mind that this is enabled globally and also affects player viewport cloning
- New "View Smoothing" Feature that reduces the viewport cloning update rate, to make the tracking a bit less jittery at the cost of it being more "robotic". This can be toggled off in settings and is on by default 

### Fixes

- Fixed an issue with DSN that would cause the overlays to break inexplicably when DSN was enabled and the actors token was placed on the scene

## Version 3.2.6

### Changes

- Dice so nice compatibility code was updated, please ensure your DSN is at least version 5.1.0 or it might no longer work
- New notification center that can get notifications from a server instead of a local file

## Version 3.2.5

### Fixes

- Fixed a bug that would cause the fake canvas required for dice-so-nice to reappear when the scene is changed. Blacking out the stream view.

### Localization

- Updated support for Norwegian Bokmål (58% complete)

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
