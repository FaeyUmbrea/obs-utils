// These are necessary because Game and Canvas are not always initialized so TypeScript complains

import flatten from 'flat';
import type { ObsUtilsApi } from './api';

export function getGame(): Game {
  return game as Game;
}

export function getCanvas(): Canvas {
  return canvas as Canvas;
}

export function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function isOBS(): boolean {
  return !!window.obsstudio;
}

function getFontAwesomeVersion() {
  const version: number = Number.parseInt(getGame().version.split('.')[1]);
  if (version <= 290) {
    return '6.1.0';
  }
  return '6.2.0';
}

export async function getFontawesomeVariables() {
  const response = await fetch('https://api.fontawesome.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    body: `query {release(version:"${getFontAwesomeVersion()}") {icons {id familyStylesByLicense{pro{family style}}}}}`,
  });

  const json = await response.json();
  const icons = json['data']['release']['icons'] as Array<{
    id: number;
    familyStylesByLicense: { pro: Array<{ family: string; style: string }> };
  }>;

  return icons
    .map((value) => {
      return value.familyStylesByLicense.pro.map((family) => {
        return 'fa-' + family.family + ' fa-' + family.style + ' fa-' + value.id;
      });
    })
    .flat();
}

let actorValues: Array<string>;

export function getActorValues() {
  if (!actorValues) {
    actorValues = Object.keys(
      flatten(JSON.parse(JSON.stringify(new CONFIG.Actor.documentClass({ name: 'actor', type: 'character' })))),
    );
  }
  return actorValues;
}

export function getApi(): ObsUtilsApi {
  const moduleData = getGame().modules.get('obs-utils');
  if (moduleData) return moduleData.api;
  else throw new Error('Something went very wrong!');
}
