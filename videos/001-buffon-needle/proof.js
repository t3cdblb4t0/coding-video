// "Buffon's noodle" (Barbier's proof), shown with real mini-experiments:
//   P1 longer needle -> twice the crossings;  P2 a long needle is two short ones end to end;
//   P3 bending changes nothing;  P4 a circle as wide as the gap always crosses twice, and its
//   length is π;  P5 so length 1 -> 2/π crossings = the probability;  FLIP π ≈ 2 × total ÷ crossings.
import { clamp, lerp, prog, ease, drawRich, measureRich, fmtInt } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, dot, pill, bracket, mix } from './style.js';
import { T, BEAT, logCount, logLand } from './timeline.js';
import { needleDots } from './sim.js';

let st = null;
export function setupProof(state) {
  st = state;
  // Hand-placed intro circle in the P4 floor, then nine simulated circles that keep clear of it.
  const intro = { x: 3.75, y: 1.75 };
  st.circles = state.circleSim.filter((c) => Math.hypot(c.x - intro.x, c.y - intro.y) > 1.2).slice(0, 9);
  st.firstDouble = -1;
  for (let i = 0; i < 30; i++) if (state.long.cross[i] === 2) { st.firstDouble = i; break; }
}

// ---------------------------------------------------------------- shared panel helpers
export const PANELS = {
  L: { x: 70, y: 500, w: 400, h: 580 },
  R: { x: 510, y: 500, w: 400, h: 580 },
  S: 58, // px per unit; 10 gaps per panel
};
const ROWS_P = 10;
const DOTS = 30; // first N items show their crossing points
const panelAlpha = (i) => clamp(0.9 / (1 + i / 120), 0.05, 0.9);

function panelFrame(g, r, a) {
  g.save();
  g.globalAlpha *= a;
  g.fillStyle = 'rgba(255,255,255,0.025)';
  g.fillRect(r.x, r.y - 12, r.w, r.h + 24);
  g.strokeStyle = C.line;
  g.lineWidth = 2;
  g.beginPath();
  for (let k = 0; k <= ROWS_P; k++) {
    const y = r.y + k * PANELS.S;
    g.moveTo(r.x, y);
    g.lineTo(r.x + r.w, y);
  }
  g.stroke();
  g.restore();
}

function clipPanel(g, r) {
  g.beginPath();
  g.rect(r.x, r.y - 12, r.w, r.h + 24);
  g.clip();
}

const dropIn = (t, land) => ease.out(prog(t, land - 0.05, 0.22));

function drawNeedlePanel(g, r, sim, n, t, land, { dots = true, animate = true } = {}) {
  const S = PANELS.S;
  const len = sim.len * S;
  g.save();
  clipPanel(g, r);
  g.lineCap = 'round';
  const CH = 20;
  for (let c0 = animate ? DOTS : 0; c0 < n; c0 += CH) {
    const c1 = Math.min(n, c0 + CH);
    for (const hit of [0, 1]) {
      g.globalAlpha = panelAlpha(c0 + CH / 2) * (hit ? 1 : 0.75);
      g.strokeStyle = hit ? C.amber : C.slate;
      g.lineWidth = 2.2;
      g.beginPath();
      for (let i = c0; i < c1; i++) {
        if ((sim.cross[i] > 0 ? 1 : 0) !== hit) continue;
        const dx = (sim.cos[i] * len) / 2;
        const dy = (sim.sin[i] * len) / 2;
        const X = r.x + sim.x[i] * S;
        const Y = r.y + sim.y[i] * S;
        g.moveTo(X - dx, Y - dy);
        g.lineTo(X + dx, Y + dy);
      }
      g.stroke();
    }
  }
  if (animate) {
    for (let i = 0; i < Math.min(DOTS, n); i++) {
      const p = dropIn(t, land(i));
      const sc = lerp(1.5, 1, p);
      const X = r.x + sim.x[i] * S;
      const Y = r.y + sim.y[i] * S;
      g.globalAlpha = Math.min(1, p * 2) * panelAlpha(i);
      g.strokeStyle = mix('#FFFFFF', sim.cross[i] ? C.amber : C.slate, p);
      g.lineWidth = 2.8;
      g.beginPath();
      g.moveTo(X - (sim.cos[i] * len * sc) / 2, Y - (sim.sin[i] * len * sc) / 2);
      g.lineTo(X + (sim.cos[i] * len * sc) / 2, Y + (sim.sin[i] * len * sc) / 2);
      g.stroke();
    }
  }
  g.restore();
  if (dots) {
    for (let i = 0; i < Math.min(DOTS, n); i++) {
      const p = prog(t, land(i), 0.2);
      if (p <= 0) continue;
      for (const [x, y] of needleDots(sim.x[i], sim.y[i], sim.cos[i], sim.sin[i], sim.len)) {
        const X = r.x + x * S;
        const Y = r.y + y * S;
        if (X < r.x || X > r.x + r.w) continue;
        g.save();
        g.globalAlpha *= p;
        dot(g, X, Y, 5.5, C.gold, 12);
        g.restore();
      }
    }
  }
}

