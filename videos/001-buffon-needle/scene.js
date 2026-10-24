// 001 · 扔针算 π (Buffon's needle). 1080x1920, 30 fps, 27.6 s = 10 bars + 6 beats at 100 BPM.
// Every visual beat is placed on the musical grid (BEAT = 0.6 s) so cuts and sounds line up.
import { SANS, OLD, MONO } from '../../engine/fonts.js';
import { clamp, lerp, prog, ease, envelope, mulberry32, drawRich, drawStagger, drawCaption, measureRich, fmtInt } from '../../engine/kit.js';
import { simulate, estimate, SEED, TOTAL } from './sim.js';
import { buildAudio } from './audio.js';

export const W = 1080;
export const H = 1920;
export const BEAT = 0.6;
export const BAR = 4 * BEAT;
const DURATION = 10 * BAR + 6 * BEAT; // the outro gets 1.5 bars so the next-episode teaser can be read

export const C = {
  bg0: '#121826', bg1: '#07090E', text: '#F4F6FA', dim: 'rgba(244,246,250,0.62)', faint: 'rgba(244,246,250,0.38)',
  amber: '#FFB547', gold: '#FFC86B', slate: '#8EA2C0', line: 'rgba(150,170,200,0.45)', ink: '#3B2E21', red: '#B4442C',
};

// ---- field geometry (world units: line spacing = needle length = 1) ----
const ROWS = 9;
const COLS = 14.8;
// Layout keeps clear of Douyin's overlays: top tab bar (y < ~220), right-hand icon column
// (x > ~930, y 900-1600) and the bottom description block (y > ~1520).
const FIELD = { top: 482, bottom: 1142 };
FIELD.h = FIELD.bottom - FIELD.top;
const SCY = (FIELD.top + FIELD.bottom) / 2 - FIELD.top; // camera centre, field-local
const WIDE = 70;

// ---- timeline (seconds) ----
export const T = {
  hist: BAR, // 2.4  1777 document
  rule: 3 * BAR, // 7.2  needle length = spacing
  demo: 4 * BAR, // 9.6  two drops
  formula: 5 * BAR, // 12.0
  exp: 6 * BAR, // 14.4 zoom out, experiment
  n0: 6 * BAR + BEAT, // 15.0 first random needle
  n1: 6 * BAR + BEAT + 6, // 21.0 one decade per second -> 1,000,000
  reveal: 9 * BAR, // 21.6
  outro: 10 * BAR, // 24.0
  end: DURATION,
};

export const needleCount = (t) => (t < T.n0 ? 0 : Math.min(TOTAL, Math.floor(10 ** (t - T.n0) + 1e-9)));
export const landTime = (i) => T.n0 + Math.log10(i + 1);
export const DROP = 0.28; // seconds a needle takes to fall in
const ANIMATED = 40; // first N experiment needles get a falling animation + their own sound

// Hook: 70 needles already on the floor, 15 more landing on 16th notes.
export const HOOK_STATIC = 70;
export const hookDropTimes = Array.from({ length: 15 }, (_, k) => 0.15 + k * 0.15);

// Demo needles (hand-placed so one clearly crosses and one clearly does not), then four random ones.
const deg = (d) => (d * Math.PI) / 180;
const mk = (x, y, a) => ({ x, y, cos: Math.cos(deg(a)), sin: Math.sin(deg(a)) });
// Visible window at the demo zoom is x 4.7-10.1, y 2.8-6.2; each needle clears or misses a seam
// by at least 0.12 units so nobody has to squint.
export const DEMO_NEEDLES = [
  { ...mk(6.3, 4.2, 62), t: T.demo + BEAT, label: '压线' },
  { ...mk(8.6, 4.5, 158), t: T.demo + 2 * BEAT, label: '未压线' },
  { ...mk(5.5, 4.75, 120), t: T.demo + 2.5 * BEAT },
  { ...mk(9.0, 3.55, 35), t: T.demo + 2.75 * BEAT },
  { ...mk(7.5, 4.95, 80), t: T.demo + 3 * BEAT },
  { ...mk(6.9, 3.55, 15), t: T.demo + 3.25 * BEAT },
].map((n) => ({ ...n, cross: Math.floor(n.y - 0.5 * n.sin) !== Math.floor(n.y + 0.5 * n.sin) ? 1 : 0 }));

const CAPTIONS = [
  { t0: 2.85, t1: 4.75, zh: '1777 年，布丰在书中问道：', en: 'In a 1777 essay, the naturalist Buffon asked:' },
  { t0: 4.85, t1: 7.05, zh: '小棍落地，压到地板缝的概率？', en: 'Odds that a dropped stick crosses a seam?' },
  { t0: 7.35, t1: 9.5, zh: [['做个实验：'], ['针长 = 线距', C.amber]], en: 'The setup: needle length = line spacing' },
  { t0: 9.7, t1: 11.9, zh: '随手扔，数一数压线的针', en: 'Drop at random. Count the ones touching a line.' },
  { t0: 12.1, t1: 14.3, zh: '布丰算出了这个概率的精确值', en: 'Buffon worked out the exact chance' },
  { t0: 14.6, t1: 17.6, zh: [['反过来，就能用针算出 '], ['π', C.amber]], en: 'Flip it around, and needles can compute π' },
  { t0: 17.8, t1: 20.9, zh: [['扔得越多，就越接近 '], ['π', C.amber]], en: 'The more you drop, the closer it gets' },
  { t0: 21.8, t1: 23.9, zh: [['纯随机，却算出了 '], ['π', C.amber]], en: 'Pure chance, and out comes π' },
];

