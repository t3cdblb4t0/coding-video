// Soundtrack for the long cut, synthesised with Web Audio (no samples, nothing to license).
// 100 BPM, A minor, 55 bars. Sections follow the story (see SONG); every effect is scheduled
// from the same timeline/simulation data the visuals use.
import { mulberry32, smooth } from '../../engine/kit.js';
import { T, BEAT, BAR, landTime, logLand, logRate } from './timeline.js';
import { DEMO_NEEDLES, hookDropTimes, HOOK_STATIC, ANIMATED_NEEDLES, COLS } from './field.js';
import { TW } from './story.js';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = {
  Am: { bass: 33, pad: [57, 60, 64, 71], arp: [69, 72, 76, 79] },
  F: { bass: 29, pad: [57, 60, 65, 64], arp: [65, 69, 72, 76] },
  C: { bass: 36, pad: [55, 60, 64, 74], arp: [67, 72, 76, 79] },
  G: { bass: 31, pad: [55, 59, 62, 69], arp: [67, 71, 74, 79] },
  E: { bass: 28, pad: [56, 59, 64, 68], arp: [68, 71, 76, 80] },
  Dm: { bass: 26, pad: [57, 62, 65, 69], arp: [62, 65, 69, 74] },
};
const PENTA = [81, 84, 86, 88, 91, 93]; // A5 C6 D6 E6 G6 A6: crossings "ring" in key

// One entry per bar: [chord, style].
const SONG = [
  ['Am', 'hook'], ['F', 'hook'],
  ['Am', 'box'], ['F', 'box'], ['C', 'box'],
  ['G', 'box'], ['F', 'box'], ['Am', 'box'], ['E', 'box'],
  ['Am', 'pulse'], ['F', 'pulse'], ['C', 'pulse'], ['G', 'pulse'],
  ['Dm', 'mystery'], ['E', 'mystery'],
  ['Am', 'think'], ['F', 'think'], ['C', 'think'], ['G', 'think'],
  ['Am', 'think'], ['F', 'think'], ['G', 'think'],
  ['Dm', 'think'], ['Am', 'think'], ['F', 'think'], ['E', 'think'],
  ['F', 'think2'], ['G', 'think2'], ['Am', 'think2'], ['E', 'think2'],
  ['F', 'think2'], ['G', 'think2'], ['C', 'aha'], ['C', 'aha'],
  ['F', 'build'], ['G', 'build'],
  ['Am', 'groove'], ['F', 'groove'], ['C', 'groove'], ['G', 'groove'], ['Am', 'groove'], ['F', 'groove'],
  ['C', 'reveal'], ['F', 'reveal'], ['C', 'reveal'],
  ['Am', 'det'], ['Am', 'det'], ['F', 'det'], ['E', 'det'], ['Am', 'det'], ['Dm', 'det'], ['F', 'det'], ['E', 'det'],
  ['F', 'outro'], ['C', 'outro'],
];