function drawNoodlePanel(g, r, sim, n, t, land) {
  const S = PANELS.S;
  const P = sim.segs + 1;
  const pts = sim.pts;
  g.save();
  clipPanel(g, r);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const CH = 20;
  for (let c0 = DOTS; c0 < n; c0 += CH) {
    const c1 = Math.min(n, c0 + CH);
    for (const hit of [0, 1]) {
      g.globalAlpha = panelAlpha(c0 + CH / 2) * (hit ? 1 : 0.75);
      g.strokeStyle = hit ? C.amber : C.slate;
      g.lineWidth = 2.2;
      g.beginPath();
      for (let i = c0; i < c1; i++) {
        if ((sim.cross[i] > 0 ? 1 : 0) !== hit) continue;
        for (let k = 0; k < P; k++) {
          const X = r.x + pts[(i * P + k) * 2] * S;
          const Y = r.y + pts[(i * P + k) * 2 + 1] * S;
          if (k) g.lineTo(X, Y);
          else g.moveTo(X, Y);
        }
      }
      g.stroke();
    }
  }
  for (let i = 0; i < Math.min(DOTS, n); i++) {
    const p = dropIn(t, land(i));
    const sc = lerp(1.5, 1, p);
    const mx = pts[(i * P + (P >> 1)) * 2];
    const my = pts[(i * P + (P >> 1)) * 2 + 1];
    g.globalAlpha = Math.min(1, p * 2) * panelAlpha(i);
    g.strokeStyle = mix('#FFFFFF', sim.cross[i] ? C.amber : C.slate, p);
    g.lineWidth = 2.8;
    g.beginPath();
    for (let k = 0; k < P; k++) {
      const X = r.x + (mx + (pts[(i * P + k) * 2] - mx) * sc) * S;
      const Y = r.y + (my + (pts[(i * P + k) * 2 + 1] - my) * sc) * S;
      if (k) g.lineTo(X, Y);
      else g.moveTo(X, Y);
    }
    g.stroke();
  }
  g.restore();
  for (let i = 0; i < Math.min(DOTS, n); i++) {
    const p = prog(t, land(i), 0.2);
    if (p <= 0) continue;
    for (let k = 0; k < P - 1; k++) {
      const x0 = pts[(i * P + k) * 2];
      const y0 = pts[(i * P + k) * 2 + 1];
      const x1 = pts[(i * P + k + 1) * 2];
      const y1 = pts[(i * P + k + 1) * 2 + 1];
      for (let L = Math.ceil(Math.min(y0, y1)); L <= Math.floor(Math.max(y0, y1)); L++) {
        if (y0 === y1) continue;
        const u = (L - y0) / (y1 - y0);
        const X = r.x + (x0 + (x1 - x0) * u) * S;
        if (X < r.x || X > r.x + r.w) continue;
        g.save();
        g.globalAlpha *= p;
        dot(g, X, r.y + L * S, 5.5, C.gold, 12);
        g.restore();
      }
    }
  }
}

