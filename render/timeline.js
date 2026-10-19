// The whole song as data: which scene is on screen, every visual parameter as a keyframed curve,
// the camera per segment, and what the text layer should show. Times are song seconds and come
// from data/lyrics_timing.json (ASR-aligned) and the 91 BPM beat grid.

export const FPS = 24;
export const SONG = { start: 0, end: 198.25 };
export const SC = { LETTER: 0, ARLES: 1, NIGHT: 2, CROWS: 3, GRAVE: 4, LETTERS: 5, MODERN: 6 };

const ease = { lin: (x) => x, io: (x) => x * x * (3 - 2 * x), out: (x) => 1 - (1 - x) * (1 - x), in: (x) => x * x };
export function curve(keys) {   // keys: [time, value, easeIntoThisKey]
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e = 'io'] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) return v0 + (v1 - v0) * ease[e]((t - t0) / Math.max(1e-6, t1 - t0));
    }
    return keys[keys.length - 1][1];
  };
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// [start, scene, transition seconds (0 = hard cut), transition centre in screen coords]
const SCHED = [
  [0, SC.LETTER, 0], [12.40, SC.ARLES, 0], [33.22, SC.NIGHT, 0], [78.04, SC.CROWS, 0],
  [83.22, SC.GRAVE, 1.8, [0, 0.05]], [95.85, SC.NIGHT, 0], [120.2, SC.LETTERS, 1.6, [0, -0.3]],
  [137.05, SC.MODERN, 0], [146.47, SC.NIGHT, 0], [153.6, SC.LETTER, 0], [161.8, SC.NIGHT, 2.4, [0.0, -0.05]],
  [186.0, SC.LETTER, 0],
];
// render chains start where the picture hard-cuts or is black, so stroke state can restart unseen
export const CHAIN_STARTS = [0, 12.40, 26.56, 78.04, 95.85, 137.05, 153.6, 186.0];

export function sceneState(t) {
  let i = 0; while (i + 1 < SCHED.length && SCHED[i + 1][0] <= t) i++;
  const [t0, b, dur, c = [0, 0]] = SCHED[i], a = i > 0 ? SCHED[i - 1][1] : b;
  const mix = dur > 0 ? clamp01((t - t0) / dur) : 1;
  return { a, b, mix, mixC: c, start: t0, cut: Math.abs(t - t0) < 0.5 / FPS && dur === 0 };
}

// beats: band playing? (pulses off where the beat drops out / piano only)
const BAND = [[12.4, 83.0, 1], [95.8, 120.0, 1], [137.0, 152.5, 1], [164.0, 178.5, 2]];
export function beatPulse(t, g) {
  const on = BAND.find(([a, b]) => t >= a && t < b); if (!on) return { pulse: 0, down: false };
  const bl = g.beat_sec / on[2], b = (t - g.first_beat_sec) / bl, k = Math.floor(b), dt = (b - k) * bl;
  const down = ((k % (4 * on[2])) + 4 * on[2]) % (4 * on[2]) === 0;
  return { pulse: Math.exp(-dt * 7) * (down ? 1.0 : 0.55), down };
}

