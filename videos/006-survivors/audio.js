// Effects track for episode 06 (no music: the user adds their own in 剪映). Every sound is tied to
// something on screen, from the same timeline and simulation data the picture uses.
import { createSfx } from '../../engine/sfx.js';
import { T } from './timeline.js';
import { flightTimes, streamTimes, holesOf, MEMO_TITLE, TYPE_RATE, memoTypeStart } from './act1.js';

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
  fx.tick(T.bars + 0.3, { vol: 0.08, freq: 2400 });
  fx.tick(T.bars + 1.4, { vol: 0.08, freq: 2000 });
  fx.bell(76, T.bars + 2.3, { vol: 0.03, decay: 2 });

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

  fx.finish();
}
