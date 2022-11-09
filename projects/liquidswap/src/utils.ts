
export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}