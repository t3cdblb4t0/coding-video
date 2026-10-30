// Effects track for episode 07 (no music: the user adds their own). Every sound is tied to
// something on screen, from the same timeline and simulation the picture uses.
import { createSfx } from '../../engine/sfx.js';
import { T, timeOfDay } from './timeline.js';

export async function buildAudio(octx, st, end) {
  const fx = createSfx(octx, { end, seed: 707 });
  fx.bed(0, end, { m: 28, vol: 0.02, air: 0.006, duck: [[30.0, 30.8]] });

  // 问: five seconds to remember, one tick a second, then the words break up.
  fx.bell(81, 0.02, { vol: 0.035, decay: 1.6 });
  [1, 2, 3, 4].forEach((s) => fx.tick(s, { vol: 0.11, freq: 2300, body: 800 }));
  fx.bell(88, T.memoEnd, { vol: 0.05, decay: 1.4 });
  fx.whoosh(T.dissolve, 1.2, 2600, 500, { vol: 0.05 });
  fx.rain(T.dissolve + 0.05, T.dissolve + 1.2, (t) => 900 * (1 - (t - T.dissolve) / 1.2), { gain: 0.5, f0: 3000, f1: 7000 });
  fx.bell(76, 5.4, { vol: 0.025, decay: 1.8 });
  // Title.
  fx.riser(T.title - 1.2, T.title, { vol: 0.06 });
  fx.impact(T.title, { vol: 0.45, low: 54, decay: 1.8 });
  fx.bell(57, T.title + 0.02, { vol: 0.05, decay: 5.5 });
  fx.bell(64, T.title + 0.05, { vol: 0.035, decay: 5.5, pan: -0.25 });
  fx.bell(69, T.title + 0.25, { vol: 0.03, decay: 5, pan: 0.25 });

  // 算 · 实验
  fx.whoosh(T.exp + 0.1, 0.6, 900, 300, { vol: 0.05 });
  fx.tick(T.groups + 0.05, { vol: 0.08, freq: 2800, pan: -0.3 });
  fx.tick(T.groups + 0.25, { vol: 0.08, freq: 3100, pan: 0.3 });
  T.tilesL.forEach((t, k) => {
    fx.tick(t, { vol: 0.09, freq: 2600, pan: -0.4 });
    fx.bell(76 + k, t + 0.03, { vol: 0.018, decay: 1, pan: -0.4 });
  });
  T.tilesR.forEach((t, k) => {
    fx.tick(t, { vol: 0.09, freq: 2900, pan: 0.4 });
    if (k > 0) fx.typewriter(t + 0.05, 5, { rate: 18, vol: 0.05, pan: 0.4 }); // 默写: the pencil
  });
  fx.whoosh(T.shrink, 0.8, 1500, 500, { vol: 0.04 });
  fx.whoosh(T.bars5, 1.0, 400, 1800, { vol: 0.05 });
  fx.bell(81, T.bars5 + 1.0, { vol: 0.03, decay: 1.6, pan: -0.3 });
  fx.tick(T.week + 0.05, { vol: 0.09, freq: 3000 });
  fx.impact(T.flip, { vol: 0.28, low: 50, decay: 1.4 });
  fx.whoosh(T.flip, 1.1, 300, 1600, { vol: 0.05 });
  fx.bell(84, T.flip + 1.1, { vol: 0.05, decay: 2.4, pan: 0.3 });
  fx.bell(91, T.flip + 1.16, { vol: 0.022, decay: 2, pan: 0.3 });
  fx.rain(T.reads, T.reads + 1.2, () => 30, { gain: 0.8, f0: 2400, f1: 4800 });
  fx.swell([45, 52, 57], T.less, T.less + 1.6, { vol: 0.016 });
  fx.tick(T.confident + 0.2, { vol: 0.08, freq: 3600 });
  fx.bell(88, T.confident + 0.24, { vol: 0.03, decay: 1 });
  fx.swell([64, 71], T.familiar, T.familiar + 1.4, { vol: 0.012 });
  fx.bell(76, T.retrieve + 0.1, { vol: 0.035, decay: 2.4 });
  fx.bell(83, T.retrieve + 0.16, { vol: 0.025, decay: 2.2, pan: 0.3 });
  fx.whoosh(T.expEnd - 0.2, 0.6, 1200, 300, { vol: 0.04 });

  // 算 · 打分: one tick per technique, a chord for the two that work, a thud for the bottom.
  for (let n = 0; n < 10; n++) fx.tick(T.grades + 0.6 + 0.22 * n, { vol: 0.07, freq: 2400 + 60 * n, pan: (n / 9 - 0.5) * 0.8 });
  fx.bell(76, T.high + 0.05, { vol: 0.04, decay: 2.4, pan: -0.4 });
  fx.bell(83, T.high + 0.1, { vol: 0.03, decay: 2.2, pan: -0.4 });
  fx.impact(T.low + 0.1, { vol: 0.12, low: 48, decay: 0.8 });
  fx.impact(T.low + 0.45, { vol: 0.09, low: 46, decay: 0.8 });

  // 算 · 间隔
  fx.whoosh(T.space, 0.7, 500, 2000, { vol: 0.04 });
  fx.rain(T.cells, T.cells + 1.2, () => 2400, { gain: 0.42, f0: 3200, f1: 7000 }); // 3,000 words develop
  T.sch.forEach((t, k) => {
    fx.tick(t, { vol: 0.08, freq: 2800, pan: (k - 1) * 0.5 });
    st.memory[k].days.forEach((d, j) => fx.tick(t + 0.3 + j * 0.18, { vol: 0.05, freq: 3600, pan: (k - 1) * 0.5 }));
  });
  // Days passing: a faint tick a day.
  for (let d = 1; d <= st.testDay; d++) fx.tick(timeOfDay(d, st.testDay), { vol: 0.025, freq: 1800, body: 600 });
  // Each review: the words that come back (bright), the ones that were lost (low).
  st.memory.forEach((sch, k) => {
    const pan = (k - 1) * 0.6;
    sch.days.forEach((d, j) => {
      const t = d === 0 ? T.run0 + j * 0.25 : timeOfDay(d, st.testDay);
      const ok = sch.words.filter((w) => w.events[j].ok).length;
      const lost = sch.words.length - ok;
      fx.rain(t, t + 0.35, () => ok / 0.35, { gain: 0.16, pan, f0: 3500, f1: 7500 });
      if (lost > 0) fx.rain(t, t + 0.45, () => lost / 0.45, { gain: 0.5, pan, f0: 600, f1: 1600 });
    });
  });
  // The test.
  fx.impact(T.test, { vol: 0.3, low: 56, decay: 1.4 });
  fx.bell(69, T.test + 0.05, { vol: 0.04, decay: 3 });
  fx.rain(T.test + 0.5, T.test + 1.9, () => 40, { gain: 0.7, f0: 2600, f1: 5200 }); // the counters
  fx.bell(84, T.diff + 0.1, { vol: 0.045, decay: 2.2, pan: 0.5 });
  [0, 0.25, 0.5].forEach((dt, k) => fx.tick(T.lapses + dt, { vol: 0.07, freq: 1600 + 200 * k, pan: (k - 1) * 0.6 }));
  fx.bell(76, T.insight + 0.1, { vol: 0.04, decay: 3 });
  fx.bell(83, T.insight + 0.14, { vol: 0.03, decay: 3, pan: 0.4 });
  fx.bell(88, T.insight + 0.3, { vol: 0.02, decay: 2.6, pan: 0.5 });

  // 想
  fx.whoosh(T.method - 0.2, 0.7, 600, 2200, { vol: 0.04 });
  T.steps.forEach((t, k) => {
    fx.tick(t, { vol: 0.09, freq: 3000 });
    fx.bell([76, 81, 88][k], t + 0.05, { vol: 0.03, decay: 1.6 });
  });
  fx.whoosh(T.think, 0.6, 900, 300, { vol: 0.05 }); // the paper card
  fx.bell(81, T.thinkQ + 0.1, { vol: 0.03, decay: 2 });
  // The test at the end.
  fx.whoosh(T.recall, 0.6, 400, 1600, { vol: 0.04 });
  T.countdown.forEach((t) => fx.tick(t, { vol: 0.12, freq: 2300, body: 800 }));
  fx.rain(T.reveal, T.reveal + 1.0, (t) => 900 * ((t - T.reveal) / 1.0), { gain: 0.5, f0: 3000, f1: 7000 });
  fx.bell(76, T.reveal + 0.95, { vol: 0.045, decay: 3 });
  fx.bell(81, T.reveal + 1.0, { vol: 0.035, decay: 3, pan: -0.3 });
  fx.bell(88, T.reveal + 1.1, { vol: 0.03, decay: 3, pan: 0.3 });
  fx.bell(69, T.outro + 0.6, { vol: 0.04, decay: 4 });
  fx.bell(76, T.outro + 0.65, { vol: 0.03, decay: 4, pan: 0.3 });

  fx.finish();
}
