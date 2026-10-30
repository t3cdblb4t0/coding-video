// The main floor: hook needles, the close-up rule and demo drops, the 1,000-needle test,
// the million-needle experiment, plus the counters and the convergence chart.
import { clamp, lerp, prog, ease, envelope, drawRich, measureRich, fmtInt } from '../../engine/kit.js';
import { W, C, SANS, MONO, makeCanvas, mix, lineNeedle, bigNeedle, ripple, pill, bracket } from './style.js';
import { T, BEAT, needleCount, landTime } from './timeline.js';
import { estimate, TOTAL } from './sim.js';

// World units: line spacing = needle length = 1.
export const ROWS = 9;
export const COLS = 14.8;
// Layout keeps clear of Douyin's overlays: top bar (y < ~220), right icon column
// (x > ~930, y 900-1600) and the bottom description block (y > ~1520).
export const FIELD = { top: 482, bottom: 1142 };
FIELD.h = FIELD.bottom - FIELD.top;
const SCY = FIELD.h / 2; // camera centre, field-local
export const WIDE = 70;
const DROP = 0.28; // seconds a needle takes to fall in
const ANIMATED = 40; // first N test needles get a falling animation (and their own sound)

export const HOOK_STATIC = 70;
export const hookDropTimes = Array.from({ length: 15 }, (_, k) => 0.15 + k * 0.15);

const deg = (d) => (d * Math.PI) / 180;
const mk = (x, y, a) => ({ x, y, cos: Math.cos(deg(a)), sin: Math.sin(deg(a)) });
// Visible window at the demo zoom is x 4.7-10.1, y 2.8-6.2; each needle clears or misses a seam
// by at least 0.12 units so nobody has to squint.
const D0 = T.setup + 7.2; // 19.2
export const DEMO_NEEDLES = [
  { ...mk(6.3, 4.2, 62), t: D0, label: '压线' },
  { ...mk(8.6, 4.5, 158), t: D0 + 2 * BEAT, label: '未压线' },
  { ...mk(5.5, 4.75, 120), t: D0 + 2.5 * BEAT },
  { ...mk(9.0, 3.55, 35), t: D0 + 2.75 * BEAT },
  { ...mk(7.5, 4.95, 80), t: D0 + 3 * BEAT },
  { ...mk(6.9, 3.55, 15), t: D0 + 3.25 * BEAT },
].map((n) => ({ ...n, cross: Math.floor(n.y + 0.5 * n.sin) - Math.floor(n.y - 0.5 * n.sin) }));

const PI_STR = '3.14159';
let st = null;

export function setupField(state) {
  st = state;
  st.field = makeCanvas(W, FIELD.h);
  st.fieldG = st.field.getContext('2d');
  // Half-float backing store: a million strokes at alpha ~0.006 would stall (and drift towards
  // red) on an 8-bit canvas, because each increment rounds to zero.
  st.acc = makeCanvas(W, FIELD.h);
  st.accG = st.acc.getContext('2d', { colorType: 'float16' });
  st.accN = 0;
  st.chart = [];
  let last = 0;
  for (let k = 0; k <= 600; k++) {
    const n = Math.round(10 ** (k / 100));
    if (n === last) continue;
    last = n;
    st.chart.push({ n, lx: Math.log10(n), e: estimate(st.sim, n) });
  }
}

// ---------------------------------------------------------------- camera + visibility
function cameraScale(t) {
  // Wide while the seams draw in ("think of them as parallel lines"), then push in for the needle.
  if (t < T.ruleIn - 0.6) return WIDE;
  if (t < T.demoZoom) return lerp(WIDE, 300, ease.inOut(prog(t, T.ruleIn - 0.6, 0.7)));
  if (t < T.test) return lerp(300, 200, ease.inOut(prog(t, T.demoZoom, 0.5)));
  return lerp(200, WIDE, ease.inOut(prog(t, T.test, BEAT)));
}

export function fieldAlpha(t) {
  if (t < T.hist) return 1;
  if (t < T.setup - 0.3) return lerp(1, 0.2, ease.out(prog(t, T.hist, 0.4)));
  if (t < T.setup) return lerp(0.2, 0, prog(t, T.setup - 0.3, 0.25));
  if (t < T.mystery) return ease.out(prog(t, T.setup, 0.35));
  if (t < T.p1 - 0.35) return lerp(1, 0.25, ease.out(prog(t, T.mystery, 0.4)));
  if (t < T.exp) return lerp(0.25, 0, prog(t, T.p1 - 0.35, 0.3));
  if (t < T.reveal) return ease.out(prog(t, T.exp, 0.5));
  if (t < T.twist) return lerp(1, 0.2, ease.out(prog(t, T.reveal, 0.5)));
  return lerp(0.2, 0.12, prog(t, T.twist, 0.5));
}

const toScreen = (s, x, y) => [W / 2 + (x - COLS / 2) * s, SCY + (y - ROWS / 2) * s];