function panelLabel(g, r, text) {
  g.font = `600 36px ${SANS}`;
  drawRich(g, text, r.x + r.w / 2, r.y - 34);
}

function readout(g, r, avg, n, unit = '根') {
  g.font = `500 38px ${SANS}`;
  const v = avg === null ? '—' : avg.toFixed(2);
  const parts = [['平均 ', C.dim], [v, C.text], [' 次', C.dim]];
  g.font = `500 38px ${SANS}`;
  const w1 = g.measureText('平均 ').width;
  g.font = `700 56px ${MONO}`;
  const w2 = g.measureText(v).width;
  g.font = `500 38px ${SANS}`;
  const w3 = g.measureText(' 次').width;
  let x = r.x + r.w / 2 - (w1 + w2 + w3) / 2;
  const y = r.y + r.h + 74;
  g.font = `500 38px ${SANS}`;
  drawRich(g, [parts[0]], x, y, { align: 'left' });
  x += w1;
  g.font = `700 56px ${MONO}`;
  drawRich(g, [parts[1]], x, y, { align: 'left' });
  x += w2;
  g.font = `500 38px ${SANS}`;
  drawRich(g, [parts[2]], x, y, { align: 'left' });
  g.font = `400 28px ${SANS}`;
  drawRich(g, `已扔 ${fmtInt(n)} ${unit}`, r.x + r.w / 2, y + 48, { color: C.faint });
}

// ---------------------------------------------------------------- P1: length 1 vs length 2
const p1Land = (i) => logLand(i, T.p1Drop0, T.p1Drop1, 1, 1000);
function drawP1(ctx, t) {
  const a = life(t, T.p1, T.p2, 0.4, 0.35);
  if (a <= 0) return;
  const n = logCount(t, T.p1Drop0, T.p1Drop1, 1, 1000);
  const { L, R } = PANELS;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  panelFrame(ctx, L, 1);
  panelFrame(ctx, R, 1);
  panelLabel(ctx, L, [['针长 = ', C.dim], ['1', C.text]]);
  panelLabel(ctx, R, [['针长 = ', C.dim], ['2', C.amber]]);
  drawNeedlePanel(ctx, L, st.short, n, t, p1Land);
  drawNeedlePanel(ctx, R, st.long, n, t, p1Land);
  readout(ctx, L, n ? st.short.cum[n] / n : null, n);
  readout(ctx, R, n ? st.long.cum[n] / n : null, n);
  // Point at one long needle that hits two lines.
  if (st.firstDouble >= 0) {
    const i = st.firstDouble;
    const pa = life(t, Math.max(T.p1 + 3.4, p1Land(i) + 0.2), T.p1 + 6.3, 0.3, 0.3);
    if (pa > 0) {
      const X = R.x + st.long.x[i] * PANELS.S;
      const Y = R.y + st.long.y[i] * PANELS.S;
      ctx.save();
      ctx.globalAlpha = a * pa;
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X, Y, PANELS.S * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      pill(ctx, clamp(X, R.x + 70, R.x + R.w - 70), Y - PANELS.S * 1.15 - 34, '交点 2 个', C.gold, a * pa, 28);
    }
  }
  const x2 = ease.outBack(prog(t, T.p1 + 6.4, 0.45));
  if (x2 > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(x2);
    ctx.translate((L.x + L.w + R.x) / 2, L.y + L.h + 64);
    ctx.scale(x2, x2);
    ctx.font = `800 48px ${SANS}`;
    drawRich(ctx, [['×2', C.amber]], 0, 0);
    ctx.font = `400 24px ${SANS}`;
    drawRich(ctx, `实测 ×${(st.longAvg / st.shortAvg).toFixed(2)}`, 0, 40, { color: C.faint });
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- P2 + P3a: one long needle
const D = { ox: 500, oy: 745, s: 150 }; // world -> screen for the big diagram
const dx = (x) => D.ox + x * D.s;
const dy = (y) => D.oy + y * D.s;
const deg = (d) => (d * Math.PI) / 180;
const P2_DROPS = [
  { x: -0.6, y: 0.5, a: 75 }, // halves cross 1 + 1
  { x: 0.5, y: 0.3, a: 20 }, // 1 + 0
  { x: -0.2, y: 0.55, a: 160 }, // 0 + 0
];

function diagramLines(g, a) {
  g.save();
  for (let k = -2; k <= 3; k++) {
    const edge = k === -2 || k === 3;
    g.globalAlpha = a * (edge ? 0.35 : 1);
    g.strokeStyle = C.line;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, dy(k));
    g.lineTo(W, dy(k));
    g.stroke();
  }
  g.restore();
}

// Polyline of a length-2 needle around centre (cx, cy) with heading h at the joint and
// curvature profile kappa(s), s in [0, 2] measured from end A. Returns screen points + s values.
function bentPoints(cx, cy, h, kappa, N = 64) {
  const ds = 2 / N;
  const pts = new Array(N + 1);
  const mid = N / 2;
  pts[mid] = [cx, cy];
  let hh = h;
  for (let k = mid; k < N; k++) {
    const s = (k + 0.5) * ds;
    const [x, y] = pts[k];
    const hm = hh + kappa(s) * ds * 0.5;
    pts[k + 1] = [x + Math.cos(hm) * ds, y + Math.sin(hm) * ds];
    hh += kappa(s) * ds;
  }
  hh = h;
  for (let k = mid; k > 0; k--) {
    const s = (k - 0.5) * ds;
    const [x, y] = pts[k];
    const hm = hh - kappa(s) * ds * 0.5;
    pts[k - 1] = [x - Math.cos(hm) * ds, y - Math.sin(hm) * ds];
    hh -= kappa(s) * ds;
  }
  return pts;
}

function crossingsOf(pts) {
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    for (let L = Math.ceil(Math.min(y0, y1)); L <= Math.floor(Math.max(y0, y1)); L++) {
      if (y0 === y1) continue;
      const u = (L - y0) / (y1 - y0);
      out.push({ k, x: x0 + (x1 - x0) * u, y: L });
    }
  }
  return out;
}

