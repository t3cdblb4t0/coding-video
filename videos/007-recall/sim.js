// The memory model for episode 07: FSRS-6, the open-source spaced-repetition model built into Anki
// since 23.10, with its default parameters, copied from open-spaced-repetition/py-fsrs
// (fsrs/scheduler.py, commit 9446cb0, 2026-08-09). No DOM here, so node can run it too:
//   node videos/007-recall/sim-check.mjs
//
// One word at a time: S = stability in days (how long until recall drops to 90%), D = difficulty
// (1-10). Recall after t days: R = (1 + F t / S)^-decay. Every review is a recall attempt: if the
// word comes back it is rated Good; if not, Again, then you look at the answer and get it right
// once more the same day (Good). Reviews less than a day apart use FSRS's same-day rule.
//
// The experiment, all choices fixed before running it (seed 7007, not tuned):
//   1,000 new words learned on day 0 (first sight: Again, then Good once you have it).
//   Then 4 more reviews each, on three schedules:
//     A 学完连背 4 遍   all 4 on day 0, straight after learning
//     B 天天背          days 1, 2, 3, 4
//     C 越隔越久        days 1, 3, 7, 15 (each gap twice the last)
//   Test on day 30: how many of the 1,000 words still come back?
import { mulberry32 } from '../../engine/kit.js';

export const W_FSRS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];
const w = W_FSRS;
const DECAY = -w[20];
const FACTOR = 0.9 ** (1 / DECAY) - 1;
const AGAIN = 1;
const GOOD = 3;
const EASY = 4;
const clampD = (d) => Math.min(10, Math.max(1, d));
const clampS = (s) => Math.max(0.001, s);

export const recall = (t, S) => (1 + (FACTOR * t) / S) ** DECAY;
const initS = (g) => clampS(w[g - 1]);
const initD = (g) => w[4] - Math.exp(w[5] * (g - 1)) + 1;
function nextD(D, g) {
  const delta = -(w[6] * (g - 3));
  const damped = D + ((10 - D) * delta) / 9;
  return clampD(w[7] * initD(EASY) + (1 - w[7]) * damped);
}
function shortTermS(S, g) {
  let inc = Math.exp(w[17] * (g - 3 + w[18])) * S ** -w[19];
  if (g >= 2) inc = Math.max(inc, 1);
  return clampS(S * inc);
}
function recallS(D, S, R) {
  return clampS(S * (1 + Math.exp(w[8]) * (11 - D) * S ** -w[9] * (Math.exp((1 - R) * w[10]) - 1)));
}
function forgetS(D, S, R) {
  const long = w[11] * D ** -w[12] * ((S + 1) ** w[13] - 1) * Math.exp((1 - R) * w[14]);
  return clampS(Math.min(long, S / Math.exp(w[17] * w[18])));
}

// One rated review of a card at day `day` (fractions allowed; same-day if < 1 day since the last).
function review(card, day, g) {
  if (card.S === null) {
    card.S = initS(g);
    card.D = clampD(initD(g));
  } else if (day - card.last < 1) {
    card.S = shortTermS(card.S, g);
    card.D = nextD(card.D, g);
  } else {
    const R = recall(Math.floor(day - card.last), card.S);
    card.S = g === AGAIN ? forgetS(card.D, card.S, R) : recallS(card.D, card.S, R);
    card.D = nextD(card.D, g);
  }
  card.last = day;
}

// ---- facts from the literature (not simulated) --------------------------------------------------
// Roediger & Karpicke (2006), Psychological Science 17(3):249-255, Experiment 2. Prose passage;
// SSSS = four study periods (read), STTT = one study period then three free-recall tests (write down
// what you remember, no feedback). Final test 5 min or 1 week later (different students). Numbers as
// reported by the APS Observer ("Test-enhanced learning") and research summaries of the paper.
export const RK2006 = {
  fiveMin: { reread: 0.83, test: 0.71 },
  week: { reread: 0.4, test: 0.61 },
  reads: { reread: 14.2, test: 3.4 }, // times the passage was read, on average, across the study
};
// Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), Psychological Science in the Public Interest
// 14(1):4-58: ten techniques rated for utility. Chinese names as said in the film.
export const DUNLOSKY2013 = {
  high: ['自测', '隔开复习'], // practice testing, distributed practice
  moderate: ['追问为什么', '给自己讲一遍', '交替着练'], // elaborative interrogation, self-explanation, interleaved practice
  low: ['写总结', '划重点', '谐音联想', '想象画面', '反复读'], // summarization, highlighting, keyword mnemonic, imagery for text, rereading
};

export const SCHEDULES = [
  { key: 'A', name: '学完连背 4 遍', days: [0, 0, 0, 0] },
  { key: 'B', name: '天天背', days: [1, 2, 3, 4] },
  { key: 'C', name: '越隔越久', days: [1, 3, 7, 15] },
];
export const N_WORDS = 1000;
export const TEST_DAY = 30;
export const SEED = 7007;

// Every word of every schedule. Between two reviews a word gets one uniform draw u: it is still
// remembered on day d while u < R(d) (R only falls between reviews), so a review succeeds with
// probability R, exactly as in FSRS, and the picture can show each word going dark on the day it is
// lost. A review draws a fresh u. periods: [{ day, S, u }] from each review on.
export function wordOn(word, d) {
  let p = word.periods[0];
  for (const q of word.periods) if (q.day <= d) p = q;
  return p.u < recall(Math.max(0, d - p.day), p.S);
}

export function runMemory({ n = N_WORDS, seed = SEED, testDay = TEST_DAY } = {}) {
  return SCHEDULES.map((sch, si) => {
    const rand = mulberry32(seed + 101 * si);
    const words = [];
    for (let i = 0; i < n; i++) {
      const card = { S: null, D: null, last: 0 };
      review(card, 0, AGAIN); // first sight: you don't know it yet
      review(card, 0, GOOD); // until you have it once
      let u = rand();
      const periods = [{ day: 0, S: card.S, u }];
      const events = []; // { day, ok }
      for (const day of sch.days) {
        const R = recall(Math.floor(day - card.last), card.S);
        const ok = u < R;
        if (ok) review(card, day, GOOD);
        else {
          review(card, day, AGAIN);
          review(card, day, GOOD); // look at the answer, then get it right once
        }
        events.push({ day, ok });
        u = rand();
        periods.push({ day, S: card.S, u });
      }
      const pTest = recall(testDay - card.last, card.S);
      const remembered = u < pTest;
      words.push({ periods, events, remembered, pTest, S: card.S });
    }
    const kept = words.filter((x) => x.remembered).length;
    const expected = words.reduce((s, x) => s + x.pTest, 0);
    const lapses = words.reduce((s, x) => s + x.events.filter((e) => !e.ok).length, 0);
    const medianS = words.map((x) => x.S).sort((a, b) => a - b)[n >> 1];
    const onAt = (d) => words.filter((x) => wordOn(x, d)).length;
    return { ...sch, words, kept, forgot: n - kept, expected, lapses, medianS, onAt };
  });
}
