// The three experiments. Each has a picture on the left (sample paths, drawn only) and the same
// right-hand panel: ▶ sim tag, step counter, big "回过家" percentage and a curve over log(steps).
// All percentages come from the counted runs (10,000 walkers x 10,000 steps, seeds 1/2/3).
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { drawSimTag } from '../../engine/brand.js';
import { W, C, SANS, MONO, life, drawHouse, drawWalker, drawBird } from './style.js';
import { T, stepsAt } from './timeline.js';

const LEFT = { x0: 140, x1: 1000, y0: 210, y1: 900 };
const CX = (LEFT.x0 + LEFT.x1) / 2;
const CY = (LEFT.y0 + LEFT.y1) / 2;
const PANEL = { x: 1100, w: 700 };
const CURVE = { x: 1100, y: 600, w: 680, h: 230 };
const HUES = ['#5FC9E8', '#8EA2C0', '#B79CFF', '#7FD1B9', '#9DB4FF', '#C9A7FF', '#6EC1FF', '#A6C8E0'];

let st = null;
export function setupDims(state) {
  st = state;
}

// ---------------------------------------------------------------- shared right-hand panel
function panel(ctx, t, { sim, t0, t1, word, color, limit = null, limitLabel = '', limitAt = Infinity, rising = false }) {
  const n = stepsAt(t, t0, t1, 10000);
  const rate = n > 0 ? sim.rate(n) : 0;
  drawSimTag(ctx, t, t0 - 0.6, t1 + 0.8, `模拟 1 万${word} × 1 万步`, PANEL.x + 300, 210);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `500 36px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('已走', PANEL.x, 318);
  ctx.font = `700 54px ${MONO}`;
  ctx.fillStyle = C.text;
  const ns = n.toLocaleString('en-US');
  ctx.fillText(ns, PANEL.x + 84, 322);
  const nw = ctx.measureText(ns).width;
  ctx.font = `500 36px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('步', PANEL.x + 84 + nw + 14, 318);
  ctx.fillText(word === '只鸟' ? '回过巢的' : '回过家的', PANEL.x, 400);
  ctx.font = `900 150px ${MONO}`;
  ctx.fillStyle = color;
  if (t >= t1) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
  }
  ctx.fillText(`${(100 * rate).toFixed(1)}%`, PANEL.x, 545);
  ctx.restore();
  // Curve: x = log10(steps) 0..4, y = 0..100%.
  const px = (lg) => CURVE.x + (lg / 4) * CURVE.w;
  const py = (p) => CURVE.y + CURVE.h - p * CURVE.h;
  ctx.save();
  ctx.strokeStyle = 'rgba(244,246,250,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CURVE.x, CURVE.y);
  ctx.lineTo(CURVE.x, CURVE.y + CURVE.h);
  ctx.lineTo(CURVE.x + CURVE.w, CURVE.y + CURVE.h);
  ctx.stroke();
  ctx.font = `400 24px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'center';
  ['1', '10', '100', '1千', '1万'].forEach((s, k) => ctx.fillText(s, px(k), CURVE.y + CURVE.h + 34));
  ctx.textAlign = 'right';
  ctx.fillText('100%', CURVE.x - 10, CURVE.y + 8);
  ctx.fillText('0', CURVE.x - 10, CURVE.y + CURVE.h + 8);
  if (limit !== null) {
    const la = ease.out(prog(t, limitAt, 0.5));
    if (la > 0) {
      ctx.globalAlpha = la;
      ctx.setLineDash([10, 9]);
      ctx.strokeStyle = C.amber;
      ctx.beginPath();
      ctx.moveTo(CURVE.x, py(limit));
      ctx.lineTo(CURVE.x + CURVE.w, py(limit));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'right';
      ctx.font = `600 28px ${SANS}`;
      ctx.fillStyle = C.amber;
      ctx.fillText(limitLabel, CURVE.x + CURVE.w, py(limit) - 14);
      ctx.globalAlpha = 1;
    }
  }
  if (n >= 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const top = Math.log10(n);
    for (let k = 0; k <= 200; k++) {
      const lg = (top * k) / 200;
      const X = px(lg);
      const Y = py(sim.rate(Math.round(10 ** lg)));
      if (k === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    const hx = px(top);
    const hy = py(rate);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(hx, hy, 7, 0, Math.PI * 2);
    ctx.fill();
    if (rising && t >= t1) {
      ctx.textAlign = 'right';
      ctx.font = `700 30px ${SANS}`;
      ctx.fillStyle = color;
      ctx.fillText('还在涨 ↑', hx - 18, hy + 46);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- 1D: a line, as a space-time diagram
function drawD1(ctx, t) {
  const a = life(t, T.d1 + 0.05, T.d2 + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  const paths = st.p1.paths;
  const SX = 13; // px per unit of position
  const SY = (LEFT.y1 - LEFT.y0 - 60) / 600; // px per step
  const top = LEFT.y0 + 40;
  const n = Math.min(600, Math.floor(clamp((t - T.d1Run0) / (T.d1Run1 - T.d1Run0)) * 600));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Home line.
  ctx.strokeStyle = 'rgba(255,181,71,0.55)';
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, top);
  ctx.lineTo(CX, LEFT.y1 - 20);
  ctx.stroke();
  ctx.setLineDash([]);
  drawHouse(ctx, CX, top - 28, 34, C.home, 1, 0.6);
  ctx.textAlign = 'left';
  ctx.font = `500 26px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.fillText('← 左', LEFT.x0, top - 14);
  ctx.textAlign = 'right';
  ctx.fillText('右 →', LEFT.x1, top - 14);
  ctx.save();
  ctx.translate(LEFT.x0 - 10, (top + LEFT.y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('时间 ↓', 0, 0);
  ctx.restore();
  // Paths.
  ctx.beginPath();
  ctx.rect(LEFT.x0, top, LEFT.x1 - LEFT.x0, LEFT.y1 - top);
  ctx.clip();
  paths.forEach((p, w) => {
    const xs = p[0];
    ctx.strokeStyle = HUES[w % HUES.length];
    ctx.globalAlpha = a * 0.45;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let s = 0; s <= n; s++) {
      const X = CX + xs[s] * SX;
      const Y = top + s * SY;
      if (s === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    const fr = st.p1.firstReturn[w];
    if (fr > 0 && fr <= n) {
      ctx.globalAlpha = a;
      ctx.fillStyle = C.amber;
      ctx.beginPath();
      ctx.arc(CX, top + fr * SY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  panel(ctx, t, { sim: st.s1, t0: T.d1Run0, t1: T.d1Run1, word: '人', color: C.amber });
  ctx.restore();
}

// ---------------------------------------------------------------- 2D: a city grid, from above
function drawD2(ctx, t) {
  const a = life(t, T.d2 + 0.05, T.wait + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  const paths = st.p2.paths;
  const S = 9;
  const n = Math.min(1500, Math.floor(clamp((t - T.d2Run0) / (T.d2Run1 - T.d2Run0)) * 1500));
  ctx.save();
  ctx.globalAlpha = a;
  // Faint street grid.
  ctx.strokeStyle = C.street;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = CX - 46 * S; x <= CX + 46 * S; x += 4 * S) {
    ctx.moveTo(x, LEFT.y0);
    ctx.lineTo(x, LEFT.y1);
  }
  for (let y = CY - 36 * S; y <= CY + 36 * S; y += 4 * S) {
    ctx.moveTo(LEFT.x0, y);
    ctx.lineTo(LEFT.x1, y);
  }
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(LEFT.x0, LEFT.y0, LEFT.x1 - LEFT.x0, LEFT.y1 - LEFT.y0);
  ctx.clip();
  paths.forEach((p, w) => {
    const [xs, ys] = p;
    ctx.strokeStyle = HUES[w % HUES.length];
    ctx.globalAlpha = a * 0.5;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let s = 0; s <= n; s++) {
      const X = CX + xs[s] * S;
      const Y = CY - ys[s] * S;
      if (s === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.globalAlpha = a;
    drawWalker(ctx, CX + xs[n] * S, CY - ys[n] * S, 4.5, HUES[w % HUES.length]);
  });
  ctx.restore();
  drawHouse(ctx, CX, CY - 2, 30, C.home, 1, 0.8);
  panel(ctx, t, { sim: st.s2, t0: T.d2Run0, t1: T.d2Run1, word: '人', color: C.amber, limit: 1, limitLabel: '理论：迟早 100%', limitAt: T.d2Proof, rising: true });
  ctx.restore();
}

// ---------------------------------------------------------------- 3D: birds, projected
function project(x, y, z, th) {
  const S = 8.5;
  const tilt = 0.42;
  const xr = x * Math.cos(th) - z * Math.sin(th);
  const zr = x * Math.sin(th) + z * Math.cos(th);
  return [CX + xr * S, CY - (y * Math.cos(tilt) - zr * Math.sin(tilt)) * S];
}

function drawD3(ctx, t) {
  const a = life(t, T.d3 + 0.05, T.why + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  const paths = st.p3.paths;
  const n = Math.min(1500, Math.floor(clamp((t - T.d3Run0) / (T.d3Run1 - T.d3Run0)) * 1500));
  const th = 0.5 + (t - T.d3) * 0.12;
  ctx.save();
  ctx.globalAlpha = a;
  // Wire cube for depth.
  const R = 36;
  const corners = [];
  for (const x of [-R, R]) for (const y of [-R, R]) for (const z of [-R, R]) corners.push([x, y, z]);
  ctx.strokeStyle = 'rgba(150,170,210,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const d = corners[i].reduce((s, v, k) => s + (v !== corners[j][k] ? 1 : 0), 0);
      if (d !== 1) continue;
      const [x0, y0] = project(...corners[i], th);
      const [x1, y1] = project(...corners[j], th);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
  ctx.stroke();
  // Axes through the nest.
  ctx.strokeStyle = 'rgba(150,170,210,0.28)';
  ctx.beginPath();
  for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    const [x0, y0] = project(-R * dx, -R * dy, -R * dz, th);
    const [x1, y1] = project(R * dx, R * dy, R * dz, th);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(LEFT.x0, LEFT.y0, LEFT.x1 - LEFT.x0, LEFT.y1 - LEFT.y0);
  ctx.clip();
  paths.forEach((p, w) => {
    const [xs, ys, zs] = p;
    ctx.strokeStyle = HUES[w % HUES.length];
    ctx.globalAlpha = a * 0.45;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let s = 0; s <= n; s++) {
      const [X, Y] = project(xs[s], ys[s], zs[s], th);
      if (s === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.globalAlpha = a;
    const [hx, hy] = project(xs[n], ys[n], zs[n], th);
    drawBird(ctx, hx, hy, 18, '#FFFFFF', t * 9 + w, 1);
  });
  ctx.restore();
  // Nest at the origin.
  const [nx, ny] = project(0, 0, 0, th);
  ctx.save();
  ctx.fillStyle = C.home;
  ctx.shadowColor = C.home;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(nx, ny, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 28px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.fillText('巢', nx, ny + 46);
  panel(ctx, t, { sim: st.s3, t0: T.d3Run0, t1: T.d3Run1, word: '只鸟', color: C.violet, limit: 0.3405, limitLabel: '理论极限 34.05%', limitAt: T.d3Run1 - 1.0 });
  // "66% 永远回不去" stamp.
  const nv = ease.outBack(prog(t, T.d3Never, 0.45));
  if (nv > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(nv);
    ctx.translate(PANEL.x + 640, 330);
    ctx.rotate(-0.08);
    ctx.scale(nv * 0.9, nv * 0.9);
    ctx.strokeStyle = C.red;
    ctx.fillStyle = C.red;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-150, -62, 300, 124, 14);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 60px ${MONO}`;
    ctx.fillText('66%', 0, -16);
    ctx.font = `800 30px ${SANS}`;
    ctx.fillText('永远回不去', 0, 34);
    ctx.restore();
  }
  ctx.restore();
}

export function drawDims(ctx, t) {
  drawD1(ctx, t);
  drawD2(ctx, t);
  drawD3(ctx, t);
}

export { lerp, drawRich };
