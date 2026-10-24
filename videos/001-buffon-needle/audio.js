// Soundtrack for 001, synthesised entirely with Web Audio (no samples, no licences needed).
// 100 BPM, A minor. Every sound effect is scheduled from the same data the visuals use.
import { mulberry32, smooth } from '../../engine/kit.js';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = {
  Am: { bass: 33, pad: [57, 60, 64, 71], arp: [69, 72, 76, 79] },
  F: { bass: 29, pad: [57, 60, 65, 64], arp: [65, 69, 72, 76] },
  C: { bass: 36, pad: [55, 60, 64, 74], arp: [67, 72, 76, 79] },
  G: { bass: 31, pad: [55, 59, 62, 69], arp: [67, 71, 74, 79] },
  E: { bass: 28, pad: [56, 59, 64, 68], arp: [68, 71, 76, 80] },
  Fmaj7: { bass: 29, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] },
};
const PENTA = [81, 84, 86, 88, 91, 93]; // A5 C6 D6 E6 G6 A6 — crossing needles "ring" in key

export async function buildAudio(octx, d) {
  const { T, BEAT, BAR, sim, hook, DEMO_NEEDLES, hookDropTimes, HOOK_STATIC, ANIMATED, landTime } = d;
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
  master.gain.setValueAtTime(1, T.end - 0.9);
  master.gain.linearRampToValueAtTime(0, T.end);
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

  const out = (node, { pan = 0, send = 0.25, gain = 1 } = {}) => {
    const g = octx.createGain();
    g.gain.value = gain;
    const p = octx.createStereoPanner();
    p.pan.value = pan;
    node.connect(g).connect(p);
    p.connect(dry);
    if (send > 0) {
      const s = octx.createGain();
      s.gain.value = send;
      p.connect(s).connect(verbIn);
    }
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
  function pad(chord, t0, t1, { vol = 0.035, cutoff = 1400, attack = 0.5, release = 0.9 } = {}) {
    for (const [k, m] of CHORDS[chord].pad.entries()) {
      for (const det of [-7, 7]) {
        const o = osc('sawtooth', midi(m), t0, t1 + release + 0.1);
        o.detune.value = det + (rand() - 0.5) * 4;
        const f = octx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cutoff * 0.6, t0);
        f.frequency.linearRampToValueAtTime(cutoff, t0 + attack * 2);
        f.Q.value = 0.6;
        const g = octx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + attack);
        g.gain.setValueAtTime(vol, t1);
        g.gain.linearRampToValueAtTime(0, t1 + release);
        o.connect(f).connect(g);
        out(g, { pan: (k / 3 - 0.5) * 0.8 * Math.sign(det), send: 0.4 });
      }
    }
  }
  function bass(chord, t0, t1, vol = 0.22) {
    const o = osc('sine', midi(CHORDS[chord].bass + 12), t0, t1 + 0.4);
    const o2 = osc('triangle', midi(CHORDS[chord].bass + 12), t0, t1 + 0.4);
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.04);
    g.gain.setValueAtTime(vol, t1 - 0.05);
    g.gain.linearRampToValueAtTime(0, t1 + 0.3);
    const g2 = octx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    out(g, { send: 0 });
  }
  function pluck(m, t, { vol = 0.1, decay = 0.55, bright = 3500, pan = 0, send = 0.35 } = {}) {
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
    out(g, { pan, send });
  }
  function bell(m, t, { vol = 0.08, decay = 1.2, pan = 0, send = 0.45 } = {}) {
    const f = midi(m);
    [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.25, 0.35], [8.93, 0.12, 0.2]].forEach(([r, a, dd]) => {
      const g = decayGain(t, vol * a, decay * dd, 0.002);
      osc('sine', f * r, t, t + decay * dd + 0.05).connect(g);
      out(g, { pan, send });
    });
  }
  function tock(t, { vol = 0.25, freq = 1700, pan = 0, body = 520 } = {}) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 2.5;
    const g = decayGain(t, vol, 0.035, 0.001);
    noiseSrc(t, 0.06).connect(bp).connect(g);
    out(g, { pan, send: 0.12 });
    const o = osc('sine', body, t, t + 0.12);
    o.frequency.setValueAtTime(body, t);
    o.frequency.exponentialRampToValueAtTime(body * 0.6, t + 0.08);
    const g2 = decayGain(t, vol * 0.6, 0.07, 0.001);
    o.connect(g2);
    out(g2, { pan, send: 0.1 });
  }
  function kick(t, vol = 0.55) {
    const o = osc('sine', 150, t, t + 0.45);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    const g = decayGain(t, vol, 0.38, 0.002);
    o.connect(g);
    out(g, { send: 0.03 });
  }
  function hat(t, vol = 0.06, pan = 0.2) {
    const hp = octx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = decayGain(t, vol, 0.045, 0.001);
    noiseSrc(t, 0.08).connect(hp).connect(g);
    out(g, { pan, send: 0.05 });
  }
  function sweep(t, dur, f0, f1, vol = 0.12, q = 1.2, pan = 0) {
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
    out(g, { pan, send: 0.3 });
  }
  function riser(t0, t1, vol = 0.12) {
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
    out(g, { send: 0.35 });
  }
  function impact(t, vol = 0.8) {
    const o = osc('sine', 70, t, t + 2);
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.5);
    const g = decayGain(t, vol, 1.6, 0.004);
    o.connect(g);
    out(g, { send: 0.15 });
    const lp = octx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
    const g2 = decayGain(t, vol * 0.5, 0.7, 0.002);
    noiseSrc(t, 0.8).connect(lp).connect(g2);
    out(g2, { send: 0.6 });
  }
  function pen(t, dur, vol = 0.05) {
    const bp = octx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3800;
    bp.Q.value = 1.8;
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k < dur * 30; k++) g.gain.setValueAtTime(vol * (0.4 + 0.6 * rand()), t + k / 30);
    g.gain.setValueAtTime(0, t + dur);
    noiseSrc(t, dur).connect(bp).connect(g);
    out(g, { pan: 0.15, send: 0.15 });
  }

  // ---- music ----
  const bars = ['Am', 'Am', 'F', 'C', 'G', 'F', 'Am', 'F', 'G', 'C', 'Fmaj7'];
  bars.forEach((ch, b) => {
    const t0 = b * BAR;
    if (b === 5) {
      pad('F', t0, t0 + 2 * BEAT, { cutoff: 1600 });
      pad('E', t0 + 2 * BEAT, t0 + BAR, { cutoff: 1800, attack: 0.3 });
      bass('F', t0, t0 + 2 * BEAT);
      bass('E', t0 + 2 * BEAT, t0 + BAR);
    } else if (b === 0) {
      pad('Am', t0, t0 + BAR, { attack: 0.05, cutoff: 900, vol: 0.03 });
      bass('Am', t0, t0 + BAR, 0.2);
    } else if (b === 9) {
      pad('C', t0, t0 + BAR, { attack: 0.02, cutoff: 2600, vol: 0.045 });
      bass('C', t0, t0 + BAR, 0.24);
    } else if (b === 10) {
      pad('Fmaj7', t0, T.end - 0.8, { attack: 0.4, cutoff: 1500, release: 0.8 });
      bass('Fmaj7', t0, T.end - 1.0, 0.16);
    } else {
      pad(ch, t0, t0 + BAR, { cutoff: b >= 6 ? 2200 : 1300 });
      bass(ch, t0, t0 + BAR, b >= 6 ? 0.24 : 0.18);
    }
    // Arpeggios: music-box 8ths for bars 1-5, brighter 16ths for the experiment.
    const arpChord = b === 5 ? null : ch;
    if (b >= 1 && b <= 5) {
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
      pattern.forEach((p, k) => {
        const chName = b === 5 ? (k < 4 ? 'F' : 'E') : arpChord;
        pluck(CHORDS[chName].arp[p], t0 + k * (BEAT / 2), { vol: 0.07, bright: 2600, pan: (p - 1.5) * 0.25 });
      });
    }
    if (b >= 6 && b <= 8) {
      const pattern = [0, 2, 1, 3, 2, 0, 3, 1, 0, 2, 1, 3, 2, 3, 1, 2];
      pattern.forEach((p, k) => {
        if (b === 8 && k >= 14) return;
        pluck(CHORDS[ch].arp[p] - (k % 4 === 0 ? 12 : 0), t0 + k * (BEAT / 4), { vol: 0.065, decay: 0.3, bright: 4200, pan: (p - 1.5) * 0.3, send: 0.25 });
      });
    }
  });

  // Drums: hook pulse, then the experiment groove (drops out on the last beat before the reveal).
  for (let k = 0; k < 4; k++) kick(k * BEAT, k === 0 ? 0.7 : 0.45);
  for (let b = 6; b <= 8; b++) {
    for (let k = 0; k < 4; k++) {
      const t = b * BAR + k * BEAT;
      if (b === 8 && k === 3) continue;
      kick(t, 0.5);
      if (b >= 7) hat(t + BEAT / 2, 0.05, k % 2 ? 0.25 : -0.25);
    }
  }
  impact(0, 0.55);
  bell(81, BEAT, { vol: 0.06, decay: 1.6 }); // glint on "π" in the title
  bell(88, BEAT, { vol: 0.04, decay: 1.6, pan: 0.3 });

  // ---- sound effects tied to visuals ----
  const ring = (cross, t, pan) =>
    cross ? bell(PENTA[Math.floor(rand() * PENTA.length)], t, { vol: 0.045, decay: 0.8, pan }) : tock(t, { vol: 0.14, pan });

  hookDropTimes.forEach((t, k) => ring(hook.cross[HOOK_STATIC + k], t, (hook.x[HOOK_STATIC + k] / 14.8 - 0.5) * 1.2));

  sweep(T.hist - 0.05, 0.6, 500, 2600, 0.14); // card slides in
  pen(T.hist + BEAT, 0.5); // underline under the date
  tock(T.hist + 4 * BEAT, { vol: 0.35, freq: 900, body: 260 }); // stick lands on the planks
  pen(T.hist + 4 * BEAT + 0.25, 0.5, 0.06); // ink circle
  sweep(T.rule - 0.35, 0.5, 2600, 500, 0.12); // card leaves

  sweep(T.rule + 0.2, 0.5, 1200, 6000, 0.07, 3); // needle grows
  bell(76, T.rule + 0.7, { vol: 0.05 });
  bell(81, T.rule + 1.2, { vol: 0.07 }); // "针长 = 线距"
  bell(88, T.rule + 1.2, { vol: 0.04, pan: 0.3 });

  DEMO_NEEDLES.forEach((n) => (n.cross ? bell(n.label ? 88 : PENTA[Math.floor(rand() * 6)], n.t, { vol: n.label ? 0.08 : 0.05 }) : tock(n.t, { vol: n.label ? 0.3 : 0.18 })));

  bell(76, T.formula + 0.1, { vol: 0.05, decay: 1.6 });
  bell(81, T.formula + 1.1, { vol: 0.06, decay: 1.6 });
  riser(T.formula + BEAT, T.exp, 0.08);
  sweep(T.exp, BEAT, 3000, 300, 0.16); // camera pulls back

  for (let i = 0; i < ANIMATED; i++) ring(sim.cross[i], landTime(i), (sim.x[i] / 14.8 - 0.5) * 1.2);

  // Needle rain after the first 40: Poisson grains whose rate follows the real landing rate, plus
  // a hiss bed that rises with it, cutting off when the millionth needle lands.
  const rainStart = landTime(ANIMATED - 1) + 0.05;
  const rate = (t) => Math.LN10 * 10 ** (t - T.n0);
  const len = Math.ceil((T.n1 + 0.3 - rainStart) * sr);
  const rb = octx.createBuffer(2, len, sr);
  const L = rb.getChannelData(0);
  const R = rb.getChannelData(1);
  let t = rainStart;
  while (true) {
    const r = Math.min(rate(t), 900);
    t += -Math.log(1 - rand()) / r;
    if (t >= T.n1) break;
    const amp = (0.09 / Math.sqrt(1 + r / 60)) * (0.4 + 0.6 * rand());
    const f = 2200 + rand() * 5000;
    const dec = 0.003 + rand() * 0.006;
    const pan = rand();
    const s0 = Math.floor((t - rainStart) * sr);
    const n = Math.floor(dec * 6 * sr);
    for (let k = 0; k < n && s0 + k < len; k++) {
      const v = amp * Math.sin((2 * Math.PI * f * k) / sr) * Math.exp(-k / (dec * sr));
      L[s0 + k] += v * (1 - pan);
      R[s0 + k] += v * pan;
    }
  }
  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < len; i++) {
    const tt = rainStart + i / sr;
    const level = 0.05 * smooth(2.2, 5.5, Math.log10(rate(tt))) * (tt < T.n1 ? 1 : Math.exp(-(tt - T.n1) * 25));
    lpL += 0.35 * (rand() * 2 - 1 - lpL);
    lpR += 0.35 * (rand() * 2 - 1 - lpR);
    L[i] += lpL * level;
    R[i] += lpR * level;
  }
  const rs = octx.createBufferSource();
  rs.buffer = rb;
  rs.start(rainStart);
  out(rs, { send: 0.2 });
  riser(T.n1 - 2 * BEAT, T.reveal - 0.02, 0.1);

  // Reveal and outro accents.
  impact(T.reveal, 0.9);
  bell(84, T.reveal, { vol: 0.07, decay: 2.2 });
  bell(91, T.reveal, { vol: 0.05, decay: 2.2, pan: 0.3 });
  bell(88, T.reveal + BEAT / 2, { vol: 0.04, decay: 1.2, pan: -0.3 });
  bell(93, T.reveal + BEAT, { vol: 0.05, decay: 1.5 });
  [0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87, 0.99, 1.11].forEach((dt, k) =>
    pluck([69, 72, 76, 77, 81, 84, 88, 89, 93][k], T.outro + dt, { vol: 0.045, decay: 0.9, bright: 3000, pan: (k / 8 - 0.5) * 0.6, send: 0.5 }),
  );
  bell(81, T.outro + BEAT * 1.5, { vol: 0.06, decay: 2 });
  bell(84, T.outro + BEAT * 2, { vol: 0.04, decay: 2, pan: -0.25 });
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
