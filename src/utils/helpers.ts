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