function strokePoly(g, pts, from, to, color, width) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let k = from; k <= to; k++) {
    const X = dx(pts[k][0]);
    const Y = dy(pts[k][1]);
    if (k === from) g.moveTo(X, Y);
    else g.lineTo(X, Y);
  }
  g.stroke();
}

function drawP2(ctx, t) {
  const a = life(t, T.p2, T.p3b, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  diagramLines(ctx, 1);
  const drops = T.p2Drops;
  let k = -1;
  for (let j = 0; j < drops.length; j++) if (t >= drops[j] - 0.3) k = j;

  if (t < T.p3) {
    // Before the drops: the needle hovers, its halves labelled. Then three drops with tallies.
    let pos = { x: 0, y: -0.5, a: 0 };
    let p = 1;
    if (k >= 0) {
      pos = P2_DROPS[k];
      p = ease.out(prog(t, drops[k] - 0.3, 0.3));
    }
    const sc = lerp(1.35, 1, p);
    const pts = bentPoints(pos.x, pos.y, deg(pos.a) + (1 - p) * 0.6, () => 0).map(([x, y]) => [
      pos.x + (x - pos.x) * sc,
      pos.y + (y - pos.y) * sc,
    ]);
    const grow = ease.out(prog(t, T.p2 + 0.3, 0.5));
    const mid = pts.length >> 1;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 2);
    const ga = Math.max(0, mid - Math.round(mid * grow));
    const gb = Math.min(pts.length - 1, mid + Math.round(mid * grow));
    strokePoly(ctx, pts, ga, mid, C.amber, 10);
    strokePoly(ctx, pts, mid, gb, C.cyan, 10);
    dot(ctx, dx(pts[mid][0]), dy(pts[mid][1]), 8, '#FFFFFF');
    ctx.restore();
    if (k < 0) {
      const la = ease.out(prog(t, T.p2 + 0.9, 0.4));
      if (la > 0) {
        ctx.save();
        ctx.globalAlpha *= la;
        ctx.font = `700 40px ${SANS}`;
        drawRich(ctx, [['前半段', C.amber]], dx(-0.5), dy(-0.5) - 34);
        drawRich(ctx, [['后半段', C.cyan]], dx(0.5), dy(-0.5) - 34);
        ctx.font = `500 30px ${SANS}`;
        drawRich(ctx, '各长 1', dx(0), dy(-0.5) + 70, { color: C.dim });
        ctx.restore();
      }
    } else if (p >= 1) {
      const hits = crossingsOf(pts);
      let na = 0;
      let nb = 0;
      for (const h of hits) {
        const isA = h.k < mid;
        if (isA) na++;
        else nb++;
        const r = prog(t, drops[k], 0.25);
        dot(ctx, dx(h.x), dy(h.y), lerp(14, 8, r), isA ? C.amber : C.cyan, 16);
      }
      const ta = ease.out(prog(t, drops[k], 0.3));
      ctx.save();
      ctx.globalAlpha *= ta;
      ctx.font = `700 46px ${SANS}`;
      drawRich(ctx, [['前半 ', C.amber], [`${na}`, C.text], ['  +  ', C.faint], ['后半 ', C.cyan], [`${nb}`, C.text], ['  =  ', C.faint], [`${na + nb} 次`, C.text]], W / 2, 1200);
      ctx.restore();
    }
  } else {
    // P3a: bend at the joint, then into a noodle; finally show it as many little needles.
    const hinge = ease.inOut(prog(t, T.p3 + 0.2, 1.2));
    const wig = ease.inOut(prog(t, T.p3 + 1.6, 1.2));
    const kappa = (s) => {
      const g = Math.exp(-((s - 1) ** 2) / (2 * 0.06 ** 2)) / (0.06 * Math.sqrt(2 * Math.PI));
      const bend = 1.1 * hinge * g;
      const noodle = 2.4 * Math.sin(Math.PI * s + 0.3) + 1.6 * Math.sin(2.6 * Math.PI * s + 0.8);
      return lerp(bend, noodle, wig);
    };
    const pts = bentPoints(0, 0.45, deg(12), kappa);
    const pieces = ease.out(prog(t, T.p3 + 3.0, 0.5));
    const mid = pts.length >> 1;
    if (pieces <= 0) {
      strokePoly(ctx, pts, 0, mid, C.amber, 10);
      strokePoly(ctx, pts, mid, pts.length - 1, C.cyan, 10);
    } else {
      const NP = 8;
      const per = (pts.length - 1) / NP;
      for (let j = 0; j < NP; j++) {
        const lit = ease.out(prog(t, T.p3 + 3.0 + j * 0.12, 0.3));
        const base = j < NP / 2 ? C.amber : C.cyan;
        const col = mix(base === C.amber ? '#FFB547' : '#6FD3FF', j % 2 ? '#FFFFFF' : base === C.amber ? '#FFB547' : '#6FD3FF', lit * 0.6);
        strokePoly(ctx, pts, Math.round(j * per), Math.round((j + 1) * per), col, 10);
      }
      for (let j = 1; j < NP; j++) {
        const [x, y] = pts[Math.round(j * per)];
        ctx.save();
        ctx.globalAlpha *= pieces;
        dot(ctx, dx(x), dy(y), 4.5, '#07090E');
        ctx.restore();
      }
    }
    dot(ctx, dx(pts[mid][0]), dy(pts[mid][1]), 8, '#FFFFFF');
    const hits = crossingsOf(pts);
    for (const h of hits) dot(ctx, dx(h.x), dy(h.y), 8, h.k < mid ? C.amber : C.cyan, 16);
    const la = ease.out(prog(t, T.p3 + 3.4, 0.4));
    if (la > 0) {
      ctx.save();
      ctx.globalAlpha *= la;
      ctx.font = `600 40px ${SANS}`;
      drawRich(ctx, [['每一小段 = 一根随机落下的', C.dim], ['小针', C.text]], W / 2, 1200);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- P3b: straight vs bent
const p3Land = (i) => logLand(i, T.p3bDrop0, T.p3bDrop1, 1, 1000);
function drawP3b(ctx, t) {
  const a = life(t, T.p3b, T.p4, 0.4, 0.35);
  if (a <= 0) return;
  const n = logCount(t, T.p3bDrop0, T.p3bDrop1, 1, 1000);
  const { L, R } = PANELS;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  panelFrame(ctx, L, 1);
  panelFrame(ctx, R, 1);
  panelLabel(ctx, L, [['直针 · 长 ', C.dim], ['2', C.text]]);
  panelLabel(ctx, R, [['弯针 · 长 ', C.dim], ['2', C.amber]]);
  drawNeedlePanel(ctx, L, st.long, 1000, t, () => -1, { dots: false, animate: false });
  drawNoodlePanel(ctx, R, st.noodles, n, t, p3Land);
  readout(ctx, L, st.longAvg, 1000);
  readout(ctx, R, n ? st.noodles.cum[n] / n : null, n);
  const same = ease.outBack(prog(t, T.p3bDrop1 + 0.3, 0.45));
  if (same > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(same);
    ctx.translate((L.x + L.w + R.x) / 2, L.y + L.h + 64);
    ctx.scale(same, same);
    ctx.font = `800 48px ${SANS}`;
    drawRich(ctx, [['≈', C.amber]], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- P4: the circle
const CF = { ox: 60, oy: 520, s: 120, rows: 5 }; // circle floor: lines at y 520 ... 1120
const cx = (x) => CF.ox + x * CF.s;
const cy = (y) => CF.oy + y * CF.s;
const INTRO = { x: 3.75, y: 1.75 };

function circleDots(c) {
  const k = Math.round(c.y);
  const d = k - c.y;
  const h = Math.sqrt(Math.max(0, 0.25 - d * d));
  return [[c.x - h, k], [c.x + h, k]];
}

// Circle of diameter 1 unrolling into a straight segment of length π, anchored at its bottom.
function unrolledPoints(u, N = 160) {
  const k = 2 * (1 - u); // curvature: 2 for the circle (radius 0.5), 0 when straight
  const L = Math.PI;
  const ds = L / N;
  // Integrate outwards from the bottom point (tangent horizontal there); both halves curl upwards
  // (screen y decreases), so u = 0 gives the full circle and u = 1 a straight segment.
  const half = [];
  for (const dir of [1, -1]) {
    let x = 0;
    let y = 0;
    const side = [];
    for (let j = 1; j <= N / 2; j++) {
      const s = j * ds - ds / 2;
      x += dir * Math.cos(k * s) * ds;
      y -= Math.sin(k * s) * ds;
      side.push([x, y]);
    }
    half.push(side);
  }
  return [...half[1].reverse(), [0, 0], ...half[0]];
}

function drawP4(ctx, t) {
  const a = life(t, T.p4, T.p5, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  const linesA = 1 - ease.out(prog(t, T.unroll - 0.2, 0.4)) * 0.75;
  ctx.save();
  ctx.globalAlpha *= linesA;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k <= CF.rows; k++) {
    ctx.moveTo(0, cy(k));
    ctx.lineTo(W, cy(k));
  }
  ctx.stroke();
  ctx.restore();

  const R = CF.s / 2;
  const unroll = ease.inOut(prog(t, T.unroll, 1.6));
  // Intro circle (drawn on), with brackets showing diameter = gap.
  const draw = ease.inOut(prog(t, T.p4 + 0.2, 0.8));
  const X = cx(INTRO.x);
  const Y = cy(INTRO.y);
  if (unroll <= 0) {
    ctx.save();
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(X, Y, R, -Math.PI / 2, -Math.PI / 2 + draw * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    const pts = unrolledPoints(unroll);
    ctx.save();
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(X + x * CF.s, Y + R + y * CF.s) : ctx.moveTo(X + x * CF.s, Y + R + y * CF.s)));
    ctx.stroke();
    ctx.restore();
  }
  const br = life(t, T.p4 + 1.0, T.unroll, 0.4, 0.3);
  if (br > 0) {
    ctx.save();
    ctx.globalAlpha *= br;
    bracket(ctx, X - R - 30, Y - R, Y + R, -1, '直径', C.text, 36);
    bracket(ctx, X + R + 40, cy(1), cy(2), 1, '线距', C.dim, 36);
    ctx.restore();
  }
  // Crossing dots on the intro circle.
  if (unroll <= 0 && draw >= 1) {
    for (const [x, y] of circleDots(INTRO)) dot(ctx, cx(x), cy(y), 8, C.gold, 14);
  }
  // Nine more circles, dropped on half-beats; each shows its two crossings and a "2".
  const fade = 1 - ease.out(prog(t, T.unroll - 0.2, 0.4));
  if (fade > 0) {
    st.circles.forEach((c, j) => {
      const land = T.circleDrops[j];
      const p = ease.out(prog(t, land - 0.2, 0.2));
      if (p <= 0) return;
      const sc = lerp(1.4, 1, p);
      ctx.save();
      ctx.globalAlpha *= fade * Math.min(1, p * 2);
      ctx.strokeStyle = mix('#FFFFFF', C.slate, prog(t, land, 0.3) * 0.5);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx(c.x), cy(c.y), R * sc, 0, Math.PI * 2);
      ctx.stroke();
      if (p >= 1) {
        for (const [x, y] of circleDots(c)) dot(ctx, cx(x), cy(y), 7, C.gold, 12);
        const q = ease.outBack(prog(t, land, 0.3));
        ctx.font = `800 ${Math.round(40 * q)}px ${MONO}`;
        ctx.fillStyle = C.amber;
        ctx.textAlign = 'center';
        ctx.fillText('2', cx(c.x), cy(c.y) + 14);
      }
      ctx.restore();
    });
    const landed = st.circles.filter((_, j) => t >= T.circleDrops[j]).length + (draw >= 1 ? 1 : 0);
    const ra = ease.out(prog(t, T.circleDrops[0], 0.3));
    if (ra > 0) {
      ctx.save();
      ctx.globalAlpha *= ra * fade;
      ctx.font = `600 40px ${SANS}`;
      drawRich(ctx, [[`${landed} 个圆，每个都压线 `, C.dim], ['2', C.amber], [' 次', C.dim]], W / 2, 1200);
      ctx.restore();
    }
  }
  // Unrolled: ticks in needle lengths, and the π label.
  const tk = ease.out(prog(t, T.unroll + 1.6, 0.5));
  if (tk > 0) {
    const x0 = X - (Math.PI / 2) * CF.s;
    const yb = Y + R;
    ctx.save();
    ctx.globalAlpha *= tk;
    ctx.strokeStyle = C.amber;
    ctx.fillStyle = C.dim;
    ctx.lineWidth = 3;
    ctx.font = `600 38px ${MONO}`;
    ctx.textAlign = 'center';
    for (let k = 0; k <= 3; k++) {
      const xx = x0 + k * CF.s;
      ctx.beginPath();
      ctx.moveTo(xx, yb - 16);
      ctx.lineTo(xx, yb + 16);
      ctx.stroke();
      ctx.fillText(String(k), xx, yb + 62);
    }
    ctx.beginPath();
    ctx.moveTo(x0 + Math.PI * CF.s, yb - 24);
    ctx.lineTo(x0 + Math.PI * CF.s, yb + 24);
    ctx.stroke();
    ctx.font = `800 64px ${SANS}`;
    ctx.fillStyle = C.amber;
    ctx.fillText('π', x0 + Math.PI * CF.s + 4, yb - 44);
    ctx.font = `500 28px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.fillText('单位：针长', X, yb + 112);
    ctx.font = `600 40px ${SANS}`;
    drawRich(ctx, [['周长 = ', C.dim], ['π', C.amber], [' 根针长 ≈ 3.14', C.dim]], W / 2, 1200);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- P5: the conclusion
function drawP5(ctx, t) {
  const a = life(t, T.p5, T.flip, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 18;
  const row = (at, rich, y, size = 52, weight = 700) => {
    const r = ease.out(prog(t, at, 0.4));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.font = `${weight} ${size}px ${SANS}`;
    drawRich(ctx, rich, W / 2, y + (1 - r) * 18);
    ctx.restore();
  };
  row(T.p5 + 0.2, [['长度 ', C.dim], ['π', C.amber], ['   →   ', C.faint], ['平均压线 ', C.dim], ['2', C.text], [' 次', C.dim]], 600);
  const dv = ease.out(prog(t, T.p5 + 0.9, 0.4));
  if (dv > 0) {
    ctx.save();
    ctx.globalAlpha *= dv;
    ctx.font = `700 32px ${SANS}`;
    drawRich(ctx, [['↓ ÷π', C.amber]], 330, 662);
    drawRich(ctx, [['↓ ÷π', C.amber]], 760, 662);
    ctx.restore();
  }
  row(T.p5 + 1.4, [['长度 ', C.dim], ['1', C.text], ['   →   ', C.faint], ['平均压线 ', C.dim], ['2/π', C.amber], [' 次', C.dim]], 735);
  row(T.p5 + 3.4, [['直针最多压 1 次 ⇒ 平均次数 = 压线概率', C.dim]], 860, 38, 600);
  const big = ease.outBack(prog(t, T.p5 + 4.6, 0.45));
  if (big > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(big);
    ctx.translate(W / 2, 1000);
    ctx.scale(big, big);
    ctx.font = `800 70px ${SANS}`;
    const rich = [['压线概率 = ', C.text], ['2/', C.amber], ['π', C.amber], [' ≈ 63.7%', C.text]];
    drawRich(ctx, rich, 0, 0);
    // Circle the π once the caption says where it was hiding.
    const ring = ease.inOut(prog(t, T.p5 + 6.6, 0.8));
    if (ring > 0) {
      const total = measureRich(ctx, rich);
      const before = measureRich(ctx, rich.slice(0, 2));
      const pw = measureRich(ctx, [rich[2]]);
      const px = -total / 2 + before + pw / 2;
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(255,200,107,0.9)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, -24, 56, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  row(T.p5 + 5.4, [['刚才实测：1000 根压线 ', C.faint], [`${st.testCross}`, C.amber], [` 根 = ${(st.testCross / 10).toFixed(1)}%`, C.faint]], 1090, 30, 500);
  ctx.restore();
}

// ---------------------------------------------------------------- FLIP: solve for π
function drawFlip(ctx, t) {
  const a = life(t, T.flip, T.exp + 0.3, 0.35, 0.5);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 18;
  const r1 = ease.out(prog(t, T.flip + 0.2, 0.4));
  const r2 = ease.outBack(prog(t, T.flip + 1.4, 0.45));
  if (r1 > 0) {
    ctx.save();
    ctx.globalAlpha *= r1 * (r2 > 0 ? lerp(1, 0.45, clamp(r2)) : 1);
    ctx.font = `700 56px ${SANS}`;
    drawRich(ctx, [['压线数 ÷ 总数', C.text], ['  ≈  ', C.dim], ['2/π', C.amber]], W / 2, 760);
    ctx.restore();
  }
  if (r2 > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(r2);
    ctx.translate(W / 2, 900);
    ctx.scale(r2, r2);
    ctx.font = `800 70px ${SANS}`;
    drawRich(ctx, [['π', C.amber], ['  ≈  2 × 总数 ÷ 压线数', C.text]], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function drawProof(ctx, t) {
  if (t < T.p1 - 0.1 || t > T.exp + 0.6) return;
  drawP1(ctx, t);
  drawP2(ctx, t);
  drawP3b(ctx, t);
  drawP4(ctx, t);
  drawP5(ctx, t);
  drawFlip(ctx, t);
}

export { BEAT };