const PI_STR = '3.14159';
const st = {}; // state built in setup()

// ---------------------------------------------------------------- setup
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function buildBackground() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, 760, 60, W / 2, 900, 1250);
  grad.addColorStop(0, C.bg0);
  grad.addColorStop(1, C.bg1);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
}

function buildVignette() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.45, H * 0.78);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
}

function buildGrain() {
  const rand = mulberry32(99);
  return Array.from({ length: 4 }, () => {
    const c = makeCanvas(540, 960);
    const g = c.getContext('2d');
    const img = g.createImageData(540, 960);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

// 18th-century title-page style card with a plank-floor figure. The falling stick is animated separately.
const CARD = { w: 800, h: 980, pad: 90 };
const FIG = { x: 120, y: 420, w: 560, h: 340, seams: [505, 590, 675] };
function buildCard() {
  const { w, h, pad } = CARD;
  const c = makeCanvas(w + 2 * pad, h + 2 * pad);
  const g = c.getContext('2d');
  const rand = mulberry32(1707);
  g.translate(pad, pad);

  // Deckled outline.
  const edge = [];
  const seg = 40;
  for (let i = 0; i <= seg; i++) edge.push([(w * i) / seg, (rand() - 0.5) * 6]);
  for (let i = 1; i <= seg; i++) edge.push([w + (rand() - 0.5) * 6, (h * i) / seg]);
  for (let i = seg - 1; i >= 0; i--) edge.push([(w * i) / seg, h + (rand() - 0.5) * 6]);
  for (let i = seg - 1; i > 0; i--) edge.push([(rand() - 0.5) * 6, (h * i) / seg]);
  const outline = new Path2D();
  edge.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)));
  outline.closePath();

  g.save();
  g.shadowColor = 'rgba(0,0,0,0.7)';
  g.shadowBlur = 60;
  g.shadowOffsetY = 24;
  g.fillStyle = '#E8DCC0';
  g.fill(outline);
  g.restore();

  g.save();
  g.clip(outline);
  const base = g.createRadialGradient(w / 2, h * 0.42, 80, w / 2, h / 2, h * 0.75);
  base.addColorStop(0, '#F2E8D2');
  base.addColorStop(1, '#D6C29A');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    const l = 4 + rand() * 18;
    g.strokeStyle = `rgba(110,80,40,${0.03 + rand() * 0.05})`;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 10 + rand() * 50;
    const fox = g.createRadialGradient(x, y, 0, x, y, r);
    fox.addColorStop(0, 'rgba(150,100,50,0.10)');
    fox.addColorStop(1, 'rgba(150,100,50,0)');
    g.fillStyle = fox;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const burn = (x0, y0, x1, y1) => {
    const lg = g.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, 'rgba(95,60,25,0.38)');
    lg.addColorStop(1, 'rgba(95,60,25,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
  };
  burn(0, 0, 0, 70);
  burn(0, h, 0, h - 70);
  burn(0, 0, 70, 0);
  burn(w, 0, w - 70, 0);

  // Title block.
  g.fillStyle = C.ink;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `52px ${OLD}`;
  g.letterSpacing = '18px';
  g.fillText('ESSAI', w / 2 + 9, 132);
  g.letterSpacing = '4px';
  g.font = `66px ${OLD}`;
  g.fillText("D'ARITHMÉTIQUE", w / 2 + 2, 210);
  g.font = `56px ${OLD}`;
  g.letterSpacing = '10px';
  g.fillText('MORALE.', w / 2 + 5, 276);
  g.letterSpacing = '0px';
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(w / 2 - 170, 312);
  g.lineTo(w / 2 - 14, 312);
  g.moveTo(w / 2 + 14, 312);
  g.lineTo(w / 2 + 170, 312);
  g.stroke();
  g.beginPath();
  g.moveTo(w / 2, 304);
  g.lineTo(w / 2 + 8, 312);
  g.lineTo(w / 2, 320);
  g.lineTo(w / 2 - 8, 312);
  g.closePath();
  g.fill();
  g.font = `italic 34px ${OLD}`;
  g.fillText('par M. le Comte de Buffon', w / 2, 368);

  // Figure: a floor of parallel planks.
  g.lineWidth = 2.2;
  g.strokeRect(FIG.x, FIG.y, FIG.w, FIG.h);
  const planks = [FIG.y, ...FIG.seams, FIG.y + FIG.h];
  for (let p = 0; p < planks.length - 1; p++) {
    for (let k = 0; k < 5; k++) {
      const yy = planks[p] + 12 + ((planks[p + 1] - planks[p] - 24) * k) / 4;
      const ph = rand() * 6;
      g.strokeStyle = 'rgba(59,46,33,0.22)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = FIG.x + 6; x <= FIG.x + FIG.w - 6; x += 8) {
        const y = yy + Math.sin(x * 0.02 + ph) * 3 + Math.sin(x * 0.07 + ph * 2) * 1.2;
        if (x === FIG.x + 6) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.strokeStyle = C.ink;
  g.lineWidth = 2.6;
  for (const y of FIG.seams) {
    g.beginPath();
    g.moveTo(FIG.x, y);
    g.lineTo(FIG.x + FIG.w, y);
    g.stroke();
  }
  // No "Fig." label: the card is a stylised recreation, not a facsimile of the 1777 printing.
  g.font = `40px ${OLD}`;
  g.letterSpacing = '6px';
  g.fillText('M. DCC. LXXVII.', w / 2 + 3, 905);
  g.letterSpacing = '0px';
  g.restore();
  return c;
}

function buildChartPoints() {
  const pts = [];
  let last = 0;
  for (let k = 0; k <= 600; k++) {
    const n = Math.round(10 ** (k / 100));
    if (n === last) continue;
    last = n;
    pts.push({ n, lx: Math.log10(n), e: estimate(st.sim, n) });
  }
  return pts;
}

// ---------------------------------------------------------------- drawing helpers
function cameraScale(t) {
  if (t < T.rule - 0.1) return WIDE;
  if (t < T.demo) return 300;
  if (t < T.exp) return lerp(300, 200, ease.inOut(prog(t, T.demo, 0.5)));
  return lerp(200, WIDE, ease.inOut(prog(t, T.exp, BEAT)));
}

function fieldAlpha(t) {
  if (t < T.hist) return 1;
  if (t < T.rule - 0.3) return lerp(1, 0.2, ease.out(prog(t, T.hist, 0.4)));
  if (t < T.rule - 0.05) return lerp(0.2, 0, prog(t, T.rule - 0.3, 0.25));
  if (t < T.formula) return ease.out(prog(t, T.rule - 0.05, 0.35));
  if (t < T.exp - 0.2) return lerp(1, 0.32, ease.out(prog(t, T.formula, 0.4)));
  if (t < T.reveal) return lerp(0.32, 1, ease.out(prog(t, T.exp - 0.2, 0.4)));
  if (t < T.outro) return lerp(1, 0.2, ease.out(prog(t, T.reveal, 0.5)));
  return lerp(0.2, 0.12, prog(t, T.outro, 0.5));
}

const toScreen = (s, x, y) => [W / 2 + (x - COLS / 2) * s, SCY + (y - ROWS / 2) * s];

function lineNeedle(g, X, Y, cos, sin, len) {
  const dx = (cos * len) / 2;
  const dy = (sin * len) / 2;
  g.moveTo(X - dx, Y - dy);
  g.lineTo(X + dx, Y + dy);
}

// Tapered needle with an eye, for close-ups.
function bigNeedle(g, X, Y, cos, sin, len, w, color, glow) {
  const hx = (cos * len) / 2;
  const hy = (sin * len) / 2;
  const nx = -sin;
  const ny = cos;
  g.save();
  if (glow > 0) {
    g.shadowColor = `rgba(255,181,71,${0.85 * glow})`;
    g.shadowBlur = 26 * glow;
  }
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(X + hx, Y + hy);
  g.lineTo(X - hx + (nx * w) / 2, Y - hy + (ny * w) / 2);
  g.quadraticCurveTo(X - hx - cos * w * 0.9, Y - hy - sin * w * 0.9, X - hx - (nx * w) / 2, Y - hy - (ny * w) / 2);
  g.closePath();
  g.fill();
  g.restore();
  const ex = X - hx + cos * w * 1.6;
  const ey = Y - hy + sin * w * 1.6;
  g.fillStyle = 'rgba(7,9,14,0.85)';
  g.beginPath();
  g.ellipse(ex, ey, w * 0.85, w * 0.22, Math.atan2(sin, cos), 0, Math.PI * 2);
  g.fill();
}

// A needle falling into place: starts larger (closer to camera), rotated, with a long shadow.
function fallingNeedle(g, s, n, t, land, big) {
  const p = prog(t, land - DROP, DROP);
  if (p <= 0) return;
  const q = p * p;
  const [X, Y] = toScreen(s, n.x, n.y);
  const rot = (1 - q) * 0.7;
  const cos = Math.cos(Math.atan2(n.sin, n.cos) + rot);
  const sin = Math.sin(Math.atan2(n.sin, n.cos) + rot);
  const scale = lerp(1.7, 1, q);
  const shadow = lerp(34, 3, q) * (s / WIDE) ** 0.5;
  const len = s * scale;
  const color = '#FFFFFF'; // every needle falls white; it only takes its colour on landing
  g.save();
  g.globalAlpha *= Math.min(1, p * 2.5);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = big ? s * 0.03 : 3;
  g.beginPath();
  lineNeedle(g, X + shadow, Y + shadow * 1.2, cos, sin, len);
  g.stroke();
  if (big) bigNeedle(g, X, Y, cos, sin, len, s * 0.032, color, 0);
  else {
    g.strokeStyle = color;
    g.lineWidth = 2.6 * scale;
    g.beginPath();
    lineNeedle(g, X, Y, cos, sin, len);
    g.stroke();
  }
  g.restore();
  ripple(g, X, Y, t, land, n.cross, big ? s / 2.4 : 46);
}

function ripple(g, X, Y, t, land, cross, size) {
  const r = prog(t, land, 0.45);
  if (r <= 0 || r >= 1) return;
  g.save();
  g.globalAlpha *= (1 - r) * 0.8;
  g.strokeStyle = cross ? C.amber : C.slate;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(X, Y, size * (0.3 + ease.out(r) * 0.9), 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

function mix(a, b, u) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], u))).join(',')})`;
}

// Later needles are fainter so a million of them build up a texture instead of a white-out.
// Non-crossing needles are dimmer still, which lets the amber bands along the seams emerge
// (needles centred near a seam almost always cross it).
const needleAlpha = (i) => clamp(0.95 / (1 + i / 800), 0.006, 0.95);
const SLATE_ALPHA = 0.7;

// Experiment needles accumulate on a persistent layer (only ever drawn at the wide scale).
function syncAccumulation(n) {
  const g = st.accG;
  if (n < st.accN) {
    g.clearRect(0, 0, W, FIELD.h);
    st.accN = 0;
  }
  const { x, y, cos, sin, cross } = st.sim;
  g.lineCap = 'round';
  const INDIVIDUAL = 2048;
  let i = st.accN;
  for (; i < Math.min(n, INDIVIDUAL); i++) {
    g.globalAlpha = needleAlpha(i) * (cross[i] ? 1 : SLATE_ALPHA);
    g.strokeStyle = cross[i] ? C.amber : C.slate;
    g.lineWidth = 2.4;
    const [X, Y] = toScreen(WIDE, x[i], y[i]);
    g.beginPath();
    lineNeedle(g, X, Y, cos[i], sin[i], WIDE);
    g.stroke();
  }
  // Past 2048, draw complete batches of 512 (one stroke per colour per batch) so output is identical
  // whether frames are rendered in order or jumped to directly.
  const B = 512;
  g.lineWidth = 1.7;
  for (; i + B <= n; i += B) {
    for (const c of [0, 1]) {
      g.globalAlpha = needleAlpha(i + B / 2) * (c ? 1 : SLATE_ALPHA);
      g.strokeStyle = c ? C.amber : C.slate;
      g.beginPath();
      for (let k = i; k < i + B; k++) {
        if (cross[k] !== c) continue;
        const [X, Y] = toScreen(WIDE, x[k], y[k]);
        lineNeedle(g, X, Y, cos[k], sin[k], WIDE);
      }
      g.stroke();
    }
  }
  st.accN = i;
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- scene parts
function drawField(ctx, t) {
  const a = fieldAlpha(t);
  if (a <= 0.001) return;
  const g = st.fieldG;
  const s = cameraScale(t);
  g.clearRect(0, 0, W, FIELD.h);

  // Floor seams.
  g.lineWidth = s > 150 ? 3 : 2;
  g.strokeStyle = C.line;
  for (let k = 0; k <= ROWS; k++) {
    const Y = SCY + (k - ROWS / 2) * s;
    if (Y < -10 || Y > FIELD.h + 10) continue;
    g.beginPath();
    g.moveTo(0, Y);
    g.lineTo(W, Y);
    g.stroke();
  }

  if (t < T.rule - 0.1) drawHookNeedles(g, t);
  else if (t < T.exp + 0.5) drawCloseUp(g, t, s);
  if (t >= T.n0 - DROP) {
    const n = needleCount(t);
    syncAccumulation(n);
    g.drawImage(st.acc, 0, 0);
    for (let i = 0; i < ANIMATED; i++) {
      const land = landTime(i);
      const nd = { x: st.sim.x[i], y: st.sim.y[i], cos: st.sim.cos[i], sin: st.sim.sin[i], cross: st.sim.cross[i] };
      if (t < land) fallingNeedle(g, WIDE, nd, t, land, false);
      else {
        const [X, Y] = toScreen(WIDE, nd.x, nd.y);
        ripple(g, X, Y, t, land, nd.cross, 46);
      }
    }
  }

  // Feather the top and bottom edges into the background.
  g.save();
  g.globalCompositeOperation = 'destination-out';
  const fade = (y0, y1) => {
    const lg = g.createLinearGradient(0, y0, 0, y1);
    lg.addColorStop(0, 'rgba(0,0,0,1)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg;
    g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  };
  fade(0, 70);
  fade(FIELD.h, FIELD.h - 70);
  g.restore();

  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(st.field, 0, FIELD.top);
  ctx.restore();
}

function drawHookNeedles(g, t) {
  const { x, y, cos, sin, cross } = st.hook;
  g.lineCap = 'round';
  for (let i = 0; i < HOOK_STATIC; i++) {
    const [X, Y] = toScreen(WIDE, x[i], y[i]);
    g.strokeStyle = cross[i] ? C.amber : C.slate;
    g.lineWidth = 2.6;
    g.globalAlpha = cross[i] ? 0.95 : 0.75;
    g.beginPath();
    lineNeedle(g, X, Y, cos[i], sin[i], WIDE);
    g.stroke();
  }
  g.globalAlpha = 1;
  hookDropTimes.forEach((land, k) => {
    const i = HOOK_STATIC + k;
    const nd = { x: x[i], y: y[i], cos: cos[i], sin: sin[i], cross: cross[i] };
    if (t < land) fallingNeedle(g, WIDE, nd, t, land, false);
    else {
      const [X, Y] = toScreen(WIDE, nd.x, nd.y);
      g.strokeStyle = nd.cross ? C.amber : C.slate;
      g.lineWidth = 2.6;
      g.beginPath();
      lineNeedle(g, X, Y, nd.cos, nd.sin, WIDE);
      g.stroke();
      ripple(g, X, Y, t, land, nd.cross, 46);
    }
  });
}

function drawCloseUp(g, t, s) {
  const out = 1 - prog(t, T.exp, 0.35);
  g.save();
  g.globalAlpha *= out;

  // Rule: a vertical needle exactly spanning two seams, with labelled brackets.
  const ruleA = envelope(t, T.rule, T.demo + 0.3, 0.3, 0.35);
  if (ruleA > 0) {
    g.save();
    g.globalAlpha *= ruleA;
    const [X, Y] = toScreen(s, COLS / 2, ROWS / 2);
    const grow = ease.out(prog(t, T.rule + 0.2, 0.5));
    const len = s * grow;
    bigNeedle(g, X, Y - s / 2 + len / 2, 0, 1, len, s * 0.032, '#E9EEF6', 0);
    const lab = ease.out(prog(t, T.rule + 0.75, 0.4));
    if (lab > 0) {
      g.globalAlpha *= lab;
      bracket(g, X - 150, Y - s / 2, Y + s / 2, -1, '线距', C.dim);
      bracket(g, X + 150, Y - s / 2, Y + (s / 2) * grow, 1, '针长', C.text);
      const eq = ease.outBack(prog(t, T.rule + 1.2, 0.35));
      if (eq > 0) {
        g.save();
        g.translate(X, Y + s / 2 + 70);
        g.scale(eq, eq);
        g.font = `800 64px ${SANS}`;
        g.textAlign = 'center';
        g.fillStyle = C.amber;
        g.fillText('针长 = 线距', 0, 22);
        g.restore();
      }
    }
    g.restore();
  }

  // Demo drops.
  if (t >= T.demo) {
    for (const n of DEMO_NEEDLES) {
      if (t < n.t) {
        fallingNeedle(g, s, n, t, n.t, true);
        continue;
      }
      const [X, Y] = toScreen(s, n.x, n.y);
      const after = prog(t, n.t, 0.35);
      bigNeedle(g, X, Y, n.cos, n.sin, s, s * 0.032, mix('#FFFFFF', n.cross ? C.amber : C.slate, after), n.cross ? 1 - after * 0.55 : 0);
      ripple(g, X, Y, t, n.t, n.cross, s / 2.4);
      if (n.label) {
        const la = ease.out(prog(t, n.t + 0.1, 0.3)) * (1 - prog(t, T.formula, 0.3));
        if (la > 0) pill(g, X, Y - s * 0.62, n.label, n.cross ? C.amber : C.slate, la);
      }
    }
  }
  g.restore();
}

function bracket(g, x, y0, y1, side, label, color) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - side * 14, y0);
  g.lineTo(x, y0);
  g.lineTo(x, y1);
  g.lineTo(x - side * 14, y1);
  g.stroke();
  g.font = `700 40px ${SANS}`;
  g.textAlign = side < 0 ? 'right' : 'left';
  g.fillText(label, x + side * 22, (y0 + y1) / 2 + 14);
  g.restore();
}

function pill(g, x, y, text, color, a) {
  g.save();
  g.globalAlpha *= a;
  g.font = `700 34px ${SANS}`;
  const w = g.measureText(text).width + 40;
  g.fillStyle = 'rgba(7,9,14,0.75)';
  g.strokeStyle = color;
  g.lineWidth = 2.5;
  g.beginPath();
  g.roundRect(x - w / 2, y - 30, w, 58, 29);
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.fillText(text, x, y + 12);
  g.restore();
}

function drawHookTitle(ctx, t) {
  const a = 1 - ease.in(prog(t, T.hist - 0.15, 0.35));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const glow = ctx.createRadialGradient(W / 2, 800, 40, W / 2, 800, 560);
  glow.addColorStop(0, 'rgba(7,9,14,0.88)');
  glow.addColorStop(1, 'rgba(7,9,14,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 380, W, 860);

  const z = 1 + t * 0.016;
  ctx.translate(W / 2, 800);
  ctx.scale(z, z);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 24;
  ctx.font = `900 136px ${SANS}`;
  drawRich(ctx, '随手扔针', 0, -40);
  const pulse = Math.max(0, 1 - Math.abs(t - BEAT) / 0.35);
  ctx.shadowColor = `rgba(255,181,71,${0.35 + 0.6 * pulse})`;
  ctx.shadowBlur = 30 + 50 * pulse;
  drawRich(ctx, [['竟能算出 '], ['π', C.amber], [' ？']], 0, 120);
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.font = `400 38px ${SANS}`;
  drawRich(ctx, 'Can random needles reveal π?', 0, 205, { color: C.dim });
  ctx.restore();
  seriesTag(ctx, a);
}

function seriesTag(ctx, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 34px ${SANS}`;
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'center';
  ctx.fillStyle = C.amber;
  ctx.fillText('算给你看 · 01', W / 2 + 3, 300);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