// ------------------------------------------------------------------ parameter curves (whole song)
const P = {
  uSun: curve([[33.2, 1], [35.05, 1], [37.2, 0, 'in']]),
  uSwirl: curve([[34.6, 0.55], [37, 1], [44.4, 1], [45.4, 1.55], [47.2, 1.45], [48.5, 1.15], [56.5, 1.1], [58.5, 0.8], [66, 0.75], [71.3, 0.75], [72.2, 1.15], [74.0, 1.15], [74.6, 0.45], [75.3, 0.45], [76.0, 1.7, 'out'], [78, 1.6], [95.8, 1.6], [96.5, 1.1], [105.2, 1.1], [105.8, 1.5], [108.5, 1.25], [120, 1.0], [137, 1.0], [146.4, 1.2], [152, 1.2], [162, 1.0], [166, 1.8], [172, 2.2], [178, 2.5]]),
  uTurb: curve([[34.6, 0.5], [37, 0.35], [44.5, 0.35], [45.6, 1.5], [47.3, 1.2], [49, 0.55], [57.5, 0.4], [62, 0.25], [74, 0.25], [74.6, 0.1], [75.3, 0.1], [76, 0.9], [78, 0.6], [95.8, 0.5], [105.3, 0.5], [106, 1.4], [108, 0.8], [112, 0.5], [146, 0.6], [164, 0.6], [170, 1.0], [178, 1.3]]),
  uYellow: curve([[34.6, 0.6], [37, 0.15], [37.7, 0.15], [38.7, 1, 'out'], [40.2, 0.45], [50, 0.45], [52.5, 0.7], [57.4, 0.6], [59, 0.15], [75.3, 0.15], [76, 0.9], [78, 0.8], [95.8, 0.5], [98.4, 1.0], [100, 0.6], [146, 0.6], [164, 0.7], [170, 1.0]]),
  uMany: curve([[42.6, 0], [44.2, 1, 'out'], [47, 0.7], [52.7, 0.6], [57.3, 0.55], [59.5, 0.3], [63, 0.25], [75.3, 0.25], [76, 0.7], [78, 0.7], [95.8, 0.3], [103.2, 0.3], [104.6, 1.0, 'out'], [110, 0.8], [120, 0.6], [137, 0.5], [146, 0.6], [164, 0.6], [170, 1.0]]),
  uStarGlow: curve([[34.6, 0.6], [36.5, 0.9], [47.1, 0.9], [47.8, 1.35, 'out'], [49.9, 1.2], [57.3, 1.1], [60, 0.9], [74, 0.9], [74.6, 0.5], [75.3, 0.5], [76, 1.3], [78, 1.2], [95.8, 1.1], [107.9, 1.1], [108.6, 1.5, 'out'], [112, 1.2], [146, 1.0], [164, 1.1], [176, 1.6]]),
  uBright: curve([[34.6, 1], [50, 1], [52.4, 1.9, 'out'], [55.5, 1.6], [59.9, 1.5], [61.8, 0.55], [71, 0.55], [76, 1.2], [95.8, 1.2], [110.6, 1.2], [113, 2.0], [118, 1.6], [146, 1.0], [150.4, 1.0], [151, 2.2, 'out'], [152.5, 2.0], [162, 1.0], [170, 1.6], [176, 2.6], [178.5, 3.4, 'in']]),
  uMoon: curve([[34.6, 0], [36.4, 0.9], [62.5, 0.9], [63.4, 0], [72.8, 0], [73.6, 1.0, 'out']]),
  uGround: () => 1,
  uVillage: curve([[34.6, 0], [36.4, 1]]),
  uCypress: curve([[34.6, 0], [36.4, 1], [62.5, 1], [63.4, 0], [71.3, 0], [72.0, 1, 'out']]),
  uFlame: curve([[71.3, 0], [71.8, 1.2, 'out'], [74, 1.0], [74.6, 0.2], [75.3, 0.2], [76, 1.0], [78, 0.6], [95, 0.2], [164, 0.3], [172, 1.0]]),
  uFigure: curve([[39.8, 0], [40.4, 1], [52.8, 1], [54.5, 0]]),
  uCold: curve([[57.2, 0], [59.2, 1, 'out'], [71.3, 1], [72.5, 0.3], [76, 0]]),
  uWall: curve([[62.4, 0], [63.45, 1, 'out'], [71.36, 1], [72.1, 0, 'in']]),
  uWallPan: curve([[68.7, 0], [69.3, 1.3, 'out'], [69.9, 1.3], [70.3, 0, 'out']]),
  uBars: curve([[63.40, 0], [63.70, 1, 'out'], [64.70, 1], [65.00, 2, 'out'], [65.35, 2], [65.65, 3, 'out'], [66.05, 3], [66.45, 4, 'out'], [71.3, 4], [71.7, 0, 'in']]),
  uCut: curve([[67.40, 0], [68.10, 1, 'out'], [68.7, 1], [69.3, 0]]),
  uGallery: curve([[97.2, 0], [100.6, 1], [110.5, 1], [112.8, 0, 'in']]),
  uCrowd: curve([[103.1, 0], [104.0, 1, 'out'], [110.4, 1], [111.5, 0]]),
  uFlash: curve([[103.3, 0], [103.6, 1], [110.5, 1], [111, 0]]),
  uBigFig: curve([[147.4, 0], [148.3, 0.9], [150.3, 0.9], [150.8, 0]]),
  heart: curve([[147.4, 0], [147.6, 1], [150.3, 1], [150.6, 0]]),
  uCrows: curve([[78.0, 0.1], [80.5, 0.25], [82.8, 1.0, 'in']]),
  uStorm: curve([[78, 0], [80.5, 0.2], [83, 1.0]]),
  uDrain: curve([[82.9, 0], [83.7, 1], [88.3, 1], [89.0, 0.55], [95.8, 0.55], [95.85, 0]]),
  uDot1: curve([[83.9, 0], [84.1, 1, 'out'], [84.9, 0.8], [85.6, 0]]),
  uDot2: curve([[85.7, 0], [86.3, 0.9], [87.6, 0.7], [88.3, 0]]),
  uStones: curve([[88.4, 0], [89.6, 1, 'out']]),
  uIvy: curve([[90.8, 0], [95.3, 1]]),
  uPaint: curve([[127.3, 0], [128.3, 1], [129.6, 1], [130.3, 0.3]]),
  uDim: curve([[129.7, 0], [130.5, 1], [132.0, 1], [132.6, 0.5], [134.7, 0.8]]),
  uPair: curve([[132.0, 0], [132.5, 1.2, 'out']]),
  uLink: curve([[132.3, 0], [133.6, 1]]),
  uCandle: curve([[0, 0], [3.6, 1], [185.9, 1], [186, 0], [188.6, 0], [190.4, 1, 'out']]),
  uSketch: curve([[6.4, 0], [11.5, 1]]),
  speedMul: curve([[74.0, 1], [74.4, 0.3], [75.3, 0.3], [75.5, 1], [83.0, 1], [84, 0.45], [95.8, 0.45], [95.85, 1], [120.2, 1], [121.5, 0.7], [137, 0.7], [137.05, 1], [140.45, 1], [140.5, 0], [141.05, 0], [141.15, 1]]),
  strokeScale: curve([[146.4, 1], [146.47, 2.0], [147.3, 2.0], [147.6, 1.0], [150.4, 1.0], [150.6, 1.6], [152.5, 1.6], [152.6, 1]]),
  fade: curve([[0, 0], [1.2, 1], [152.6, 1], [153.6, 0.0], [154.6, 1], [178.6, 1], [181.5, 0], [188.4, 0], [190.2, 1], [197.8, 1], [198.25, 0]]),
  white: curve([[176.5, 0], [178.6, 0.85, 'in'], [179.2, 0.85], [181.5, 0, 'out']]),
};

