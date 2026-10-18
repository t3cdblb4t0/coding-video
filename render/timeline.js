// Storyboard as data: every visual parameter is a keyframed curve over song time (seconds).
// Times come from data/lyrics_timing.json (ASR-aligned) and the 91 BPM beat grid.

const ease = {
  lin: (x) => x,
  io: (x) => x * x * (3 - 2 * x),
  out: (x) => 1 - (1 - x) * (1 - x),
  in: (x) => x * x,
};

// key = [time, value, easeIntoThisKey]
function curve(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e = 'io'] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) { const x = (t - t0) / Math.max(1e-6, t1 - t0); return v0 + (v1 - v0) * ease[e](x); }
    }
    return keys[keys.length - 1][1];
  };
}

// --- key times (chorus 1 sample: 0:34.5 – 1:09.3)
export const T = {
  v1Last: 33.22, chorus: 35.17, blueYellow: 37.72, alive: 40.36, after: 42.72, mad: 44.64, shine: 47.28,
  brightest: 50.04, iAmStar: 52.79, yeah0: 56.85, y1889: 57.35, echo: 59.95, yeah1: 63.45, yeah2: 64.75, yeah3: 65.40,
  asylum: 66.08, bars: 67.46, wall: 68.84,
};

export const SAMPLE = { start: 34.5, end: 69.3 };

const P = {
  uSun:      curve([[35.05, 1], [37.2, 0, 'in']]),
  uNight:    curve([[35.05, 0], [37.2, 1, 'out']]),
  uSwirl:    curve([[34.6, 0.55], [37.0, 1.0], [44.4, 1.0], [45.4, 1.55], [47.2, 1.45], [48.5, 1.15], [56.5, 1.1], [58.5, 0.8], [66, 0.75], [69.5, 0.7]]),
  uTurb:     curve([[34.6, 0.5], [37, 0.35], [44.5, 0.35], [45.6, 1.5], [47.3, 1.2], [49, 0.55], [57.5, 0.4], [62, 0.25]]),
  uYellow:   curve([[34.6, 0.6], [37.0, 0.15], [37.7, 0.15], [38.7, 1.0, 'out'], [40.2, 0.45], [50, 0.45], [52.5, 0.7], [57.4, 0.6], [59, 0.15]]),
  uMany:     curve([[42.6, 0], [44.2, 1.0, 'out'], [47.0, 0.7], [52.7, 0.6], [57.3, 0.55], [59.5, 0.3], [63, 0.25]]),
  uStarGlow: curve([[34.6, 0.6], [36.5, 0.9], [47.1, 0.9], [47.8, 1.35, 'out'], [49.9, 1.2], [57.3, 1.1], [60, 0.9]]),
  uBright:   curve([[34.6, 1.0], [50.0, 1.0], [52.4, 1.9, 'out'], [55.5, 1.6], [59.9, 1.5], [61.8, 0.55], [69.5, 0.5]]),
  uMoon:     curve([[34.6, 0], [36.4, 0.9]]),
  uGround:   () => 1,
  uVillage:  curve([[34.6, 0.0], [36.4, 1.0]]),
  uCypress:  curve([[34.6, 0.0], [36.4, 1.0]]),
  uFigure:   curve([[39.8, 0], [40.4, 1.0], [52.8, 1.0], [54.5, 0.0]]),
  uCold:     curve([[57.2, 0], [59.2, 1.0, 'out']]),
  uWall:     curve([[62.4, 0], [63.45, 1.0, 'out']]),
  uBars:     curve([[63.40, 0], [63.70, 1, 'out'], [64.70, 1], [65.00, 2, 'out'], [65.35, 2], [65.65, 3, 'out'], [66.05, 3], [66.45, 4.0, 'out']]),
  uCut:      curve([[67.40, 0], [68.10, 1.0, 'out']]),
};

