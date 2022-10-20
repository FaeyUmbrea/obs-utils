# OBS Utils

![Latest Release Download Count](https://img.shields.io/github/downloads/faeyumbrea/obs-utils/latest/module.zip) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fobs-utils&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=obs-utils) [![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fobs-utils%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/obs-utils/) [![Supported Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FFaeyUmbrea%2Fobs-utils%2Fmaster%2Fpublic%2Fmodule.json)](https://github.com/FaeyUmbrea/obs-utils/releases/latest)





This module was developed specifically for using OBS Browsers Sources as a spectator client for your FoundryVTT Game

It forgoes the usual stream user configuration by simply checking if its running in a browser source.
Changing any of the settings related to the Browser Source will also force-refresh it in OBS, so no need to do that manually anymore.

This Module was in large parts inspired by Stream View and Stream Utils respectively.

## Concept

This module is supposed to be easy, low config and out of the box. 
Most importantly its supposed to be as hands off on the OBS Side as possible. 

## Features

- Automatically follow Tokens based on Spectator or Owner permission
- Automatically detect OBS
- Automatically remove /stream Background
- Hide all UI
- Follow single Token in Combat
- Custom Selection: Choose which tokens to follow
- Tracked Mode: Copy another users Viewport
- Birds-Eye Mode: Fit Map to Screen
- Mode Select both in and out of Combat

- Make /stream Background Transparent

- Levels Support (in Combat)

## Requirements

- libWrapper
- Tagger
- socketLib

### Optional Requirements

- theripper93's Levels [GitHub](https://github.com/theripper93/Levels)

## Planned Features


- Modify the /stream Page (Information Overlays etc.)

- Levels Support (out of Combat)
- Trigger OBS Scenes from Foundry

- Twitch Chat Integration (Patron Only)
- YouTube Chat Integration (Patron Only)

- Discord Integration (Patron Only)

## TODO (Smaller improvements that aren't Full Features)
- Add configuration for automatic camera
- 