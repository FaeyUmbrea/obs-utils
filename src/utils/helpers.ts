// These are necessary because Game and Canvas are not always initialized so TypeScript complains

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

export function propertiesToArray(obj: any) {
  const isObject = (val: any) => val && typeof val === 'object' && !Array.isArray(val);

  const addDelimiter = (a: any, b: any) => (a ? `${a}.${b}` : b);

  const paths: any = (obj2 = {}, head = '') => {
    return Object.entries(obj2).reduce((product, [key, value]) => {
      const fullPath = addDelimiter(head, key);
      return isObject(value) ? product.concat(paths(value, fullPath)) : product.concat(fullPath);
    }, []);
  };

  return paths(obj);
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
    actorValues = propertiesToArray(new Actor({ name: 'actor', type: 'character' }));
  }
  return actorValues;
}
