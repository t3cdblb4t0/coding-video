// Effects track for episode 06 (no music: the user adds their own in 剪映). Every sound is tied to
// something on screen, from the same timeline and simulation data the picture uses.
import { createSfx } from '../../engine/sfx.js';
import { T } from './timeline.js';
import { flightTimes, streamTimes, holesOf, MEMO_TITLE, TYPE_RATE, memoTypeStart } from './act1.js';
import { yearTimes } from './act2.js';

export async function buildAudio(octx, st, end) {
  const fx = createSfx(octx, { end, seed: 606 });
  const p = st.planes;

  // A faint, almost toneless bed (41 Hz, below what phone speakers play, plus air) so the beat of
  // silence before the answer is felt; quiet enough not to fight the user's music.
  fx.bed(0, end, { m: 28, vol: 0.02, air: 0.006, duck: [T.silence] });
  // Distant propellers while the planes come home.
  fx.hum(0, T.title - 0.2, { vol: 0.03, f: 56, rate: 9, pan: -0.2 });
  fx.hum(0, T.title - 0.2, { vol: 0.018, f: 74, rate: 13, pan: 0.3 });

  // The six planes we watch: a pass, then one tick per hole as it lands on the diagram.
  flightTimes().forEach((land, k) => {
    fx.whoosh(land - 1.0, 1.1, 420, 2300, { vol: 0.055, pan: k % 2 ? 0.35 : -0.35, pan1: 0 });
    const n = holesOf(24 + k);
    for (let j = 0; j < n; j++) fx.tick(land + j * 0.03, { vol: 0.11, freq: 2900, body: 1000, pan: (j - n / 2) * 0.1 });
  });
  // The stream: ticks at the real rate of holes landing.
  const times = streamTimes();
  const bin = 0.1;
  const hist = new Map();
  for (const t of times) hist.set(Math.floor(t / bin), (hist.get(Math.floor(t / bin)) ?? 0) + 2.2);
  fx.rain(T.stream0, T.stream1 + 0.15, (t) => (hist.get(Math.floor(t / bin)) ?? 0) / bin, { gain: 0.9, f0: 2200, f1: 6000 });

  // "If it were you, where?" — three tags, then the question hangs.
  T.tags.forEach((t, k) => fx.tick(t, { vol: 0.1, freq: 3300, body: 1300, pan: [-0.4, 0, 0.4][k] }));
  fx.bell(76, T.question + 0.15, { vol: 0.028, decay: 2.4 });

  // Title: a rise, a low hit with the flash, a long soft chord.
  fx.riser(T.title - 1.2, T.title, { vol: 0.06 });
  fx.impact(T.title, { vol: 0.5, low: 54, decay: 1.8 });
  fx.bell(57, T.title + 0.02, { vol: 0.05, decay: 5.5 });
  fx.bell(64, T.title + 0.05, { vol: 0.035, decay: 5.5, pan: -0.25 });
  fx.bell(69, T.title + 0.25, { vol: 0.03, decay: 5, pan: 0.25 });

  // A, then C.
  fx.tick(T.pickA + 0.1, { vol: 0.09, freq: 2600 });
  fx.bell(64, T.pickA + 0.2, { vol: 0.026, decay: 1.6 });
  fx.bell(81, T.pickC + 0.12, { vol: 0.05, decay: 2.6 });
  fx.bell(88, T.pickC + 0.18, { vol: 0.024, decay: 2.2, pan: 0.3 });
  fx.typewriter(T.pickC + 0.05, 12, { rate: 28, vol: 0.035, pan: -0.5 });

  // The planes that never came back: an uneasy swell, then they fall away.
  fx.swell([45, 52, 57], T.ghosts, T.ghosts + 2.2, { vol: 0.02 });
  fx.whoosh(T.fall, 1.9, 2200, 260, { vol: 0.07 });
  [0.7, 1.2, 1.8].forEach((dt, k) => fx.impact(T.fall + dt, { vol: 0.11 - k * 0.02, low: 46, decay: 1.0 }));
  // The denominator joins the counter.
  fx.tick(T.denom, { vol: 0.1, freq: 3000 });
  fx.bell(84, T.denom + 0.08, { vol: 0.04, decay: 2 });

  // Push in on the engines; silence; the answer lands.
  fx.whoosh(T.denom + 1.1, 1.3, 300, 1300, { vol: 0.045 });
  fx.impact(T.silence[1] + 0.05, { vol: 0.32, low: 50, decay: 1.6 });
  const engineLost = p.lost.reduce((s, pl) => s + pl.hits.filter((h) => h.r === 'engine').length, 0);
  fx.rain(T.redEngine, T.redEngine + 1.25, () => engineLost / 1.1, { gain: 1, f0: 900, f1: 2600 });
  // Pull back; every lost hole counted in.
  fx.whoosh(T.pullBack, 1.2, 1300, 320, { vol: 0.045 });
  fx.rain(T.redOther, T.redOther + 1.25, () => (p.holesLost - engineLost) / 1.1, { gain: 0.9, f0: 900, f1: 2600 });
  fx.tick(T.bars + 0.3, { vol: 0.08, freq: 2400 }); // the bars rise, red included
  fx.tick(T.gap + 0.3, { vol: 0.08, freq: 2000 }); // the red drains away
  fx.bell(76, T.gap + 0.7, { vol: 0.03, decay: 2 }); // "−40%"

  // The memo: paper slides up, the title is typed, a bell at each line's end, the stamp.
  fx.whoosh(T.memo - 0.1, 0.6, 900, 300, { vol: 0.06 });
  let tt = memoTypeStart();
  for (const ln of MEMO_TITLE) {
    const n = ln.replace(/ /g, '').length;
    fx.typewriter(tt, n, { rate: (TYPE_RATE * n) / ln.length, vol: 0.075 });
    tt += ln.length / TYPE_RATE;
    fx.bell(96, tt + 0.02, { vol: 0.02, decay: 0.5, send: 0.2 });
  }
  fx.impact(tt + 0.6, { vol: 0.18, low: 95, decay: 0.35 });

  // ---- 算 · 人 ----
  const g = st.people;
  fx.whoosh(T.memoEnd - 0.2, 0.7, 1200, 300, { vol: 0.05 }); // the memo leaves
  fx.rain(T.people + 0.2, T.people + 1.0, () => 700, { gain: 0.45, f0: 3200, f1: 7000 }); // 10,000 dots develop
  fx.whoosh(T.coin, 0.6, 2000, 5200, { vol: 0.03, q: 3 }); // the coin spins
  fx.tick(T.coin + 0.9, { vol: 0.1, freq: 3600, body: 1500 }); // and lands
  fx.bell(93, T.coin + 0.92, { vol: 0.03, decay: 1.0 });
  fx.bell(76, T.steady + 0.05, { vol: 0.03, decay: 1.6 });
  fx.bell(81, T.allIn + 0.05, { vol: 0.03, decay: 1.6 });
  fx.whoosh(T.collapse, 0.9, 600, 2600, { vol: 0.06 }); // everyone to the same start
  fx.impact(T.collapse + 0.75, { vol: 0.16, low: 72, decay: 0.8 });
  // Ten years: every year, 10,000 coins land at once.
  yearTimes().forEach((ty) => {
    fx.rain(ty - 0.32, ty, () => 650, { gain: 0.42, f0: 2600, f1: 6500 });
    fx.tick(ty, { vol: 0.055, freq: 2200, body: 700 });
  });
  // The stage: a rise, a hit, a chord; the 100 step up.
  fx.riser(T.grow1 - 0.6, T.stage, { vol: 0.05 });
  fx.impact(T.stage, { vol: 0.28, low: 60, decay: 1.4 });
  fx.bell(69, T.stage + 0.02, { vol: 0.04, decay: 3.5 });
  fx.bell(76, T.stage + 0.06, { vol: 0.03, decay: 3.5, pan: 0.3 });
  fx.rain(T.stage + 0.3, T.stage + 1.7, () => g.nTop / 1.3, { gain: 0.7, f0: 3000, f1: 6000 });
  fx.tick(T.allTop + 0.1, { vol: 0.08, freq: 3000 });
  fx.bell(84, T.allTop + 0.15, { vol: 0.03, decay: 1.4 });
  fx.swell([57, 64], T.quote, T.quote + 1.2, { vol: 0.014 });
  // The denominator.
  fx.tick(T.denom2, { vol: 0.1, freq: 3000 });
  fx.bell(84, T.denom2 + 0.08, { vol: 0.04, decay: 2 });
  // The ones who lost, like the planes that never came back.
  fx.swell([45, 52, 57], T.redPeople - 0.3, T.redPeople + 1.2, { vol: 0.018 });
  fx.whoosh(T.redPeople + 0.6, 1.6, 2000, 240, { vol: 0.06 });
  fx.rain(T.redPeople + 0.6, T.redPeople + 1.9, () => st.act2.lose / 1.3, { gain: 0.8, f0: 700, f1: 2200 });
  [1.2, 1.7].forEach((dt) => fx.impact(T.redPeople + dt, { vol: 0.09, low: 46, decay: 0.9 }));
  fx.bell(76, T.steadyGlow + 0.1, { vol: 0.03, decay: 2 });
  fx.tick(T.fractions + 0.7, { vol: 0.08, freq: 2400 });
  fx.tick(T.fractions + 2.0, { vol: 0.08, freq: 2400 });
  fx.bell(81, T.fractions + 2.4, { vol: 0.045, decay: 2.4 });

  // ---- 想 ----
  fx.whoosh(T.life - 0.3, 0.8, 500, 2000, { vol: 0.04 });
  fx.bell(57, T.life, { vol: 0.04, decay: 4 });
  fx.bell(64, T.life + 0.05, { vol: 0.03, decay: 4, pan: -0.25 });
  fx.rain(T.fridgeRow + 0.3, T.fridgeRow + 0.7, () => 25, { gain: 0.8, f0: 2000, f1: 4000 }); // the batch
  fx.whoosh(T.fridgeRow + 1.0, 0.4, 3000, 1200, { vol: 0.03 }); // they break
  [1.9, 2.05, 2.2].forEach((dt) => fx.impact(T.fridgeRow + dt, { vol: 0.07, low: 52, decay: 0.7 })); // thrown out
  fx.tick(T.phone + 0.1, { vol: 0.08, freq: 3200 });
  fx.bell(88, T.phone + 0.2, { vol: 0.03, decay: 1 }); // a notification
  fx.rain(T.phoneStack, T.phoneStack + 0.7, () => 18, { gain: 0.8, f0: 1500, f1: 3500 });
  T.steps.forEach((ts, k) => {
    fx.tick(ts, { vol: 0.09, freq: 3000 });
    fx.bell([76, 81, 88][k], ts + 0.05, { vol: 0.03, decay: 1.6 });
  });
  fx.whoosh(T.think, 0.6, 900, 300, { vol: 0.05 }); // the paper card
  fx.bell(81, T.think + 10.2, { vol: 0.03, decay: 2 }); // its question
  // Back to the opening plane: the propellers again, the lost holes, the engines.
  fx.whoosh(T.callback - 0.2, 0.8, 300, 1500, { vol: 0.045 });
  fx.hum(T.callback, T.outro + 0.4, { vol: 0.022, f: 56, rate: 9 });
  fx.rain(T.callback + 0.9, T.callback + 2.3, () => p.holesLost / 1.3, { gain: 0.8, f0: 900, f1: 2600 });
  fx.bell(81, T.callback + 2.4, { vol: 0.05, decay: 2.6 });
  fx.bell(88, T.callback + 2.46, { vol: 0.025, decay: 2.2, pan: 0.3 });
  fx.bell(69, T.outro + 0.2, { vol: 0.04, decay: 4 });

  fx.finish();
}