// ---------------------------------------------------------------- needles
// A needle falling into place: starts larger (closer to the camera), rotated, with a long
// shadow; it falls white and takes its colour (amber = crosses, slate = misses) on landing.
function fallingNeedle(g, s, n, t, land, big) {
  const p = prog(t, land - DROP, DROP);
  if (p <= 0) return;
  const q = p * p;
  const [X, Y] = toScreen(s, n.x, n.y);
  const a = Math.atan2(n.sin, n.cos) + (1 - q) * 0.7;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const scale = lerp(1.7, 1, q);
  const shadow = lerp(34, 3, q) * (s / WIDE) ** 0.5;
  const len = s * scale;
  g.save();
  g.globalAlpha *= Math.min(1, p * 2.5);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = big ? s * 0.03 : 3;
  g.beginPath();
  lineNeedle(g, X + shadow, Y + shadow * 1.2, cos, sin, len);
  g.stroke();
  if (big) bigNeedle(g, X, Y, cos, sin, len, s * 0.032, '#FFFFFF');
  else {
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 2.6 * scale;
    g.beginPath();
    lineNeedle(g, X, Y, cos, sin, len);
    g.stroke();
  }
  g.restore();
}

const needleAlpha = (i) => clamp(0.95 / (1 + i / 800), 0.006, 0.95);
const SLATE_ALPHA = 0.7;

// Experiment needles accumulate on a persistent layer (only ever drawn at the wide scale).
// Output is identical whether frames are rendered in order or jumped to directly.
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
  const B = 512; // past 2048 needles, draw complete batches with one stroke per colour
  g.lineWidth = 1.7;
  for (; i >= INDIVIDUAL && i + B <= n; i += B) {
    for (const c of [0, 1]) {
      g.globalAlpha = needleAlpha(i + B / 2) * (c ? 1 : SLATE_ALPHA);
      g.strokeStyle = c ? C.amber : C.slate;
      g.beginPath();
      for (let k = i; k < i + B; k++) {
        if ((cross[k] ? 1 : 0) !== c) continue;
        const [X, Y] = toScreen(WIDE, x[k], y[k]);
        lineNeedle(g, X, Y, cos[k], sin[k], WIDE);
      }
      g.stroke();
    }
  }
  st.accN = i;
  g.globalAlpha = 1;
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
      ripple(g, X, Y, t, land, nd.cross ? C.amber : C.slate, 46);
    }
  });
}

