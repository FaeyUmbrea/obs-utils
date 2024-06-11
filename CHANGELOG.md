## Version 2.8.3

Replaced:
- Dependency on SocketLib replaced by module internal code
- Dependency on Tagger replaced by module internal code

These changes do not affect any functionality; 
however, all tokens will revert to being untracked in manual mode.

## Version 2.8.2

Changes:
- OBS Websocket Settings are now client-side
  - The data in "OBS Websocket Settings" will no longer be stored in the world data. This means all previous data has been wiped and this may need to be reconfigured.

Additions:
- OBS Websocket Setting Sync
  - The Settings data can now be synced to the browser storage of the OBS User via the settings menu, as long as the browser is connected.

## Version 2.8.1

Additions:
- Global Disable Switch
  - It is now possible to disable all OBS Features globally, to configure the obs client and make adjustments that require UI to load

Fixes:
- Fixing issues caused by lazy-loading the UI
- Optimized bundle size to reduce load-times on OBS clients. 

## Version 2.8.0

Additions:
- Manual OBS Mode 
  - In case you have to use a browser window instead of a browser source, you can now manually set that browser to be the OBS Client. Make sure to use a different browser or incognito tab. 
- OBS Mode User
  - In Addition to the Manual Mode, you can also set a single user by name to always launch in OBS Mode
- V12 Support
  - It should now properly work with V12!!

Removal:
- V10 Support
  - From this release on, OBS Utils will no longer support V10

## Version 2.7.0

Additions:

- New Foundry Scene Load trigger for OBS Remote (#137)
- Introduced special Hook event "obs-utils.init" that gets called after API initialization
- Introduced special Hook event "obs-utils.refreshActor" that accepts a foundry actor as input and will upate the
  overlay actor data

## Version 2.6.0

Additions:

- Allow Setting all popups to a predetermined size and position (Closes #128)

Fixes:

- Several text Errors

## Version 2.5.1

- Fix a small issue with the new Multi-AV Editor where typing would alternate the cursor between both inputs

## Version 2.5.0

- Added a component to display two different icons depending on two numerical actor values
- Added a component to display two different images depending on two numerical actor values

Image/Icon 1 is displayed AV1 times, then Image/Icon 2 is displayed AV2-AV1 times immediately after.
Great to visualize health in simpler systems.

## Version 2.4.3

- Fixing drag and drop sorting

## Version 2.4.2

- Add a feature that allows to limit zoom and pan to the map edges

## Version 2.4.1

- Add a reset button to the actor select.
- Fixed a bug that caused the screen to move when a token was about to enter the hidden sidebar on /game
- Fixed a bug that prevented the canvas from correctly resizing on scene load

## Version 2.4.0

Adding API Methods to allow setting AV Data and Selected Actors via external modules

## Version 2.3.0

V11 Compatibility

## Version 2.2.1

Add an option to show or hide the Cameras

## Version 2.2.0

Added an Image Overlay

## Version 2.1.0

Added a new Roll Overlay

## Version 2.0.0

Added an API for Overlays
Added single-render Overlays

## Version 1.4.2

Fixing pf2e compatbility

## Version 1.4.0

Added a new Feature to display Boolean Actor Values as Icons

## Version 1.3.7

Fixed some display issues in the Director

## Version 1.3.6

Implemented the Stream Overlay Funtionality along with a WYSIWYG Editor for it!
Check the Wiki for more Information on the CSS Structure

## Version 1.2.3

Added OBS Remote Functionality!
Replaced original onExitObs with onStopStreaming because OBS would close before the final commands got executed.

## Version 1.1.1

Fixes to the Director Window
Adding "Track Selected Player" to Combat Mode
Some Icon Changes to improve consistency
Director Improvements to workflow and socket usage

## Version 1.1.0

Adding an option to show combat tracker during combats
Automatically hiding Popouts after configurable amount of time
Fixing some combat issues aswell

## Version 1.0.4

Fixing display issues with /stream view

## Version 1.0.0

Initial Release!