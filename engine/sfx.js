// Sound-effects toolkit (Web Audio, all synthesised: no samples, nothing to license).
// From episode 06 the picture comes with its own effects track: a tick when a hole lands, a whoosh
// when a plane passes, a chime on the title, silence before a conclusion. The user lays music
// under it in 剪映, so nothing here is tonal enough to clash: short noises, soft bells, low drones.
//
//   const fx = createSfx(octx, { end, seed });
//   fx.tick(t); fx.bell(81, t); fx.whoosh(t, 0.8, 600, 3000); ...
//   fx.finish();   // must be called last: schedules the lazy note creation
//
// Notes are created lazily, one window ahead of the renderer (OfflineAudioContext.suspend/resume),
// and disconnected when they finish; building the whole graph up front makes long tracks render
// 50-100x slower (see engine/audio-bench.mjs).
import { mulberry32 } from './kit.js';

export const midi = (m) => 440 * 2 ** ((m - 69) / 12);

export function createSfx(octx, { end, seed = 1, reverb = 2.4, master = 1 } = {}) {
  const sr = octx.sampleRate;
  const rand = mulberry32(seed);

  const comp = octx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 8;
  comp.ratio.value = 3;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;
  comp.connect(octx.destination);
  const mix = octx.createGain();
  mix.gain.setValueAtTime(master, 0);
  mix.gain.setValueAtTime(master, Math.max(0, end - 1.2));
  mix.gain.linearRampToValueAtTime(0, end - 0.05);
  mix.connect(comp);
  const dry = octx.createGain();
  dry.connect(mix);
  const verb = octx.createConvolver();
  verb.buffer = impulse(octx, reverb, rand);
  const verbIn = octx.createGain();
  const verbOut = octx.createGain();
  verbOut.gain.value = 0.55;
  verbIn.connect(verb).connect(verbOut).connect(mix);

  const noise = octx.createBuffer(1, sr * 2, sr);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1;

  const events = [];
  let live = [];
  // Events before 0 are dropped (Web Audio rejects negative times); long sounds clamp their start.
  const at = (t, fn) => {
    if (t >= 0 && t < end) events.push({ t, fn });
  };

  const out = (node, { pan = 0, send = 0.25, gain = 1, stop = Infinity } = {}) => {
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
    live.push({ end: stop, nodes });
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
  const env = (t, peak, decay, attack = 0.003) => {
    const g = octx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  };

  // A short dry click: the "嗒" when a hole lands or a number ticks.
  function tick(t, { vol = 0.12, freq = 2600, pan = 0, body = 900, send = 0.08 } = {}) {
    at(t, () => {
      const bp = octx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 2.2;
      const g = env(t, vol, 0.022, 0.0008);
      noiseSrc(t, 0.04).connect(bp).connect(g);
      out(g, { pan, send, stop: t + 0.08 });
      const o = osc('sine', body, t, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(body * 0.55, t + 0.05);
      const g2 = env(t, vol * 0.45, 0.04, 0.0008);
      o.connect(g2);
      out(g2, { pan, send, stop: t + 0.08 });
    });
  }
  // A soft bell (inharmonic partials), for titles and reveals.
  function bell(m, t, { vol = 0.06, decay = 2.2, pan = 0, send = 0.5 } = {}) {
    at(t, () => {
      const f = midi(m);
      for (const [r, a, dd] of [[1, 1, 1], [2.76, 0.4, 0.55], [5.4, 0.2, 0.3], [8.93, 0.08, 0.18]]) {
        const g = env(t, vol * a, decay * dd, 0.003);
        osc('sine', f * r, t, t + decay * dd + 0.05).connect(g);
        out(g, { pan, send, stop: t + decay * dd + 0.05 });
      }
    });
  }
  // Filtered-noise sweep: planes passing, cards sliding, dissolves.
  function whoosh(t, dur, f0, f1, { vol = 0.1, q = 1.1, pan = 0, pan1 = null, send = 0.3 } = {}) {
    if (t < 0) {
      // Already under way at the first frame: keep the part after 0.
      const cut = -t / dur;
      f0 *= (f1 / f0) ** cut;
      dur += t;
      t = 0;
      if (dur < 0.05) return;
    }
    at(t, () => {
      const bp = octx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t);
      bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = octx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      const p = octx.createStereoPanner();
      p.pan.setValueAtTime(pan, t);
      if (pan1 !== null) p.pan.linearRampToValueAtTime(pan1, t + dur);
      noiseSrc(t, dur).connect(bp).connect(g).connect(p);
      out(p, { send, stop: t + dur + 0.05 });
    });
  }
  // Low thud with a little noise on top: something lands, a stamp, the flash into a title.
  function impact(t, { vol = 0.5, low = 62, decay = 1.4 } = {}) {
    at(t, () => {
      const o = osc('sine', low, t, t + decay + 0.4);
      o.frequency.setValueAtTime(low, t);
      o.frequency.exponentialRampToValueAtTime(low * 0.45, t + decay);
      const g = env(t, vol, decay, 0.004);
      o.connect(g);
      out(g, { send: 0.15, stop: t + decay + 0.4 });
      const lp = octx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + 0.5);
      const g2 = env(t, vol * 0.35, 0.55, 0.002);
      noiseSrc(t, 0.6).connect(lp).connect(g2);
      out(g2, { send: 0.5, stop: t + 0.7 });
    });
  }
  // Rising filtered noise into a moment (ends exactly at t1).
  function riser(t0, t1, { vol = 0.07 } = {}) {
    at(t0, () => {
      const bp = octx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.3;
      bp.frequency.setValueAtTime(300, t0);
      bp.frequency.exponentialRampToValueAtTime(6500, t1);
      const g = octx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t1);
      g.gain.linearRampToValueAtTime(0, t1 + 0.03);
      noiseSrc(t0, t1 - t0).connect(bp).connect(g);
      out(g, { send: 0.35, stop: t1 + 0.1 });
    });
  }
  // A slow swell on a soft chord (sine pairs, slightly detuned), for "something unseen appears".
  function swell(ms, t0, t1, { vol = 0.025, release = 1.2, send = 0.6 } = {}) {
    at(t0, () => {
      for (const m of ms) {
        for (const det of [-5, 5]) {
          const o = osc('sine', midi(m), t0, t1 + release + 0.1);
          o.detune.value = det;
          const g = octx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(vol, t1);
          g.gain.linearRampToValueAtTime(0, t1 + release);
          o.connect(g);
          out(g, { pan: det / 10, send, stop: t1 + release + 0.1 });
        }
      }
    });
  }
  // A bed: low sine plus breathy noise, faded in and out. `duck` = [[t0, t1], ...] spans of silence.
  function bed(t0, t1, { m = 33, vol = 0.05, air = 0.012, duck = [] } = {}) {
    at(t0, () => {
      const g = octx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(1, t0 + 1.2);
      for (const [a, b] of duck) {
        g.gain.setValueAtTime(1, Math.max(t0, a - 0.15));
        g.gain.linearRampToValueAtTime(0, a);
        g.gain.setValueAtTime(0, b);
        g.gain.linearRampToValueAtTime(1, b + 0.4);
      }
      g.gain.setValueAtTime(1, Math.max(t0, t1 - 1.0));
      g.gain.linearRampToValueAtTime(0, t1);
      const o = osc('sine', midi(m), t0, t1 + 0.1);
      const go = octx.createGain();
      go.gain.value = vol;
      o.connect(go).connect(g);
      const o2 = osc('sine', midi(m + 7), t0, t1 + 0.1);
      const go2 = octx.createGain();
      go2.gain.value = vol * 0.35;
      o2.connect(go2).connect(g);
      const lp = octx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const gn = octx.createGain();
      gn.gain.value = air;
      noiseSrc(t0, t1 - t0).connect(lp).connect(gn).connect(g);
      out(g, { send: 0.3, stop: t1 + 0.2 });
    });
  }
  // Distant propeller drone: a buzzy low tone, amplitude-modulated, through a lowpass.
  function hum(t0, t1, { vol = 0.04, f = 58, rate = 11, pan = 0 } = {}) {
    at(t0, () => {
      const o = osc('sawtooth', f, t0, t1 + 0.1);
      const lp = octx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const am = octx.createGain();
      am.gain.value = 0.65;
      const lfo = osc('sine', rate, t0, t1 + 0.1);
      const depth = octx.createGain();
      depth.gain.value = 0.35;
      lfo.connect(depth).connect(am.gain);
      const g = octx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + Math.min(1.5, (t1 - t0) / 3));
      g.gain.setValueAtTime(vol, Math.max(t0, t1 - 1.2));
      g.gain.linearRampToValueAtTime(0, t1);
      o.connect(lp).connect(am).connect(g);
      out(g, { pan, send: 0.25, stop: t1 + 0.2 });
    });
  }
  // Typewriter: n clicks at `rate` per second, with a soft bell at the end of the line.
  function typewriter(t, n, { rate = 16, vol = 0.09, pan = 0.1 } = {}) {
    for (let k = 0; k < n; k++) {
      tick(t + k / rate + (rand() - 0.5) * 0.012, { vol: vol * (0.75 + 0.5 * rand()), freq: 1800 + rand() * 900, body: 420, pan, send: 0.05 });
    }
  }
  // Many ticks rendered into one buffer: rate(t) per second (capped), quieter as it gets denser.
  function rain(t0, t1, rate, { gain = 1, pan = 0, spread = 0.6, f0 = 1800, f1 = 6000 } = {}) {
    if (t1 <= t0) return;
    at(t0, () => {
      const len = Math.ceil((t1 + 0.2 - t0) * sr);
      const rb = octx.createBuffer(2, len, sr);
      const L = rb.getChannelData(0);
      const R = rb.getChannelData(1);
      let t = t0;
      for (;;) {
        const r = Math.max(0.5, Math.min(rate(t), 600));
        t += -Math.log(1 - rand()) / r;
        if (t >= t1) break;
        const amp = gain * (0.1 / Math.sqrt(1 + r / 40)) * (0.45 + 0.55 * rand());
        const f = f0 + rand() * (f1 - f0);
        const dec = 0.002 + rand() * 0.004;
        const p = Math.min(1, Math.max(0, 0.5 + pan * 0.5 + (rand() - 0.5) * spread));
        const s0 = Math.floor((t - t0) * sr);
        const n = Math.floor(dec * 6 * sr);
        for (let k = 0; k < n && s0 + k < len; k++) {
          const v = amp * Math.sin((2 * Math.PI * f * k) / sr) * Math.exp(-k / (dec * sr));
          L[s0 + k] += v * (1 - p);
          R[s0 + k] += v * p;
        }
      }
      const src = octx.createBufferSource();
      src.buffer = rb;
      src.start(t0);
      out(src, { send: 0.15, stop: t0 + len / sr });
    });
  }

  function finish() {
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
    const endT = Math.min(end, octx.length / sr);
    for (let w = WINDOW; w < endT; w += WINDOW) {
      octx.suspend(w).then(() => {
        reap(octx.currentTime);
        flush(w + WINDOW);
        octx.resume();
      });
    }
  }

  return { tick, bell, whoosh, impact, riser, swell, bed, hum, typewriter, rain, finish, rand };
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
      d[i] = lp * Math.exp(-tt * 2.8) * (tt < 0.01 ? tt / 0.01 : 1);
    }
  }
  return b;
}