function drawCloseUp(g, t, s) {
  const out = 1 - prog(t, T.test, 0.35);
  if (out <= 0) return;
  g.save();
  g.globalAlpha *= out;

  // Rule: a vertical needle exactly spanning two seams, with labelled brackets.
  const ruleA = envelope(t, T.ruleIn, T.demoZoom + 0.3, 0.3, 0.35);
  if (ruleA > 0) {
    g.save();
    g.globalAlpha *= ruleA;
    const [X, Y] = toScreen(s, COLS / 2, ROWS / 2);
    const grow = ease.out(prog(t, T.ruleIn + 0.2, 0.5));
    const len = s * grow;
    bigNeedle(g, X, Y - s / 2 + len / 2, 0, 1, len, s * 0.032, '#E9EEF6');
    const lab = ease.out(prog(t, T.ruleIn + 0.75, 0.4));
    if (lab > 0) {
      g.globalAlpha *= lab;
      bracket(g, X - 150, Y - s / 2, Y + s / 2, -1, '线距', C.dim);
      bracket(g, X + 150, Y - s / 2, Y - s / 2 + len, 1, '针长', C.text);
      const eq = ease.outBack(prog(t, T.ruleIn + 1.2, 0.35));
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

  for (const n of DEMO_NEEDLES) {
    if (t < n.t) {
      fallingNeedle(g, s, n, t, n.t, true);
      continue;
    }
    const [X, Y] = toScreen(s, n.x, n.y);
    const after = prog(t, n.t, 0.35);
    bigNeedle(g, X, Y, n.cos, n.sin, s, s * 0.032, mix('#FFFFFF', n.cross ? C.amber : C.slate, after), n.cross ? 1 - after * 0.55 : 0);
    ripple(g, X, Y, t, n.t, n.cross ? C.amber : C.slate, s / 2.4);
    if (n.label) pill(g, X, Y - s * 0.62, n.label, n.cross ? C.amber : C.slate, ease.out(prog(t, n.t + 0.1, 0.3)));
  }
  g.restore();
}

// Seams. During the set-up they draw in from the left, one after another.
function drawSeams(g, t, s) {
  g.lineWidth = s > 150 ? 3 : 2;
  g.strokeStyle = C.line;
  for (let k = 0; k <= ROWS; k++) {
    const Y = SCY + (k - ROWS / 2) * s;
    if (Y < -10 || Y > FIELD.h + 10) continue;
    let reach = 1;
    if (t >= T.setup && t < T.setup + 2) reach = ease.inOut(prog(t, T.linesIn + 0.25 * (k % 3), 0.9));
    if (reach <= 0) continue;
    g.beginPath();
    g.moveTo(0, Y);
    g.lineTo(W * reach, Y);
    g.stroke();
  }
}

export function drawField(ctx, t) {
  const a = fieldAlpha(t);
  if (a <= 0.001) return;
  const g = st.fieldG;
  const s = cameraScale(t);
  g.clearRect(0, 0, W, FIELD.h);
  drawSeams(g, t, s);

  if (t < T.hist + 0.6) drawHookNeedles(g, t);
  else if (t >= T.setup && t < T.test + 0.5) drawCloseUp(g, t, s);
  if (t >= T.testDrop0 - DROP) {
    syncAccumulation(needleCount(t));
    g.drawImage(st.acc, 0, 0);
    for (let i = 0; i < ANIMATED; i++) {
      const land = landTime(i);
      const nd = { x: st.sim.x[i], y: st.sim.y[i], cos: st.sim.cos[i], sin: st.sim.sin[i], cross: st.sim.cross[i] };
      if (t < land) fallingNeedle(g, WIDE, nd, t, land, false);
      else if (i < 12) {
        // Only the first few get a ripple; dozens at once read as bubbles.
        const [X, Y] = toScreen(WIDE, nd.x, nd.y);
        ripple(g, X, Y, t, land, nd.cross ? C.amber : C.slate, 34);
      }
    }
  }

  // Feather the top and bottom edges into the background.
  g.save();
  g.globalCompositeOperation = 'destination-out';
  for (const [y0, y1] of [[0, 70], [FIELD.h, FIELD.h - 70]]) {
    const lg = g.createLinearGradient(0, y0, 0, y1);
    lg.addColorStop(0, 'rgba(0,0,0,1)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg;
    g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  }
  g.restore();

  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(st.field, 0, FIELD.top);
  ctx.restore();
}

export const ANIMATED_NEEDLES = ANIMATED;

// ---------------------------------------------------------------- counters
export function piDigits(e) {
  if (e === null) return [['—', C.dim]];
  const s = e.toFixed(5);
  let k = 0;
  while (k < s.length && s[k] === PI_STR[k]) k++;
  return [[s.slice(0, k), C.gold], [s.slice(k), C.text]].filter(([x]) => x.length);
}

function counters(ctx, n, c) {
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
}

export function drawPanel(ctx, t) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Test phase: crossing ratio, then the theoretical value.
  const ta = ease.out(prog(t, T.testDrop0 - 0.2, 0.4)) * (1 - prog(t, T.mystery, 0.35));
  if (ta > 0) {
    const n = needleCount(t);
    const c = st.sim.cum[n];
    ctx.globalAlpha = ta;
    counters(ctx, n, c);
    ctx.font = `500 40px ${SANS}`;
    const label = '压线比例 ';
    const pct = n ? `${((100 * c) / n).toFixed(1)}%` : '—';
    const lw = ctx.measureText(label).width;
    ctx.font = `700 84px ${MONO}`;
    const pw = ctx.measureText(pct).width;
    const x0 = W / 2 - (lw + pw) / 2;
    ctx.font = `500 40px ${SANS}`;
    drawRich(ctx, label, x0, 392, { align: 'left', color: C.dim });
    ctx.font = `700 84px ${MONO}`;
    drawRich(ctx, pct, x0 + lw, 392, { align: 'left', color: C.text });
    const th = ease.out(prog(t, T.theory, 0.4));
    if (th > 0) {
      ctx.globalAlpha = ta * th;
      ctx.font = `600 36px ${SANS}`;
      drawRich(ctx, [['理论值  ', C.dim], ['2/π ≈ 63.7%', C.amber]], W / 2, 452 + (1 - th) * 12);
    }
  }
  // Experiment phase: π estimate; at the reveal it moves to the centre and grows.
  const ea = ease.out(prog(t, T.exp + 0.1, 0.5)) * (1 - prog(t, T.twist, 0.35));
  if (ea > 0) {
    const n = needleCount(t);
    const c = st.sim.cum[n];
    const e = estimate(st.sim, n);
    ctx.globalAlpha = ea * (1 - 0.0 * prog(t, T.reveal, 0.4));
    counters(ctx, n, c);
    ctx.font = `500 30px ${SANS}`;
    ctx.globalAlpha = ea * (1 - prog(t, T.reveal, 0.4));
    drawRich(ctx, [['π', C.amber], [' ≈ 2 × 总数 ÷ 压线数', C.dim]], W / 2, 446);
    ctx.globalAlpha = ea;
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
  }
  ctx.restore();
}

// ---------------------------------------------------------------- convergence chart
export function drawChart(ctx, t) {
  const a = ease.out(prog(t, T.exp + 0.3, 0.4)) * (1 - prog(t, T.reveal, 0.3));
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
  ctx.restore();
}

export { TOTAL };