export async function buildAudio(octx, st) {
  if (Math.abs(SONG.length * BAR - T.end) > 1e-6) throw new Error(`song is ${SONG.length} bars, timeline ends at ${T.end}s`);
  const sr = octx.sampleRate;
  const rand = mulberry32(2024);

  // ---- buses ----
  const comp = octx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 8;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  comp.connect(octx.destination);
  const master = octx.createGain();
  master.gain.setValueAtTime(1, 0);
  master.gain.setValueAtTime(1, T.end - 1.4);
  master.gain.linearRampToValueAtTime(0, T.end - 0.05);
  master.connect(comp);
  const dry = octx.createGain();
  dry.connect(master);
  const verb = octx.createConvolver();
  verb.buffer = impulse(octx, 2.8, rand);
  const verbIn = octx.createGain();
  const verbOut = octx.createGain();
  verbOut.gain.value = 0.5;
  verbIn.connect(verb).connect(verbOut).connect(master);

  const noise = octx.createBuffer(1, sr * 2, sr);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1;

  // Rendering cost: Chrome processes every node in the graph on every 128-sample block, including
  // notes that have not started yet. So notes are created lazily, one window at a time, via
  // suspend()/resume(), and each voice is disconnected from the buses once it has finished.
  const events = [];
  let live = [];
  const at = (t, fn) => events.push({ t, fn });
  const deferred = (fn, timeArg) => (...a) => at(a[timeArg], () => fn(...a));

  const out = (node, { pan = 0, send = 0.25, gain = 1, end = Infinity } = {}) => {
    const g = octx.createGain();
    g.gain.value = gain;
    const p = octx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(g).connect(p);
    p.connect(dry);
    const nodes = [p];
    if (send > 0) {
      const s = octx.createGain();
      s.gain.value = send;
      p.connect(s).connect(verbIn);
      nodes.push(s);
    }
    live.push({ end, nodes });
    return g;
  };
  const noiseSrc = (t, dur) => {
    const s = octx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.start(t, rand() * 1.5);
    s.stop(t + dur + 0.05);
    return s;
  };
  const osc = (type, f, t0, t1) => {
    const o = octx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(t0);
    o.stop(t1);
    return o;
  };
  const decayGain = (t, peak, decay, attack = 0.003) => {
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  };

  // ---- instruments ----
  function padNow(chord, t0, t1, { vol = 0.032, cutoff = 1300, cutoff1 = null, attack = 0.5, release = 0.9 } = {}) {
    for (const [k, m] of CHORDS[chord].pad.entries()) {
      for (const det of [-7, 7]) {
        const o = osc('sawtooth', midi(m), t0, t1 + release + 0.1);
        o.detune.value = det + (rand() - 0.5) * 4;
        const f = octx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cutoff * 0.6, t0);
        f.frequency.linearRampToValueAtTime(cutoff, t0 + Math.min(attack * 2, t1 - t0));
        if (cutoff1) f.frequency.linearRampToValueAtTime(cutoff1, t1);
        f.Q.value = 0.6;
        const g = octx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + attack);
        g.gain.setValueAtTime(vol, t1);
        g.gain.linearRampToValueAtTime(0, t1 + release);
        o.connect(f).connect(g);
        out(g, { pan: (k / 3 - 0.5) * 0.8 * Math.sign(det), send: 0.4, end: t1 + release + 0.1 });
      }
    }
  }
  function bassNow(chord, t0, t1, vol = 0.18) {
    const f = midi(CHORDS[chord].bass + 12);
    const o = osc('sine', f, t0, t1 + 0.4);
    const o2 = osc('triangle', f, t0, t1 + 0.4);
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.04);
    g.gain.setValueAtTime(vol, Math.max(t0 + 0.05, t1 - 0.05));
    g.gain.linearRampToValueAtTime(0, t1 + 0.3);
    const g2 = octx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    out(g, { send: 0, end: t1 + 0.4 });
  }
  function pluckNow(m, t, { vol = 0.1, decay = 0.55, bright = 3500, pan = 0, send = 0.35 } = {}) {
    const f = midi(m);
    const g = decayGain(t, vol, decay);
    const lp = octx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(bright, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + decay);
    osc('triangle', f, t, t + decay + 0.1).connect(lp);
    const h = octx.createGain();
    h.gain.value = 0.3;
    osc('sine', f * 2, t, t + decay + 0.1).connect(h).connect(lp);
    lp.connect(g);
    out(g, { pan, send, end: t + decay + 0.1 });
  }
  function bellNow(m, t, { vol = 0.08, decay = 1.2, pan = 0, send = 0.45 } = {}) {
    const f = midi(m);
    for (const [r, a, dd] of [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.25, 0.35], [8.93, 0.12, 0.2]]) {
      const g = decayGain(t, vol * a, decay * dd, 0.002);
      osc('sine', f * r, t, t + decay * dd + 0.05).connect(g);
      out(g, { pan, send, end: t + decay * dd + 0.05 });
    }
  }
  function tockNow(t, { vol = 0.25, freq = 1700, pan = 0, body = 520 } = {}) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 2.5;
    const g = decayGain(t, vol, 0.035, 0.001);
    noiseSrc(t, 0.06).connect(bp).connect(g);
    out(g, { pan, send: 0.12, end: t + 0.12 });
    const o = osc('sine', body, t, t + 0.12);
    o.frequency.setValueAtTime(body, t);
    o.frequency.exponentialRampToValueAtTime(body * 0.6, t + 0.08);
    const g2 = decayGain(t, vol * 0.6, 0.07, 0.001);
    o.connect(g2);
    out(g2, { pan, send: 0.1, end: t + 0.12 });
  }
  function kickNow(t, vol = 0.5) {
    const o = osc('sine', 150, t, t + 0.45);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    const g = decayGain(t, vol, 0.38, 0.002);
    o.connect(g);
    out(g, { send: 0.03, end: t + 0.45 });
  }
  function hatNow(t, vol = 0.05, pan = 0.2) {
    const hp = octx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = decayGain(t, vol, 0.045, 0.001);
    noiseSrc(t, 0.08).connect(hp).connect(g);
    out(g, { pan, send: 0.05, end: t + 0.13 });
  }
  function snareGhostNow(t, vol = 0.05) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 0.8;
    const g = decayGain(t, vol, 0.09, 0.001);
    noiseSrc(t, 0.12).connect(bp).connect(g);
    out(g, { send: 0.2, end: t + 0.17 });
  }
  function sweepNow(t, dur, f0, f1, vol = 0.12, q = 1.2, pan = 0) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.55);
    g.gain.linearRampToValueAtTime(0, t + dur);
    noiseSrc(t, dur).connect(bp).connect(g);
    out(g, { pan, send: 0.3, end: t + dur + 0.05 });
  }
  function riserNow(t0, t1, vol = 0.1) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(300, t0);
    bp.frequency.exponentialRampToValueAtTime(7000, t1);
    const g = octx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t1);
    g.gain.linearRampToValueAtTime(0, t1 + 0.04);
    noiseSrc(t0, t1 - t0).connect(bp).connect(g);
    out(g, { send: 0.35, end: t1 + 0.1 });
  }
  function impactNow(t, vol = 0.8, low = 70) {
    const o = osc('sine', low, t, t + 2);
    o.frequency.setValueAtTime(low, t);
    o.frequency.exponentialRampToValueAtTime(low * 0.43, t + 1.5);
    const g = decayGain(t, vol, 1.6, 0.004);
    o.connect(g);
    out(g, { send: 0.15, end: t + 2 });
    const lp = octx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
    const g2 = decayGain(t, vol * 0.5, 0.7, 0.002);
    noiseSrc(t, 0.8).connect(lp).connect(g2);
    out(g2, { send: 0.6, end: t + 0.85 });
  }
  function penNow(t, dur, vol = 0.05) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3800;
    bp.Q.value = 1.8;
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k < dur * 30; k++) g.gain.setValueAtTime(vol * (0.4 + 0.6 * rand()), t + k / 30);
    g.gain.setValueAtTime(0, t + dur);
    noiseSrc(t, dur).connect(bp).connect(g);
    out(g, { pan: 0.15, send: 0.15, end: t + dur + 0.05 });
  }
  function droneNow(m, t0, t1, vol = 0.06) {
    const o = osc('sine', midi(m), t0, t1 + 0.6);
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.8);
    g.gain.setValueAtTime(vol, t1 - 0.2);
    g.gain.linearRampToValueAtTime(0, t1 + 0.5);
    o.connect(g);
    out(g, { send: 0.3, end: t1 + 0.6 });
  }

  const pad = deferred(padNow, 1);
  const bass = deferred(bassNow, 1);
  const pluck = deferred(pluckNow, 1);
  const bell = deferred(bellNow, 1);
  const drone = deferred(droneNow, 1);
  const tock = deferred(tockNow, 0);
  const kick = deferred(kickNow, 0);
  const hat = deferred(hatNow, 0);
  const snareGhost = deferred(snareGhostNow, 0);
  const sweep = deferred(sweepNow, 0);
  const riser = deferred(riserNow, 0);
  const impact = deferred(impactNow, 0);
  const pen = deferred(penNow, 0);
  const rain = deferred(rainNow, 0);
  const ring = (cross, t, pan, vol = 1) =>
    cross ? bell(PENTA[Math.floor(rand() * PENTA.length)], t, { vol: 0.045 * vol, decay: 0.8, pan }) : tock(t, { vol: 0.14 * vol, pan });

  // ---- music: one bar at a time ----
  SONG.forEach(([ch, style], b) => {
    const t0 = b * BAR;
    const t1 = t0 + BAR;
    const arp = CHORDS[ch].arp;
    const eighths = (pattern, opts) => pattern.forEach((p, k) => pluck(arp[p], t0 + k * (BEAT / 2), { pan: (p - 1.5) * 0.25, ...opts }));
    switch (style) {
      case 'hook':
        pad(ch, t0, t1, { attack: 0.05, cutoff: 900, vol: 0.03 });
        bass(ch, t0, t1, 0.2);
        for (let k = 0; k < 4; k++) kick(t0 + k * BEAT, b === 0 && k === 0 ? 0.7 : 0.42);
        break;
      case 'box':
        pad(ch, t0, t1, { cutoff: 1300 });
        bass(ch, t0, t1, 0.15);
        eighths([0, 1, 2, 3, 2, 1, 2, 3], { vol: 0.06, bright: 2600 });
        break;
      case 'pulse':
        pad(ch, t0, t1, { cutoff: 1600 });
        bass(ch, t0, t1, 0.19);
        kick(t0, 0.42);
        kick(t0 + 2 * BEAT, 0.36);
        for (let k = 0; k < 4; k++) hat(t0 + k * BEAT + BEAT / 2, 0.03, k % 2 ? 0.25 : -0.25);
        eighths([0, 2, 1, 3, 0, 2, 1, 3], { vol: 0.055, bright: 3200, decay: 0.4 });
        break;
      case 'mystery':
        pad(ch, t0, t1, { cutoff: 800, vol: 0.03, attack: 0.8 });
        drone(CHORDS[ch].bass + 12, t0, t1, 0.07);
        bell(arp[3] + 12, t0 + 0.05, { vol: 0.035, decay: 2 });
        bell(arp[1] + 12, t0 + BEAT * 1.5, { vol: 0.025, decay: 2, pan: 0.3 });
        break;
      case 'think':
      case 'think2':
        pad(ch, t0, t1, { cutoff: style === 'think2' ? 1500 : 1150, vol: 0.03 });
        bass(ch, t0, t0 + 2 * BEAT - 0.05, 0.15);
        bass(ch, t0 + 2 * BEAT, t1, 0.13);
        kick(t0, 0.32);
        if (style === 'think2') kick(t0 + 2 * BEAT, 0.28);
        for (let k = 0; k < 4; k++) hat(t0 + k * BEAT + BEAT / 2, 0.022, k % 2 ? 0.3 : -0.3);
        eighths([0, 2, 1, 3, 0, 2, 1, 3], { vol: 0.045, bright: 2400, decay: 0.45 });
        if (style === 'think2') [1, 3, 5, 7].forEach((k) => pluck(arp[(k + 1) % 4] + 12, t0 + k * (BEAT / 2) + BEAT / 4, { vol: 0.018, decay: 0.25, bright: 4000, pan: 0.4 }));
        break;
      case 'aha':
        pad(ch, t0, t1, { cutoff: 2600, vol: 0.04, attack: 0.15 });
        bass(ch, t0, t1, 0.18);
        [0, 1, 2, 3].forEach((p, k) => bell(arp[p] + (b % 2 ? 12 : 0), t0 + k * BEAT, { vol: 0.035, decay: 1.4, pan: (k - 1.5) * 0.3 }));
        break;
      case 'build':
        pad(ch, t0, t1, { cutoff: 1400, cutoff1: 3000, vol: 0.034 });
        bass(ch, t0, t1, 0.18);
        for (let k = 0; k < 4; k++) kick(t0 + k * BEAT, 0.3 + 0.04 * k + (b % 2) * 0.1);
        if (b % 2) for (let k = 0; k < 8; k++) snareGhost(t0 + 2 * BEAT + k * (BEAT / 4), 0.02 + k * 0.008);
        eighths([0, 1, 2, 3, 0, 1, 2, 3], { vol: 0.05, bright: 3400, decay: 0.35 });
        break;
      case 'groove': {
        const last = b === 41;
        pad(ch, t0, t1, { cutoff: 2200, vol: 0.034 });
        bass(ch, t0, last ? t1 - BEAT : t1, 0.21);
        for (let k = 0; k < 4; k++) {
          if (last && k === 3) continue;
          kick(t0 + k * BEAT, 0.45);
          hat(t0 + k * BEAT + BEAT / 2, 0.045, k % 2 ? 0.25 : -0.25);
          if (k % 2) snareGhost(t0 + k * BEAT, 0.05);
        }
        [0, 2, 1, 3, 2, 0, 3, 1, 0, 2, 1, 3, 2, 3, 1, 2].forEach((p, k) => {
          if (last && k >= 12) return;
          pluck(arp[p] - (k % 4 === 0 ? 12 : 0), t0 + k * (BEAT / 4), { vol: 0.055, decay: 0.3, bright: 4200, pan: (p - 1.5) * 0.3, send: 0.25 });
        });
        break;
      }
      case 'reveal':
        pad(ch, t0, t1, { cutoff: 2800, vol: 0.042, attack: 0.05 });
        bass(ch, t0, t1, 0.2);
        if (b > 42) eighths([0, 1, 2, 3, 2, 1, 2, 3], { vol: 0.045, bright: 3000 });
        break;
      case 'det': {
        pad(ch, t0, t1, { cutoff: 700, vol: 0.024, attack: 0.3 });
        const root = CHORDS[ch].bass + 12;
        [0, 7, 12, 7, 0, 7, 10, 7].forEach((iv, k) => pluck(root + iv, t0 + k * (BEAT / 2), { vol: 0.07, decay: 0.22, bright: 900, send: 0.15 }));
        for (let k = 0; k < 8; k++) tock(t0 + k * (BEAT / 2), { vol: k % 2 ? 0.03 : 0.045, freq: 3200, body: 1400, pan: k % 2 ? 0.35 : -0.35 });
        kick(t0, 0.3);
        break;
      }
      case 'outro':
        pad(ch, t0, Math.min(t1, T.end - 1.2), { cutoff: 1600, vol: 0.034, release: 1.2 });
        bass(ch, t0, Math.min(t1, T.end - 1.4), 0.15);
        [0, 1, 2, 3].forEach((p, k) => pluck(arp[p], t0 + k * BEAT, { vol: 0.05, decay: 0.9, bright: 2600, pan: (p - 1.5) * 0.3, send: 0.5 }));
        break;
      default:
        throw new Error(`unknown style ${style}`);
    }
  });

  // ---- hook ----
  impact(0, 0.55);
  bell(81, BEAT, { vol: 0.06, decay: 1.6 }); // glint on "π" in the title
  bell(88, BEAT, { vol: 0.04, decay: 1.6, pan: 0.3 });
  pluck(76, 2 * BEAT, { vol: 0.05, decay: 0.8 }); // subtitle
  hookDropTimes.forEach((t, k) => ring(st.hook.cross[HOOK_STATIC + k], t, (st.hook.x[HOOK_STATIC + k] / COLS - 0.5) * 1.2));

  // ---- 1777 card ----
  sweep(T.hist - 0.05, 0.6, 500, 2600, 0.14);
  pen(T.hist + BEAT, 0.5);
  tock(T.stickLand, { vol: 0.35, freq: 900, body: 260 });
  pen(T.stickLand + 0.25, 0.5, 0.06);
  sweep(T.setup - 0.35, 0.5, 2600, 500, 0.12);

  // ---- set-up ----
  sweep(T.linesIn, 1.1, 800, 3000, 0.05, 2);
  sweep(T.ruleIn + 0.2, 0.5, 1200, 6000, 0.07, 3);
  bell(76, T.ruleIn + 0.75, { vol: 0.05 });
  bell(81, T.ruleIn + 1.2, { vol: 0.07 });
  bell(88, T.ruleIn + 1.2, { vol: 0.04, pan: 0.3 });
  DEMO_NEEDLES.forEach((n) => (n.cross ? bell(n.label ? 88 : PENTA[Math.floor(rand() * 6)], n.t, { vol: n.label ? 0.08 : 0.05 }) : tock(n.t, { vol: n.label ? 0.3 : 0.18 })));

  // ---- test: 1,000 needles ----
  sweep(T.test, BEAT, 3000, 300, 0.12);
  bell(84, T.test + 0.9, { vol: 0.06, decay: 1.5 }); // the "？"
  for (let i = 0; i < ANIMATED_NEEDLES; i++) ring(st.sim.cross[i], landTime(i), (st.sim.x[i] / COLS - 0.5) * 1.2, 0.85);
  rain(landTime(ANIMATED_NEEDLES - 1) + 0.04, T.testDrop1, (t) => logRate(t, T.testDrop0, T.testDrop1, 1, 1000), { gain: 0.8 });
  bell(81, T.theory, { vol: 0.06, decay: 1.6 });
  bell(88, T.theory, { vol: 0.035, decay: 1.6, pan: 0.3 });

  // ---- mystery ----
  sweep(T.mystery + 2.5, 1.0, 400, 2400, 0.06, 2); // dashed circle draws around π

  // ---- P1: two panels drop together ----
  const p1Land = (i) => logLand(i, T.p1Drop0, T.p1Drop1, 1, 1000);
  for (let i = 0; i < 30; i++) {
    const t = p1Land(i);
    ring(st.short.cross[i], t, -0.45, 0.7);
    if (st.long.cross[i] === 2) {
      bell(88, t + 0.02, { vol: 0.03, decay: 0.6, pan: 0.45 });
      bell(91, t + 0.09, { vol: 0.03, decay: 0.6, pan: 0.45 });
    } else ring(st.long.cross[i], t + 0.02, 0.45, 0.7);
  }
  const p1Rate = (t) => logRate(t, T.p1Drop0, T.p1Drop1, 1, 1000);
  rain(p1Land(29) + 0.04, T.p1Drop1, p1Rate, { gain: 0.6, pan: -0.5 });
  rain(p1Land(29) + 0.04, T.p1Drop1, p1Rate, { gain: 0.6, pan: 0.5 });
  bell(88, T.p1 + 3.5, { vol: 0.04, decay: 0.8, pan: 0.4 }); // "交点 2 个"
  bell(81, T.p1 + 6.4, { vol: 0.06, decay: 1.4 }); // ×2
  bell(93, T.p1 + 6.4, { vol: 0.035, decay: 1.4 });

  // ---- P2: one long needle, three drops ----
  sweep(T.p2 + 0.3, 0.5, 1200, 5000, 0.06, 3);
  const P2_HITS = [[1, 1], [1, 0], [0, 0]];
  T.p2Drops.forEach((t, k) => {
    const [a, b] = P2_HITS[k];
    if (a + b === 0) tock(t, { vol: 0.24 });
    if (a) bell(84, t, { vol: 0.06, decay: 0.9, pan: -0.25 });
    if (b) bell(88, t + 0.1, { vol: 0.06, decay: 0.9, pan: 0.25 });
  });

  // ---- P3: bend, pieces, noodles ----
  sweep(T.p3 + 0.2, 1.2, 300, 1500, 0.05, 4);
  sweep(T.p3 + 1.6, 1.2, 1500, 400, 0.05, 4);
  for (let j = 0; j < 8; j++) pluck(PENTA[j % 6] - 12, T.p3 + 3.0 + j * 0.12, { vol: 0.035, decay: 0.3, bright: 3000, pan: (j / 7 - 0.5) * 0.8 });
  const p3Land = (i) => logLand(i, T.p3bDrop0, T.p3bDrop1, 1, 1000);
  for (let i = 0; i < 30; i++) ring(st.noodles.cross[i], p3Land(i), 0.45, 0.7);
  rain(p3Land(29) + 0.04, T.p3bDrop1, (t) => logRate(t, T.p3bDrop0, T.p3bDrop1, 1, 1000), { gain: 0.6, pan: 0.5 });
  bell(81, T.p3bDrop1 + 0.3, { vol: 0.05, decay: 1.2 });

  // ---- P4: circles ----
  sweep(T.p4 + 0.2, 0.8, 600, 2400, 0.05, 2);
  pen(T.p4 + 1.0, 0.3, 0.04);
  T.circleDrops.forEach((t, j) => {
    const pan = (st.circles[j].x / 7.5 - 0.5) * 1.2;
    bell(84, t, { vol: 0.045, decay: 0.7, pan });
    bell(88, t + 0.08, { vol: 0.045, decay: 0.7, pan });
  });
  sweep(T.unroll, 1.6, 500, 4000, 0.06, 2);
  [0, 1, 2, 3].forEach((k) => tock(T.unroll + 1.6 + k * 0.07, { vol: 0.1, freq: 2600, body: 900 }));
  bell(93, T.unroll + 1.95, { vol: 0.05, decay: 1.5 });

  // ---- P5: conclusion ----
  bell(76, T.p5 + 0.2, { vol: 0.04 });
  bell(79, T.p5 + 1.4, { vol: 0.04 });
  bell(81, T.p5 + 3.4, { vol: 0.035 });
  impact(T.p5 + 4.6, 0.35, 90);
  bell(84, T.p5 + 4.6, { vol: 0.06, decay: 2 });
  bell(91, T.p5 + 4.6, { vol: 0.04, decay: 2, pan: 0.3 });
  sweep(T.p5 + 6.6, 0.8, 2000, 7000, 0.04, 3);
  bell(96, T.p5 + 7.2, { vol: 0.035, decay: 2 });

  // ---- flip ----
  sweep(T.flip + 0.2, 0.4, 600, 2400, 0.06);
  bell(81, T.flip + 1.4, { vol: 0.05, decay: 1.2 });
  riser(T.flip + BAR, T.exp - 0.02, 0.07);

  // ---- experiment: 1,000 -> 1,000,000 ----
  rain(T.expDrop0, T.expDrop1, (t) => logRate(t, T.expDrop0, T.expDrop1, 1000, 1_000_000), { gain: 1, bed: true });
  riser(T.expDrop1 - 2 * BEAT, T.reveal - 0.02, 0.1);

  // ---- reveal ----
  impact(T.reveal, 0.9);
  bell(84, T.reveal, { vol: 0.07, decay: 2.2 });
  bell(91, T.reveal, { vol: 0.05, decay: 2.2, pan: 0.3 });
  bell(88, T.reveal + BEAT / 2, { vol: 0.04, decay: 1.2, pan: -0.3 });
  bell(93, T.reveal + BEAT, { vol: 0.05, decay: 1.5 });

  // ---- twist ----
  pen(TW.digits + 0.4, 0.45, 0.05);
  [0, 1, 2].forEach((k) => tock(TW.table + 0.25 + k * 0.35, { vol: 0.12, freq: 2400, body: 700 }));
  impact(TW.table + 1.6, 0.3, 55);
  sweep(TW.card - 0.05, 0.6, 500, 2600, 0.12);
  pen(TW.pi + 0.2, 0.6, 0.06);
  impact(TW.zu, 0.75, 50);
  bell(69, TW.zu, { vol: 0.05, decay: 2.5 });
  bell(76, TW.zu + 0.05, { vol: 0.035, decay: 2.5, pan: 0.3 });
  bell(84, TW.ask + 0.4, { vol: 0.05, decay: 1.2 });

  // ---- outro ----
  [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach((dt, k) =>
    pluck([69, 72, 76, 77, 81, 84, 88, 89, 93][k], T.outro + dt, { vol: 0.04, decay: 0.9, bright: 3000, pan: (k / 8 - 0.5) * 0.6, send: 0.5 }),
  );
  bell(81, T.outro + BEAT * 1.5, { vol: 0.06, decay: 2 });
  bell(84, T.outro + BEAT * 3, { vol: 0.04, decay: 2, pan: -0.25 });

  // Needle rain: Poisson grains whose rate follows the real landing rate (capped), plus an
  // optional hiss bed that rises with it. Rendered into one buffer per call.
  function rainNow(t0, t1, rate, { gain = 1, pan = 0, bed = false } = {}) {
    if (t1 <= t0) return;
    const len = Math.ceil((t1 + 0.3 - t0) * sr);
    const rb = octx.createBuffer(2, len, sr);
    const L = rb.getChannelData(0);
    const R = rb.getChannelData(1);
    let t = t0;
    for (;;) {
      const r = Math.max(1, Math.min(rate(t), 900));
      t += -Math.log(1 - rand()) / r;
      if (t >= t1) break;
      const amp = gain * (0.09 / Math.sqrt(1 + r / 60)) * (0.4 + 0.6 * rand());
      const f = 2200 + rand() * 5000;
      const dec = 0.003 + rand() * 0.006;
      const p = Math.min(1, Math.max(0, 0.5 + pan * 0.5 + (rand() - 0.5) * 0.5));
      const s0 = Math.floor((t - t0) * sr);
      const n = Math.floor(dec * 6 * sr);
      for (let k = 0; k < n && s0 + k < len; k++) {
        const v = amp * Math.sin((2 * Math.PI * f * k) / sr) * Math.exp(-k / (dec * sr));
        L[s0 + k] += v * (1 - p);
        R[s0 + k] += v * p;
      }
    }
    if (bed) {
      let lpL = 0;
      let lpR = 0;
      for (let i = 0; i < len; i++) {
        const tt = t0 + i / sr;
        const level = 0.05 * gain * smooth(2.2, 5.5, Math.log10(Math.max(1, rate(Math.min(tt, t1))))) * (tt < t1 ? 1 : Math.exp(-(tt - t1) * 25));
        lpL += 0.35 * (rand() * 2 - 1 - lpL);
        lpR += 0.35 * (rand() * 2 - 1 - lpR);
        L[i] += lpL * level;
        R[i] += lpR * level;
      }
    }
    const src = octx.createBufferSource();
    src.buffer = rb;
    src.start(t0);
    out(src, { send: 0.2, end: t0 + len / sr });
  }

  // Create the first second of notes now, the rest one window ahead of the renderer.
  events.sort((a, b) => a.t - b.t);
  const WINDOW = 1;
  let next = 0;
  const flush = (until) => {
    while (next < events.length && events[next].t < until) events[next++].fn();
  };
  const reap = (now) => {
    live = live.filter((v) => {
      if (v.end >= now - 0.05) return true;
      for (const n of v.nodes) n.disconnect();
      return false;
    });
  };
  flush(WINDOW);
  const endT = Math.min(T.end, octx.length / sr);
  for (let w = WINDOW; w < endT; w += WINDOW) {
    octx.suspend(w).then(() => {
      reap(octx.currentTime);
      flush(w + WINDOW);
      octx.resume();
    });
  }
}

function impulse(octx, seconds, rand) {
  const sr = octx.sampleRate;
  const n = Math.floor(seconds * sr);
  const b = octx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr;
      lp += 0.5 * (rand() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-tt * 2.6) * (tt < 0.012 ? tt / 0.012 : 1);
    }
  }
  return b;
}