function drawHistory(ctx, t) {
  const inP = ease.out(prog(t, T.hist, 0.55));
  const outP = ease.in(prog(t, T.rule - 0.3, 0.35));
  if (inP <= 0 || outP >= 1) return;
  const cx = W / 2;
  const cy = 790 + (1 - inP) * 700 - outP * 900;
  const rot = deg(lerp(-6, -1.2, inP) + outP * 4);
  const sc = lerp(0.92, 1, inP);
  ctx.save();
  ctx.globalAlpha = Math.min(inP * 1.6, 1) * (1 - outP);
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.translate(-CARD.w / 2, -CARD.h / 2);
  ctx.drawImage(st.card, -CARD.pad, -CARD.pad);

  // The stick (baguette) falls onto the planks and lands across the middle seam.
  const land = T.hist + 4 * BEAT; // 4.8 s, the downbeat of bar 3 (audio.js plays the clack here)
  const stick = { x: FIG.x + 300, y: FIG.seams[1] - 8, a: deg(-38), len: 150 };
  const p = prog(t, land - 0.45, 0.45);
  if (p > 0) {
    const q = p * p;
    const a = stick.a + (1 - q) * 1.1;
    const lift = (1 - q) * 120;
    const scale = lerp(1.45, 1, q);
    const dx = (Math.cos(a) * stick.len * scale) / 2;
    const dy = (Math.sin(a) * stick.len * scale) / 2;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(59,46,33,0.25)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(stick.x - dx + lift * 0.3, stick.y - dy + lift * 0.5);
    ctx.lineTo(stick.x + dx + lift * 0.3, stick.y + dy + lift * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#5A3A1E';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(stick.x - dx, stick.y - dy - lift);
    ctx.lineTo(stick.x + dx, stick.y + dy - lift);
    ctx.stroke();
    ctx.restore();
  }
  // Ink circle around the crossing point, drawn on.
  const ring = ease.out(prog(t, land + 0.25, 0.5));
  if (ring > 0) {
    ctx.save();
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(stick.x + 6, FIG.seams[1], 58, 40, deg(-8), deg(200), deg(200) + ring * Math.PI * 2.1);
    ctx.stroke();
    ctx.restore();
  }
  // "= 1777" annotation next to the Roman-numeral date.
  const ann = ease.out(prog(t, T.hist + BEAT, 0.5));
  if (ann > 0) {
    ctx.save();
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CARD.w / 2 - 175, 922);
    ctx.lineTo(CARD.w / 2 - 175 + 350 * ann, 922 - 4 * ann);
    ctx.stroke();
    ctx.globalAlpha *= ann;
    ctx.translate(CARD.w / 2 + 228, 902);
    ctx.rotate(deg(-6));
    ctx.font = `700 40px ${SANS}`;
    ctx.fillStyle = C.red;
    ctx.textAlign = 'left';
    ctx.fillText('1777', 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawFormula(ctx, t) {
  if (t < T.formula || t > T.n0 + 0.1) return;
  const fadeOthers = 1 - prog(t, T.exp - 0.2, 0.3);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 20;
  const l1 = ease.out(prog(t, T.formula + 0.1, 0.45)) * fadeOthers;
  if (l1 > 0) {
    ctx.globalAlpha = l1;
    ctx.font = `600 54px ${SANS}`;
    drawRich(ctx, [['压线概率  =  ', C.dim], ['2 / π', C.text]], W / 2, 690 + (1 - l1) * 20);
  }
  const so = ease.out(prog(t, T.formula + 0.85, 0.35)) * fadeOthers;
  if (so > 0) {
    ctx.globalAlpha = so;
    ctx.font = `500 34px ${SANS}`;
    drawRich(ctx, '所以', W / 2, 780, { color: C.faint });
  }
  const l2 = ease.out(prog(t, T.formula + 1.1, 0.45));
  if (l2 > 0) {
    // Second line flies up into the counter panel as its formula hint.
    const m = ease.inOut(prog(t, T.exp, BEAT));
    const size = lerp(66, 30, m);
    const y = lerp(890, 446, m);
    ctx.globalAlpha = l2 * (1 - prog(t, T.n0 - 0.05, 0.1));
    ctx.font = `${Math.round(lerp(800, 500, m))} ${size}px ${SANS}`;
    drawRich(ctx, [['π', C.amber], [' ≈ 2 × 总数 ÷ 压线数', m > 0.5 ? C.dim : C.text]], W / 2, y + (1 - l2) * 24);
  }
  ctx.restore();
}

function piDigits(e) {
  if (e === null) return [['—', C.dim]];
  const s = e.toFixed(5);
  let k = 0;
  while (k < s.length && s[k] === PI_STR[k]) k++;
  return [[s.slice(0, k), C.gold], [s.slice(k), C.text]].filter(([x]) => x.length);
}

function drawPanel(ctx, t) {
  const a = ease.out(prog(t, T.exp + 0.1, 0.5)) * (1 - prog(t, T.outro, 0.35));
  if (a <= 0) return;
  const n = needleCount(t);
  const c = st.sim.cum[n];
  const e = estimate(st.sim, n);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `500 32px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('总数', 290, 232);
  ctx.fillText('压线数', 790, 232);
  ctx.font = `600 54px ${MONO}`;
  ctx.fillStyle = C.text;
  ctx.fillText(fmtInt(n), 290, 296);
  ctx.fillStyle = C.amber;
  ctx.fillText(fmtInt(c), 790, 296);
  if (t >= T.n0 - 0.05) {
    ctx.font = `500 30px ${SANS}`;
    drawRich(ctx, [['π', C.amber], [' ≈ 2 × 总数 ÷ 压线数', C.dim]], W / 2, 446);
  }
  // π estimate row; at the reveal it moves to the centre and grows.
  const m = ease.out(prog(t, T.reveal, 0.55));
  const y = lerp(392, 790, m);
  const size = lerp(84, 156, m);
  ctx.font = `700 ${size}px ${MONO}`;
  const digits = piDigits(e);
  const dw = measureRich(ctx, digits);
  ctx.font = `700 ${size * 0.7}px ${SANS}`;
  const prefix = 'π ≈ ';
  const pw = ctx.measureText(prefix).width;
  const x0 = W / 2 - (pw + dw) / 2;
  if (m > 0) {
    ctx.shadowColor = `rgba(255,181,71,${0.5 * m})`;
    ctx.shadowBlur = 40 * m;
  }
  drawRich(ctx, prefix, x0, y, { align: 'left', color: C.dim });
  ctx.font = `700 ${size}px ${MONO}`;
  drawRich(ctx, digits, x0 + pw, y, { align: 'left' });
  ctx.restore();
}

function drawChart(ctx, t) {
  const a = ease.out(prog(t, T.n0 - 0.2, 0.4)) * (1 - prog(t, T.reveal, 0.3));
  if (a <= 0) return;
  const n = needleCount(t);
  const X0 = 120;
  const X1 = 890; // keep clear of Douyin's right-hand buttons
  const Y0 = 1166;
  const Y1 = 1250;
  const lo = 2.5;
  const hi = 3.8;
  const px = (lx) => X0 + (lx / 6) * (X1 - X0);
  const py = (e) => Y1 - ((clamp(e, lo, hi) - lo) / (hi - lo)) * (Y1 - Y0);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(244,246,250,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X0, Y1);
  ctx.lineTo(X1, Y1);
  ctx.stroke();
  ctx.setLineDash([10, 9]);
  ctx.strokeStyle = 'rgba(255,181,71,0.75)';
  ctx.beginPath();
  ctx.moveTo(X0, py(Math.PI));
  ctx.lineTo(X1, py(Math.PI));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `600 30px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.textAlign = 'left';
  ctx.fillText('π', X1 + 12, py(Math.PI) + 10);
  ctx.font = `400 26px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'center';
  ['1', '10', '100', '1千', '1万', '10万', '100万'].forEach((s, k) => ctx.fillText(s, px(k), Y1 + 36));
  if (n >= 1) {
    const pts = st.chart.filter((p) => p.n <= n && p.e !== null);
    const cur = estimate(st.sim, n);
    if (cur !== null) pts.push({ lx: Math.log10(n), e: cur });
    if (pts.length) {
      ctx.strokeStyle = 'rgba(244,246,250,0.85)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(px(p.lx), py(p.e)) : ctx.moveTo(px(p.lx), py(p.e))));
      ctx.stroke();
      const last = pts[pts.length - 1];
      ctx.fillStyle = C.text;
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(px(last.lx), py(last.e), 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawReveal(ctx, t) {
  const a = 1 - prog(t, T.outro, 0.35);
  if (t < T.reveal || a <= 0) return;
  const e = estimate(st.sim, TOTAL);
  const err = (Math.abs(e - Math.PI) / Math.PI) * 100;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  const l0 = ease.out(prog(t, T.reveal + 0.15, 0.4));
  ctx.globalAlpha = a * l0;
  ctx.font = `500 38px ${SANS}`;
  drawRich(ctx, '用 100 万根针算出', W / 2, 640, { color: C.dim });
  const l1 = ease.out(prog(t, T.reveal + BEAT / 2, 0.4));
  ctx.globalAlpha = a * l1;
  const label = '真实值 ';
  const digits = [['3.14', C.gold], ['15926…', C.dim]];
  ctx.font = `500 46px ${SANS}`;
  const wLabel = ctx.measureText(label).width;
  ctx.font = `500 46px ${MONO}`;
  const wNum = measureRich(ctx, digits);
  const x = W / 2 - (wLabel + wNum) / 2;
  const y = 900 + (1 - l1) * 16;
  ctx.font = `500 46px ${SANS}`;
  drawRich(ctx, label, x, y, { align: 'left', color: C.dim });
  ctx.font = `500 46px ${MONO}`;
  drawRich(ctx, digits, x + wLabel, y, { align: 'left' });
  const l2 = ease.outBack(prog(t, T.reveal + BEAT, 0.4));
  if (l2 > 0) {
    ctx.globalAlpha = a * clamp(l2);
    ctx.save();
    ctx.translate(W / 2, 1000);
    ctx.scale(l2, l2);
    ctx.font = `800 50px ${SANS}`;
    drawRich(ctx, [['误差仅 ', C.text], [`${err < 0.01 ? err.toFixed(3) : err.toFixed(2)}%`, C.amber]], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 22;
  ctx.font = `800 88px ${SANS}`;
  drawStagger(ctx, '随机之中，藏着确定', W / 2, 770, t, T.outro + 0.1, { stagger: 0.05, dur: 0.5 });
  ctx.globalAlpha = ease.out(prog(t, T.outro + 0.6, 0.5));
  ctx.font = `400 36px ${SANS}`;
  drawRich(ctx, 'Order, hidden in chance', W / 2, 845, { color: C.dim });

  const b = ease.outBack(prog(t, T.outro + BEAT * 1.5, 0.45));
  if (b > 0) {
    ctx.globalAlpha = clamp(b);
    ctx.save();
    ctx.translate(W / 2, 985);
    ctx.scale(b, b);
    ctx.font = `700 34px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 1 期';
    const w = ctx.measureText(label).width + 56;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -38, w, 70, 35);
    ctx.stroke();
    ctx.fillStyle = C.amber;
    ctx.textAlign = 'center';
    ctx.fillText(label, 2, 10);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 2, 0.5));
  ctx.font = `500 42px ${SANS}`;
  drawRich(ctx, [['下期：', C.amber], ['三门问题，换还是不换？', C.text]], W / 2, 1110);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 2.5, 0.5)) * 0.9;
  ctx.font = `400 30px ${SANS}`;
  drawRich(ctx, '画面、音乐与计算均由 AI 编写的代码生成', W / 2, 1365, { color: C.faint });
  ctx.restore();
}

