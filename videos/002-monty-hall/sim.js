// Real simulations behind every number on screen. Doors are 0, 1, 2 (shown as 1, 2, 3).
// Seeds are fixed in advance and listed in 分镜.md; results are reported as they come out.
import { mulberry32 } from '../../engine/kit.js';

export const SEEDS = { main: 1990, hundred: 100, randomHost: 1975 };
export const GAMES = 10_000;
export const RANDOM_GAMES = 3_000;

// Standard rules: the host knows where the car is and always opens a goat door you did not pick
// (choosing at random when both are goats). stayWin[i] = 1 if staying wins; switching wins otherwise.
export function playKnowingHost(count = GAMES, seed = SEEDS.main) {
  const rand = mulberry32(seed);
  const car = new Uint8Array(count);
  const pick = new Uint8Array(count);
  const open = new Uint8Array(count);
  const other = new Uint8Array(count);
  const stayWin = new Uint8Array(count);
  const cumStay = new Int32Array(count + 1);
  for (let i = 0; i < count; i++) {
    const c = Math.floor(rand() * 3);
    const p = Math.floor(rand() * 3);
    const o = c === p ? (p + (rand() < 0.5 ? 1 : 2)) % 3 : 3 - c - p;
    car[i] = c;
    pick[i] = p;
    open[i] = o;
    other[i] = 3 - p - o;
    stayWin[i] = c === p ? 1 : 0;
    cumStay[i + 1] = cumStay[i] + stayWin[i];
  }
  return { count, car, pick, open, other, stayWin, cumStay };
}

// Ignorant host: opens one of the two doors you did not pick uniformly at random.
// outcome[i]: 0 = staying wins, 1 = switching wins, 2 = void (he revealed the car).
export function playRandomHost(count = RANDOM_GAMES, seed = SEEDS.randomHost) {
  const rand = mulberry32(seed);
  const outcome = new Uint8Array(count);
  const firstRight = new Uint8Array(count);
  const cum = [new Int32Array(count + 1), new Int32Array(count + 1), new Int32Array(count + 1)];
  for (let i = 0; i < count; i++) {
    const c = Math.floor(rand() * 3);
    const p = Math.floor(rand() * 3);
    const o = (p + (rand() < 0.5 ? 1 : 2)) % 3;
    const out = o === c ? 2 : c === p ? 0 : 1;
    outcome[i] = out;
    firstRight[i] = c === p ? 1 : 0;
    for (let k = 0; k < 3; k++) cum[k][i + 1] = cum[k][i] + (out === k ? 1 : 0);
  }
  return { count, outcome, firstRight, cum };
}

// 100 doors: you pick door 0; the host opens 98 goat doors in a shuffled order and leaves `keep`.
export function hundredDoors(seed = SEEDS.hundred) {
  const rand = mulberry32(seed);
  const car = Math.floor(rand() * 100);
  const pick = 0;
  const keep = car !== pick ? car : 1 + Math.floor(rand() * 99);
  const order = [];
  for (let d = 0; d < 100; d++) if (d !== pick && d !== keep) order.push(d);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { car, pick, keep, order };
}
