export function getGame(): Game {
  if (!(game instanceof Game)) {
    throw new Error('game is not initialized yet!');
  }
  return game;
}

export function getCanvas(): Canvas {
  if (!(canvas instanceof Canvas)) {
    throw new Error('canvas is not initialized yet!');
  }
  return canvas;
}

export function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
