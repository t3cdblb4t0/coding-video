// Real simulations behind every number on screen. Seeds are fixed in advance (see 分镜.md);
// results are reported exactly as they come out.
import { mulberry32 } from '../../engine/kit.js';

// Statistics come from untraced runs (d1/d2/d3). The paths drawn on screen are a separate sample
// with their own seeds (trace1/2/3): tracing keeps walking after a return, which consumes extra
// random numbers, so it must not share a stream with the counted run.
export const SEEDS = { hook: 1921, d1: 1, d2: 2, d3: 3, wait: 7, trace1: 1001, trace2: 1002, trace3: 1003 };
export const WALKERS = 10_000;
export const STEPS = 10_000;

// A single 2D walk (for the hook): positions after each step, until it first returns home
// (or `maxSteps`). Returns the path and the step at which it came home (0 if it did not).
export function walkHome(seed = SEEDS.hook, maxSteps = 4000) {
  const rand = mulberry32(seed);
  const xs = [0];
  const ys = [0];
  let x = 0;
  let y = 0;
  let home = 0;
  for (let s = 1; s <= maxSteps; s++) {
    const r = Math.floor(rand() * 4);
    if (r === 0) x++;
    else if (r === 1) x--;
    else if (r === 2) y++;
    else y--;
    xs.push(x);
    ys.push(y);
    if (x === 0 && y === 0) {
      home = s;
      break;
    }
  }
  return { xs, ys, home };
}

// `count` independent walkers in `dim` dimensions, each walking up to `steps` steps.
// firstReturn[w] = step of first return to the origin, or 0 if none within `steps`.
// Also records the first `trace` walkers' full paths (for drawing).
export function walkers({ dim, count = WALKERS, steps = STEPS, seed, trace = 0, traceSteps = 1200 }) {
  const rand = mulberry32(seed);
  const firstReturn = new Uint32Array(count);
  const paths = [];
  const pos = new Int32Array(dim);
  for (let w = 0; w < count; w++) {
    pos.fill(0);
    const path = w < trace ? [new Int32Array(traceSteps + 1), new Int32Array(traceSteps + 1), new Int32Array(traceSteps + 1)] : null;
    for (let s = 1; s <= steps; s++) {
      const r = Math.floor(rand() * 2 * dim);
      const axis = r >> 1;
      pos[axis] += r & 1 ? 1 : -1;
      if (path && s <= traceSteps) for (let k = 0; k < dim; k++) path[k][s] = pos[k];
      let home = true;
      for (let k = 0; k < dim; k++) if (pos[k] !== 0) { home = false; break; }
      if (home) {
        firstReturn[w] = s;
        if (!path) break;
        if (s >= traceSteps) break;
      }
    }
    if (path) paths.push(path);
  }
  // returned[n] = walkers home by step n, for a log-spaced set of n.
  const sorted = Array.from(firstReturn).filter((s) => s > 0).sort((a, b) => a - b);
  const returnedBy = (n) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (sorted[m] <= n) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  return { dim, count, steps, firstReturn, paths, sorted, returnedBy, rate: (n) => returnedBy(n) / count };
}

// Keep walking the hook walker until it first returns (up to `cap` steps). Same step rule and
// seed as walkHome(), so its first steps are the path drawn in the hook.
export function walkUntilHome(seed = SEEDS.hook, cap = 200_000_000) {
  const rand = mulberry32(seed);
  let x = 0;
  let y = 0;
  let far = 0;
  for (let s = 1; s <= cap; s++) {
    const r = Math.floor(rand() * 4);
    if (r === 0) x++;
    else if (r === 1) x--;
    else if (r === 2) y++;
    else y--;
    const d = Math.abs(x) + Math.abs(y);
    if (d > far) far = d;
    if (x === 0 && y === 0) return { home: s, far };
  }
  return { home: 0, far };
}

// How long does it take to come home in 1D? Distribution of first-return times among walkers
// that did come home, plus how many were still out after N steps.
export function waitingTimes(sim) {
  const s = sim.sorted;
  const pct = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return {
    median: pct(0.5),
    p90: pct(0.9),
    p99: pct(0.99),
    max: s[s.length - 1],
    stillOut: sim.count - s.length,
  };
}