// ------------------------------------------------------------------ camera: [cx, cy, zoom, rot] per segment
const camSeg = (keys) => { const c = [0, 1, 2, 3].map((k) => curve(keys.map((r) => [r[0], r[1 + k], r[5]]))); return (t) => c.map((f) => f(t)); };
const CAM = [
  // intro: pulled back far enough that a strip of dark desk shows under the letter for the Theo caption
  [0, camSeg([[0, 0.0, -0.105, 1.0, -0.012], [10.0, 0.05, -0.095, 1.03, -0.004], [11.4, 0.22, -0.03, 1.9, 0.0], [12.4, 0.30, -0.03, 3.4, 0.02, 'in']])],
  [12.40, 'arles'],
  [33.22, camSeg([[33.2, 0.20, 0.08, 1.12, -0.05], [34.5, 0.20, 0.08, 1.15, -0.05], [36.5, 0.02, 0.17, 1.22, 0.035], [40.2, -0.05, 0.18, 1.10, -0.02], [42.5, 0.15, -0.10, 1.75, 0.0], [44.4, 0.02, 0.14, 0.98, 0.02], [47.2, -0.06, 0.16, 1.08, -0.03], [49.9, 0.16, 0.24, 1.15, 0.0], [52.6, 0.31, 0.355, 2.7, 0.07, 'in'], [55.6, 0.02, 0.07, 0.93, 0.0, 'out'], [59.9, 0.0, 0.09, 0.97, 0.0], [62.3, 0.02, 0.12, 1.0, 0.0], [69.3, 0.0, 0.14, 1.06, -0.01], [71.3, 0.0, 0.14, 1.08, 0.0], [72.1, 0.0, 0.16, 1.28, 0.0], [75.4, 0.05, 0.15, 1.1, 0.02], [78.0, 0.0, 0.15, 1.0, 0.0]])],
  [78.04, camSeg([[78.04, 0.0, 0.05, 1.0, 0.0], [83.2, 0.0, 0.12, 1.25, 0.02]])],
  [83.22, camSeg([[83.22, 0.0, 0.12, 1.25, 0.02], [86, 0.0, 0.06, 1.45, 0.0], [88.45, 0.0, 0.06, 1.45, 0.0], [88.5, 0.0, -0.06, 1.5, 0.0], [95.8, 0.0, -0.03, 1.25, 0.0]])],
  [95.85, camSeg([[95.85, 0.05, 0.25, 1.5, 0.03], [97.2, 0.0, 0.20, 1.3, 0.0], [100.6, 0.0, 0.10, 0.98, 0.0], [110.5, 0.0, 0.10, 0.98, 0.0], [112.8, 0.31, 0.355, 2.4, 0.05, 'in'], [115.5, 0.05, 0.08, 0.95, 0.0, 'out'], [120.2, 0.0, 0.12, 1.05, 0.0]])],
  [120.2, camSeg([[120.2, 0.0, 0.12, 1.05, 0.0], [123, 0.0, -0.05, 1.0, 0.0], [131, 0.0, 0.10, 1.05, 0.0], [134.7, 0.0, 0.27, 1.6, 0.0], [137, 0.0, 0.28, 1.8, 0.0]])],
  [137.05, 'modern'],
  [146.47, camSeg([[146.47, 0.25, 0.30, 4.0, 0.0], [147.45, 0.28, 0.32, 4.4, 0.03], [147.6, 0.30, 0.33, 3.0, 0.0, 'out'], [150.45, 0.31, 0.35, 2.6, 0.0], [153.6, 0.32, 0.36, 2.0, 0.0]])],
  [153.6, camSeg([[153.6, -0.15, 0.10, 1.35, -0.02], [160.5, 0.05, 0.0, 1.3, 0.0], [161.8, 0.28, -0.04, 1.7, 0.0]])],
  [161.8, camSeg([[161.8, 0.28, -0.04, 1.7, 0.0], [164, 0.05, 0.15, 1.0, 0.0], [170, -0.05, 0.18, 0.95, 0.06], [176, 0.25, 0.30, 1.6, -0.04], [178.6, 0.32, 0.36, 3.2, 0.0, 'in'], [186, 0.32, 0.36, 3.6, 0.0]])],
  [186.0, camSeg([[186, -0.15, 0.10, 1.35, -0.02], [198.25, 0.0, 0.04, 1.15, 0.0]])],
];
// verse 1 and outro: one framing per line, with a small "page flip" kick on every cut
const ARLES_CAM = [[0, 0.02, 1.0], [0, 0.15, 1.0], [0, -0.05, 1.3], [0.08, -0.08, 1.6], [-0.05, -0.05, 1.05], [0, -0.18, 1.25], [0, -0.18, 1.35], [0.1, -0.2, 1.4], [0, 0, 1.0], [0, 0, 1.1], [0, -0.1, 1.0], [0, -0.1, 1.0], [0, 0, 1.15], [0, 0, 1.15], [0, -0.05, 1.1]];
const MOD_CAM = [[0, 0.0, 1.0], [0, -0.1, 1.05], [0.05, -0.08, 1.4], [0, 0, 1.0], [0, -0.06, 1.1], [0, 0, 1.0], [0, 0.04, 1.0]];
function shotCam(kind, k, st, t, pulse) {
  const b = (kind === 'arles' ? ARLES_CAM : MOD_CAM)[Math.max(0, k)];
  let [x, y, z] = b, r = 0.035 * Math.exp(-st * 6) * (k % 2 ? 1 : -1);
  z *= 1 + 0.07 * Math.exp(-st * 7);
  if (kind === 'arles') {
    if (k === 0) x = -0.15 + 0.11 * st;
    if (k === 3) z *= 1 + 0.12 * st;
    if (k === 6) r += 0.02 * Math.sin(t * 25) * pulse;
    if (k === 11) z *= 1 + 0.4 * st;
    if (k === 13) { z *= 1 + 0.18 * st; r += 0.15 * st; }
  } else {
    if (k === 0) { z *= 1 + 0.2 * st; y += 0.06 * st; }
    if (k === 2 && st > 0.66) z *= 1 + 0.08 * Math.exp(-(st - 0.66) * 8);
    if (k === 3) r += 0.3 * st;
    if (k === 4) r += 0.05 * Math.sin(st * 2);
    if (k === 6) z *= 1 + 0.35 * st;
  }
  return [x, y, z, r];
}
const STARS = [[0.32, 0.36, 0.050, 1.0], [-0.30, 0.38, 0.034, 0.95], [-0.04, 0.43, 0.030, 0.9], [0.14, 0.29, 0.026, 0.9], [0.47, 0.21, 0.028, 0.85],
  [-0.46, 0.29, 0.030, 0.9], [0.80, 0.42, 0.030, 0.85], [-0.76, 0.37, 0.028, 0.8], [0.02, 0.26, 0.020, 0.8], [-0.20, 0.24, 0.020, 0.75], [0.58, 0.48, 0.024, 0.8], [-0.60, 0.48, 0.024, 0.8]];

