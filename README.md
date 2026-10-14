# OBS Utils

![Latest Release Download Count](https://img.shields.io/github/downloads/faeyumbrea/obs-utils/latest/module.zip) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fobs-utils&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=obs-utils) [![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fobs-utils%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/obs-utils/) [![Supported Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FFaeyUmbrea%2Fobs-utils%2Fmaster%2Fmodule.json)](https://github.com/FaeyUmbrea/obs-utils/releases/latest) [![Translation status](https://translate.void.monster/widget/obs-utils/module/svg-badge.svg)](https://translate.void.monster/projects/obs-utils/module/)

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

Check the [Wiki](https://docs.void.monster)!

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
- Overlay Animations: per-component opacity / transform tracks with looping or trigger-driven transitions, four tile modes (per actor / per player / per user / singleton), payload-aware `trigger.X` paths
- Animation Composer: live preview, per-trigger test-fire, slide-in style and transitions drawers
- Preset Animations: author keyframed camera paths or record live and play them smoothly on the OBS client without dragging the GM's view along

- Foundry Core Multilevel Support (Out of combat token visibility and floor tracking might be limited)

- OBS Remote Controls via Websocket or Browser Source

## Requirements

- libWrapper

# Contributing

## Translation

Translations are managed on [Void Monster Translations](https://translate.void.monster/projects/obs-utils/module/). Contributions are invitation-only.

1. Contact me on [Discord](https://discord.com/invite/WfMaKPPdeM) or by [email](mailto:contact@void.monster). Tell me which languages you speak fluently and confirm in writing that you will only submit translations you manually write or personally review in full.
2. I'll invite you to Weblate with translation and review access for those confirmed languages.
3. Accept the [Translation Contributor Agreement](https://translate.void.monster/legal/terms/) in Weblate, then translate or review existing strings. Only approve strings you have personally reviewed.

Only approved translations are submitted to the repositories. You can help bring back existing community translations by reviewing them.

[![Translation status](https://translate.void.monster/widget/obs-utils/module/open-graph.png)](https://translate.void.monster/projects/obs-utils/module/)

# Building

This repository uses xc for task definitions! As such only nodejs, yarn and xc are required.

### Dependencies

| Project     | Version  |
| ----------- | -------- |
| nodejs.org  | ^20.0.0  |
| xcfile.dev  | ^0.0.159 |
| yarnpkg.com | ^4.5.0   |

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

## Code contributions

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and accept the [Code Contributor Agreement v1.0](CONTRIBUTOR-AGREEMENT.md) before submitting code.
