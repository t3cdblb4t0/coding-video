// Every number in episode 06 comes from these simulations. Seeds and parameters were fixed before
// the first run and are not tuned to the results (see 分镜.md).
//
// Planes (an illustration, not WWII data): 1,000 sorties. Hits per sortie ~ Poisson(2.5), landing
// uniformly at random over the aircraft. A hit on an engine or the cockpit brings the plane down
// with probability 0.5; a hit anywhere else, 0.05. Hits are independent.
import { mulberry32 } from '../../engine/kit.js';
import { regionAt, VITAL, BOX } from './plane.js';

export const SEEDS = { planes: 1943, area: 7, order: 11, people: 2006 };
export const PLANE_MODEL = { sorties: 1000, hitsPerSortie: 2.5, downVital: 0.5, downOther: 0.05 };

// People (an illustration): 10,000 people, 1 in 10 (at random) goes all in. Every year each flips a
// fair coin. Steady: heads +10%, tails +0%. All in: heads x2, tails x0.4. Ten years.
// The "successful" are the top 1% by the end; they are the ones who give talks.
export const PEOPLE_MODEL = { n: 10000, allInShare: 0.1, years: 10, steady: [1.1, 1.0], allIn: [2.0, 0.4], topShare: 0.01 };

function poisson(rand, lam) {
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  for (;;) {
    p *= rand();
    if (p <= L) return k;
    k++;
  }
}

function randomPoint(rand) {
  for (;;) {
    const x = BOX.x0 + rand() * (BOX.x1 - BOX.x0);
    const y = BOX.y0 + rand() * (BOX.y1 - BOX.y0);
    const r = regionAt(x, y);
    if (r) return { x, y, r };
  }
}

// Region areas (plane units²), by Monte Carlo with its own seed.
export function regionAreas(n = 400000) {
  const rand = mulberry32(SEEDS.area);
  const box = (BOX.x1 - BOX.x0) * (BOX.y1 - BOX.y0);
  const count = {};
  for (let i = 0; i < n; i++) {
    const r = regionAt(BOX.x0 + rand() * (BOX.x1 - BOX.x0), BOX.y0 + rand() * (BOX.y1 - BOX.y0));
    if (r) count[r] = (count[r] ?? 0) + 1;
  }
  const area = {};
  for (const [k, v] of Object.entries(count)) area[k] = (v / n) * box;
  return area;
}

export function planes(model = PLANE_MODEL) {
  const rand = mulberry32(SEEDS.planes);
  const all = [];
  for (let i = 0; i < model.sorties; i++) {
    const k = poisson(rand, model.hitsPerSortie);
    const hits = [];
    let down = false;
    for (let j = 0; j < k; j++) {
      const h = randomPoint(rand);
      const fatal = rand() < (VITAL.has(h.r) ? model.downVital : model.downOther);
      if (fatal) down = true;
      hits.push({ ...h, fatal });
    }
    all.push({ hits, down });
  }
  // Arrival order of the planes that came back: a seeded shuffle, separate from the outcome.
  const back = all.filter((p) => !p.down);
  const lost = all.filter((p) => p.down);
  const ro = mulberry32(SEEDS.order);
  for (let i = back.length - 1; i > 0; i--) {
    const j = Math.floor(ro() * (i + 1));
    [back[i], back[j]] = [back[j], back[i]];
  }
  const area = regionAreas();
  const vitalArea = area.engine + area.cockpit;
  const otherArea = area.fuselage + area.wing + area.tail;
  const dens = (list, test) => list.reduce((s, p) => s + p.hits.filter((h) => test(h.r)).length, 0);
  const isEngine = (r) => r === 'engine';
  const notVital = (r) => !VITAL.has(r);
  // Holes per 10,000 plane-units² (only the ratios are shown on screen).
  const per = (holes, a) => (1e4 * holes) / a;
  const seenEngine = per(dens(back, isEngine), area.engine);
  const seenOther = per(dens(back, notVital), otherArea);
  const allEngine = per(dens(all, isEngine), area.engine);
  const allOther = per(dens(all, notVital), otherArea);
  const engineHit = all.filter((p) => p.hits.some((h) => h.r === 'engine'));
  return {
    all, back, lost, area, vitalArea, otherArea,
    holesBack: back.reduce((s, p) => s + p.hits.length, 0),
    holesLost: lost.reduce((s, p) => s + p.hits.length, 0),
    seenEngine, seenOther, allEngine, allOther,
    engineShortfall: 1 - seenEngine / seenOther, // "on the planes that came back, engines show X% fewer holes"
    engineHitLost: engineHit.filter((p) => p.down).length / engineHit.length, // of planes hit in an engine, share lost
    engineHitCount: engineHit.length,
  };
}

export function people(model = PEOPLE_MODEL) {
  const rand = mulberry32(SEEDS.people);
  const all = [];
  for (let i = 0; i < model.n; i++) {
    const allIn = rand() < model.allInShare;
    const [up, down] = allIn ? model.allIn : model.steady;
    let w = 1;
    const path = [1];
    let heads = 0;
    for (let y = 0; y < model.years; y++) {
      const h = rand() < 0.5;
      if (h) heads++;
      w *= h ? up : down;
      path.push(w);
    }
    all.push({ allIn, w, path, heads });
  }
  const byW = all.map((p, i) => i).sort((a, b) => all[b].w - all[a].w);
  const nTop = Math.round(model.n * model.topShare);
  const top = byW.slice(0, nTop);
  const gamblers = all.filter((p) => p.allIn);
  const steady = all.filter((p) => !p.allIn);
  const median = (xs) => {
    const s = xs.slice().sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    n: model.n, all, top, nTop,
    gamblers: gamblers.length,
    topGamblers: top.filter((i) => all[i].allIn).length,
    gamblersInTop: top.filter((i) => all[i].allIn).length / gamblers.length,
    gamblerBelowStart: gamblers.filter((p) => p.w < 1).length / gamblers.length,
    gamblerLostTwoThirds: gamblers.filter((p) => p.w < 1 / 3 + 1e-9).length / gamblers.length,
    gamblerMedian: median(gamblers.map((p) => p.w)),
    gamblerMean: mean(gamblers.map((p) => p.w)),
    steadyMedian: median(steady.map((p) => p.w)),
    steadyBelowStart: steady.filter((p) => p.w < 1).length / steady.length,
    topMin: all[top[top.length - 1]].w,
  };
}
