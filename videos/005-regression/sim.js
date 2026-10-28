// Real simulations behind every number on screen. Seeds are fixed in advance (see 分镜.md);
// results are reported exactly as they come out.
//
// Model: each attempt = skill (fixed per person) + luck (fresh every attempt). The variances are
// chosen so the correlation between two attempts of the same person is 0.5 (skill variance =
// luck variance), which is a typical size for the noisy skills the video talks about. Scores are
// shown on a 0–100 scale: mean 60, total SD 12.
import { mulberry32 } from '../../engine/kit.js';

export const SEEDS = { cadets: 1960, coins: 27, galton: 1886, coach: 2002 };
export const MEAN = 60;
export const SKILL_SD = 12 / Math.SQRT2; // skill and luck each contribute half the variance
export const LUCK_SD = 12 / Math.SQRT2;
export const CADETS = 10_000;

// Standard normal via Box–Muller (deterministic given rand).
function gauss(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// The core experiment: 10,000 cadets, each flies twice. Nobody is praised or scolded at all.
// Returns per-cadet skill, first and second score, plus group summaries.
export function cadets(count = CADETS, seed = SEEDS.cadets) {
  const rand = mulberry32(seed);
  const skill = new Float32Array(count);
  const s1 = new Float32Array(count);
  const s2 = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    skill[i] = MEAN + SKILL_SD * gauss(rand);
    s1[i] = skill[i] + LUCK_SD * gauss(rand);
    s2[i] = skill[i] + LUCK_SD * gauss(rand);
  }
  // Rank by first score: top 10% ("praised") and bottom 10% ("scolded").
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => s1[b] - s1[a]);
  const k = Math.round(count * 0.1);
  const top = order.slice(0, k);
  const bottom = order.slice(count - k);
  const mean = (idx, arr) => idx.reduce((s, i) => s + arr[i], 0) / idx.length;
  const share = (idx, pred) => idx.filter(pred).length / idx.length;
  return {
    count, skill, s1, s2, top, bottom,
    top1: mean(top, s1), top2: mean(top, s2), topSkill: mean(top, skill),
    bot1: mean(bottom, s1), bot2: mean(bottom, s2), botSkill: mean(bottom, skill),
    topWorse: share(top, (i) => s2[i] < s1[i]),
    botBetter: share(bottom, (i) => s2[i] > s1[i]),
    all1: mean(order, s1), all2: mean(order, s2),
  };
}

// Kahneman's demonstration: a chalk target on the floor; each instructor turns his back to it and
// tosses two coins at it, without looking and without feedback. Pure luck: the landing offset is
// a fresh 2D normal for every toss (SD 50 cm on each axis), nobody has any skill.
export const TOSS_SD_CM = 50;
export function coins(people = 30, seed = SEEDS.coins) {
  const rand = mulberry32(seed);
  const p1 = [];
  const p2 = [];
  for (let p = 0; p < people; p++) {
    p1.push([TOSS_SD_CM * gauss(rand), TOSS_SD_CM * gauss(rand)]);
    p2.push([TOSS_SD_CM * gauss(rand), TOSS_SD_CM * gauss(rand)]);
  }
  const dist = ([x, y]) => Math.hypot(x, y);
  const d1 = p1.map(dist);
  const d2 = p2.map(dist);
  const order = d1.map((_, i) => i).sort((a, b) => d1[a] - d1[b]); // closest first
  const k = Math.round(people / 3);
  const best = order.slice(0, k);
  const worst = order.slice(people - k);
  const mean = (idx, arr) => idx.reduce((s, i) => s + arr[i], 0) / idx.length;
  return {
    people, p1, p2, d1, d2, best, worst,
    best1: mean(best, d1), best2: mean(best, d2), worst1: mean(worst, d1), worst2: mean(worst, d2),
    bestWorse: best.filter((i) => d2[i] > d1[i]).length,
    worstBetter: worst.filter((i) => d2[i] < d1[i]).length,
  };
}


// "Coaching" a group that scored badly: the scolded cadets improve whether or not anyone scolds
// them. We split the bottom 10% at random into "scolded" and "left alone" (the treatment does
// nothing in this model) and show both groups improve by about the same amount.
export function controlGroup(sim, seed = SEEDS.coach) {
  const rand = mulberry32(seed);
  const scolded = [];
  const alone = [];
  for (const i of sim.bottom) (rand() < 0.5 ? scolded : alone).push(i);
  const gain = (idx) => idx.reduce((s, i) => s + (sim.s2[i] - sim.s1[i]), 0) / idx.length;
  const mean = (idx, arr) => idx.reduce((s, i) => s + arr[i], 0) / idx.length;
  return {
    scolded, alone, gainScolded: gain(scolded), gainAlone: gain(alone),
    scolded1: mean(scolded, sim.s1), scolded2: mean(scolded, sim.s2), alone1: mean(alone, sim.s1), alone2: mean(alone, sim.s2),
  };
}

// Theory: expected second score given first score x, with correlation 0.5: mean + 0.5 (x − mean).
export const expectedSecond = (x) => MEAN + 0.5 * (x - MEAN);