// camera: cx, cy, zoom, rot
const cam = {
  cx:  curve([[34.5, 0.20], [36.5, 0.02], [40.2, -0.05], [42.5, 0.15], [44.4, 0.02], [47.2, -0.06], [49.9, 0.16], [52.6, 0.31], [55.6, 0.02], [59.9, 0.0], [62.3, 0.02], [69.3, 0.0]]),
  cy:  curve([[34.5, 0.08], [36.5, 0.17], [40.2, 0.18], [42.5, -0.10], [44.4, 0.14], [47.2, 0.16], [49.9, 0.24], [52.6, 0.355], [55.6, 0.07], [59.9, 0.09], [62.3, 0.12], [69.3, 0.14]]),
  zoom:curve([[34.5, 1.15], [36.5, 1.22], [40.2, 1.10], [42.5, 1.75], [44.4, 0.98], [47.2, 1.08], [49.9, 1.15], [52.6, 2.7, 'in'], [55.6, 0.93, 'out'], [59.9, 0.97], [62.3, 1.0], [69.3, 1.06]]),
  rot: curve([[34.5, -0.05], [36.5, 0.035], [40.2, -0.02], [42.5, 0.0], [44.4, 0.02], [47.2, -0.03], [49.9, 0.0], [52.6, 0.07], [55.6, 0.0], [62, 0.0], [69.3, -0.01]]),
};

const STARS = [
  [0.32, 0.36, 0.050, 1.0],
  [-0.30, 0.38, 0.034, 0.95], [-0.04, 0.43, 0.030, 0.9], [0.14, 0.29, 0.026, 0.9], [0.47, 0.21, 0.028, 0.85],
  [-0.46, 0.29, 0.030, 0.9], [0.80, 0.42, 0.030, 0.85], [-0.76, 0.37, 0.028, 0.8], [0.02, 0.26, 0.020, 0.8],
  [-0.20, 0.24, 0.020, 0.75], [0.58, 0.48, 0.024, 0.8], [-0.60, 0.48, 0.024, 0.8],
];

export function sceneAt(t, beatGrid, feat) {
  const u = {};
  for (const k in P) u[k] = P[k](t);
  // beat pulse (stronger on the downbeat), only while the band is playing
  const b = (t - beatGrid.first_beat_sec) / beatGrid.beat_sec, k = Math.floor(b), dt = (b - k) * beatGrid.beat_sec;
  const down = ((k % 4) + 4) % 4 === 0;
  const sec = t < 56 ? 1.0 : t < 63.3 ? 0.45 : 0.7;
  u.uPulse = Math.exp(-dt * 7) * (down ? 1.0 : 0.55) * sec;
  // ad-lib "耶" sparks
  u.uSpark = [T.yeah0, T.yeah1, T.yeah2, T.yeah3].reduce((m, ty) => Math.max(m, t >= ty ? Math.exp(-(t - ty) * 6) : 0), 0);
  u.uMorphC = [0.36, 0.26];
  const stars = STARS.map((s, i) => (i === 0 ? [s[0], s[1], s[2] * (0.75 + 0.45 * u.uBright), s[3] * u.uBright] : s.slice()));
  u.uStars = stars.flat();
  // camera with a small beat-driven push in the chorus
  const push = 1 + 0.012 * u.uPulse * (t > T.chorus && t < 56 ? 1 : 0.3);
  const shake = t > T.mad && t < T.shine + 1 ? 0.004 * u.uPulse : 0;
  u.uCam = [cam.cx(t) + shake * Math.sin(t * 37), cam.cy(t) + shake * Math.cos(t * 41), cam.zoom(t) * push, cam.rot(t)];
  // stroke speed follows the band's loudness
  const fi = Math.max(0, Math.min(feat.frames - 1, Math.round(t * feat.fps)));
  u.speed = 0.75 + 0.55 * (feat.acc_rms[fi] || 0);
  u.fade = Math.min(1, (t - SAMPLE.start) / 0.4, (SAMPLE.end - t) / 0.6);
  return u;
}

// Text: what to show and how (lower-third lyrics, year counter, big year flash)
export function textAt(t) {
  return {
    year: t < T.y1889 + 1.6 ? '1888' : '1889',
    yearFlip: Math.max(0, Math.min(1, (t - (T.y1889 + 1.6)) / 0.5)),
    flash: t > T.y1889 - 0.05 && t < T.y1889 + 2.0 ? { text: '1889', t0: T.y1889, chars: [57.35, 57.72, 58.0, 58.28] } : null,
  };
}
