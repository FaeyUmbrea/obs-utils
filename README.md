# !!!!!V12 NOTES!!!!!!
As of the time of writing (30.05.2024) OBS Studio's browser source is using Chrome 103. The minimum officially supported version for FoundryVTT is 105. Before reporting issues, please confirm if the problem persists if using a modern browser through manual mode.

# OBS Utils

![Latest Release Download Count](https://img.shields.io/github/downloads/faeyumbrea/obs-utils/latest/module.zip) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fobs-utils&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=obs-utils) [![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fobs-utils%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/obs-utils/) [![Supported Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FFaeyUmbrea%2Fobs-utils%2Fmaster%2Fpublic%2Fmodule.json)](https://github.com/FaeyUmbrea/obs-utils/releases/latest)

[![Discord Banner 1](https://discord.com/api/guilds/1245779025931141292/widget.png?style=banner2)](https://discord.com/invite/WfMaKPPdeM)

This module was developed specifically for using OBS Browsers Sources as a spectator client for your FoundryVTT Game

It forgoes the usual stream user configuration by simply checking if its running in a browser source.
Changing any of the settings related to the Browser Source will also force-refresh it in OBS, so no need to do that
manually anymore.

This Module was in large parts inspired by Stream View and Stream Utils respectively.

## Concept

This module is supposed to be easy, low config and out of the box.
Most importantly its supposed to be as hands off on the OBS Side as possible.

## Usage

Check the [Wiki](https://docs.void.monster/getting-started-obsu.html)!

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
- /stream Information Overlays


- Levels Support (in Combat)


- OBS Remote Controls via Websocket or Browser Source

## Requirements

- libWrapper

### Optional Modules

- theripper93's Levels [GitHub](https://github.com/theripper93/Levels)

# Building

This repository uses xc for task definitions! As such only nodejs, yarn and xc are required.

### Dependencies

| Project     | Version  |
|-------------|----------|
| nodejs.org  | ^18.12.1 |
| xcfile.dev  | ^0.0.159 |
| yarnpkg.com | ^3.5.1   |

## Tasks

### setup

setup the environment

```
yarn install
```

### build

Builds the module

Requires: setup

```
yarn build
```