function drawCaptions(ctx, t) {
  for (const cap of CAPTIONS) drawCaption(ctx, t, cap, { x: W / 2, yZh: 1356, yEn: 1406, family: SANS, dim: C.dim });
}

// ---------------------------------------------------------------- scene
export default {
  meta: { title: '扔针算 π', output: '001-扔针算圆周率.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: DURATION,
  bitrate: 10e6,

  setup() {
    st.sim = simulate({ cols: COLS, rows: ROWS });
    st.hook = simulate({ count: HOOK_STATIC + hookDropTimes.length, seed: 31, cols: COLS, rows: ROWS });
    st.chart = buildChartPoints();
    st.bg = buildBackground();
    st.vignette = buildVignette();
    st.grain = buildGrain();
    st.card = buildCard();
    st.field = makeCanvas(W, FIELD.h);
    st.fieldG = st.field.getContext('2d');
    // Half-float backing store: a million strokes at alpha ~0.006 would stall (and shift hue
    // towards red) on an 8-bit canvas, because each increment rounds to zero.
    st.acc = makeCanvas(W, FIELD.h);
    st.accG = st.acc.getContext('2d', { colorType: 'float16' });
    st.accN = 0;
    console.log(`[scene] accumulation layer colorType: ${st.accG.getContextAttributes?.().colorType ?? 'unknown'}`);
    const e = estimate(st.sim, TOTAL);
    console.log(`[scene] seed ${SEED}: ${TOTAL} needles, ${st.sim.cum[TOTAL]} crossings, pi ~ ${e.toFixed(5)}`);
  },

  draw(ctx, t, frame) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(st.bg, 0, 0);
    drawField(ctx, t);
    drawHistory(ctx, t);
    drawFormula(ctx, t);
    drawChart(ctx, t);
    ctx.drawImage(st.vignette, 0, 0);
    drawHookTitle(ctx, t);
    drawPanel(ctx, t);
    drawReveal(ctx, t);
    drawOutro(ctx, t);
    drawCaptions(ctx, t);

    // Film grain (coarse, so it survives compression), then the final fade to black.
    ctx.globalAlpha = 0.035;
    ctx.drawImage(st.grain[frame % 4], 0, 0, W, H);
    const fade = prog(t, T.end - 0.5, 0.5);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  },

  audio(octx) {
    return buildAudio(octx, {
      sim: st.sim, hook: st.hook, DEMO_NEEDLES, hookDropTimes, HOOK_STATIC, ANIMATED, landTime, T, BEAT, BAR,
    });
  },
};
