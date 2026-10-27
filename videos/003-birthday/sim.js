// Real simulations behind every number on screen. Birthdays: 365 equally likely days (no Feb 29).
// Seeds are fixed in advance and listed in 分镜.md; results are reported as they come out.
import { mulberry32 } from '../../engine/kit.js';

export const SEEDS = { classroom: 50, rooms: 365 };
export const ROOMS = 10_000;
export const MAXN = 100;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function dayToMD(d) {
  let m = 0;
  while (d >= MONTH_DAYS[m]) d -= MONTH_DAYS[m++];
  return [m + 1, d + 1];
}
export const fmtDay = (d) => {
  const [m, dd] = dayToMD(d);
  return `${m}月${dd}日`;
};
export const monthStart = (m) => MONTH_DAYS.slice(0, m).reduce((s, x) => s + x, 0);

// Hook: a class of 50 with random birthdays; every pair of classmates who share one.
export function classroom(n = 50, seed = SEEDS.classroom) {
  const rand = mulberry32(seed);
  const days = Array.from({ length: n }, () => Math.floor(rand() * 365));
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (days[i] === days[j]) pairs.push([i, j]);
  return { n, days, pairs };
}

// 10,000 rooms. People walk in one at a time until two share a birthday; firstMatch[r] is the
// head-count at that moment. So "a room of N people has a match" <=> firstMatch[r] <= N, and the
// curve P(N) for every N comes from the same 10,000 rooms. Room 0 is shown in detail.
export function rooms(count = ROOMS, seed = SEEDS.rooms) {
  const rand = mulberry32(seed);
  const firstMatch = new Uint16Array(count);
  const seen = new Uint8Array(365);
  const featured = [];
  for (let r = 0; r < count; r++) {
    seen.fill(0);
    let k = 0;
    for (;;) {
      const d = Math.floor(rand() * 365);
      k++;
      if (r === 0) featured.push(d);
      if (seen[d]) break;
      seen[d] = 1;
    }
    firstMatch[r] = k;
  }
  const hist = new Int32Array(MAXN + 2);
  for (let r = 0; r < count; r++) hist[Math.min(firstMatch[r], MAXN + 1)]++;
  const matched = new Int32Array(MAXN + 1); // matched[N] = rooms of N people with a shared birthday
  for (let N = 1; N <= MAXN; N++) matched[N] = matched[N - 1] + hist[N];
  return { count, firstMatch, featured, matched, rate: (N) => matched[Math.min(N, MAXN)] / count };
}

// Exact probability that N people (365 equally likely days) include a shared birthday.
export function exact(N) {
  let none = 1;
  for (let k = 0; k < N; k++) none *= (365 - k) / 365;
  return 1 - none;
}
// Exact probability that at least one of `others` people shares one particular birthday.
export const sameAsYou = (others) => 1 - (364 / 365) ** others;