// ------------------------------------------------------------------ per-frame state
export function makeTimeline(timing, feat) {
  const g = timing.beat_grid, lyr = timing.lines.filter((l) => l.type === 'lyric');
  const v1 = lyr.filter((l) => l.section === 'Verse 1' && !l.text.startsWith('(')).map((l) => l.start); v1[0] = 12.40;
  const out = lyr.filter((l) => l.section === 'Outro').map((l) => l.start).slice(0, 7);
  const yeahs = timing.lines.filter((l) => l.type === 'adlib').map((l) => l.start);
  const shotOf = (starts, t) => { let k = -1; for (let i = 0; i < starts.length; i++) if (t >= starts[i]) k = i; return k; };

  function sceneAt(t) {
    const u = {};
    for (const k in P) if (k.startsWith('u')) u[k] = P[k](t);
    const ss = sceneState(t), { pulse } = beatPulse(t, g);
    Object.assign(u, { uSceneA: ss.a, uSceneB: ss.b, uMix: ss.mix, uMixC: ss.mixC, uPulse: pulse, uMorphC: [0.36, 0.26], uTint: [1, 1, 1, 0] });
    u.uHeart = P.heart(t) * pulse;
    u.uLetT = t - 120.2;                     // bridge: seconds since the letters started rising
    u.uSpark = yeahs.reduce((m, ty) => Math.max(m, t >= ty ? Math.exp(-(t - ty) * 6) : 0), 0);
    u.uStars = STARS.map((s, i) => (i === 0 ? [s[0], s[1], s[2] * (0.75 + 0.45 * u.uBright), s[3] * u.uBright] : s)).flat();
    let ci = 0; while (ci + 1 < CAM.length && CAM[ci + 1][0] <= t) ci++;
    let cam, shot = -1;
    if (typeof CAM[ci][1] === 'string') {
      const kind = CAM[ci][1], starts = kind === 'arles' ? v1 : out;
      shot = Math.max(0, shotOf(starts, t)); const st = t - starts[shot];
      u.uShot = shot; u.uShotT = st; cam = shotCam(kind, shot, st, t, pulse);
      if (kind === 'arles' && shot === 3) u.uTint = [0.62, 1.3, 0.55, Math.min(1, st * 3) * 0.75];
    } else { cam = CAM[ci][1](t); u.uShot = 0; u.uShotT = 0; }
    const push = 1 + 0.012 * pulse;
    u.uCam = [cam[0], cam[1], cam[2] * push, cam[3]];
    const fi = Math.max(0, Math.min(feat.frames - 1, Math.round(t * feat.fps))), sm = P.speedMul(t);
    return {
      u, speed: (0.75 + 0.55 * (feat.acc_rms[fi] || 0)) * sm, ageMul: sm < 0.05 ? 0 : 1,
      strokeScale: P.strokeScale(t), fade: P.fade(t), white: P.white(t), cutKey: `${ci}:${shot}`, pulse,
    };
  }

  // year counter: [time, text, place] or a numeric roll [time, 'roll', from, to, seconds]
  const YEARS = [[0, null], [13.65, '1888', '阿尔勒'], [58.95, '1889', '圣雷米'], [78.04, '1890', '奥维尔'], [85.74, '1891', ''],
    [90.84, 'roll', 1891, 1990, 4.6], [120.2, null], [137.05, '1990', ''], [142.33, 'roll', 1990, 2026, 1.2], [152.6, null]];
  function yearAt(t) {
    let i = 0; while (i + 1 < YEARS.length && YEARS[i + 1][0] <= t) i++;
    const e = YEARS[i], prev = i > 0 ? YEARS[i - 1] : null, k = clamp01((t - e[0]) / 0.5);
    const txt = (x, tt) => (!x || x[1] === null ? null : x[1] === 'roll' ? String(Math.round(x[2] + (x[3] - x[2]) * ease.io(clamp01((tt - x[0]) / x[4])))) : x[1]);
    return { cur: txt(e, t), place: e[1] === 'roll' ? '' : e[2] || '', prev: prev ? txt(prev, e[0] - 1e-3) : null, prevPlace: prev && prev[1] !== 'roll' ? prev[2] || '' : '', k: e[1] === 'roll' ? 1 : k };
  }
  const FLASHES = [{ text: '1888', t0: 12.40, chars: [12.40, 12.60, 12.80, 13.10], flyAt: 0.75, flyDur: 0.5 },
    { text: '1889', t0: 57.35, chars: [57.35, 57.72, 58.0, 58.28], flyAt: 1.15, flyDur: 0.75 }];
  function textAt(t) {
    return {
      year: yearAt(t), flash: FLASHES.find((f) => t > f.t0 - 0.05 && t < f.t0 + f.flyAt + f.flyDur) || null,
      theo: t < 10.6 ? t : null,
      signatures: t >= 26.56 && t < 29.25 ? t - 26.56 : null,
      money: t >= 141.13 && t < 142.30 ? t - 141.13 : null,
      price: t >= 143.72 && t < 145.12 ? t - 143.72 : null,
    };
  }
  return { sceneAt, textAt };
}
