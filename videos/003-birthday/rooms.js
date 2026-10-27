// The payoff: 10,000 rooms at once. The head-count sweeps 1 -> 60; a room turns amber once it
// contains a shared birthday. A live probability curve crosses 50% at 23 people.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, mix } from './style.js';
import { T } from './timeline.js';

const GRID = { x: 150, y: 250, cols: 100, rows: 100, cell: 6 }; // 600x600, ends at (750, 850)
const PANEL_X = 880;
const CHART = { x: 880, y: 640, w: 880, h: 210, maxN: 60 };

let st = null;
export function setupRooms(state) {
  st = state;
}

// Head-count at time t: ramp 1 -> 23, hold on 23 (so the 50% crossing lands with the caption),
// then 23 -> 60.
function headcount(t) {
  if (t < T.sweepStart) return 1;
  if (t < T.cross50) return Math.round(lerp(1, 23, (t - T.sweepStart) / (T.cross50 - T.sweepStart)));
  if (t < T.holdEnd) return 23;
  return Math.min(60, Math.round(lerp(23, 60, (t - T.holdEnd) / (T.sweepEnd - T.holdEnd))));
}

export function drawRooms(ctx, t) {
  const a = life(t, T.rooms + 0.1, T.callback + 0.15, 0.4, 0.35);
  if (a <= 0) return;
  const N = headcount(t);
  const rate = st.rooms.rate(N);
  // The single room from the previous section collapses into the grid.
  const shrink = ease.inOut(prog(t, T.shrink, 1.4));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';

  // Grid of rooms.
  const gAlpha = ease.out(prog(t, T.shrink + 0.6, 0.6));
  if (gAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = a * gAlpha;
    const { x, y, cols, rows, cell } = GRID;
    const fm = st.rooms.firstMatch;
    // Base layer: all rooms faint.
    ctx.fillStyle = 'rgba(142,162,192,0.18)';
    ctx.fillRect(x, y, cols * cell, rows * cell);
    // Amber rooms (match already happened at this head-count). Batch into one path.
    ctx.fillStyle = C.amber;
    ctx.beginPath();
    for (let r = 0; r < cols * rows; r++) {
      if (fm[r] <= N) {
        const cx = x + (r % cols) * cell;
        const cy = y + Math.floor(r / cols) * cell;
        ctx.rect(cx, cy, cell - 1, cell - 1);
      }
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cols * cell, rows * cell);
    ctx.restore();
    // Caption under the grid.
    ctx.globalAlpha = a * gAlpha;
    ctx.textAlign = 'center';
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.fillText('1 万个房间，每个小格 = 一间', GRID.x + GRID.cols * GRID.cell / 2, GRID.y + GRID.rows * GRID.cell + 46);
  }

  // Right panel: head-count and the live percentage.
  const pa = ease.out(prog(t, T.sweepStart - 0.3, 0.5));
  if (pa > 0) {
    ctx.save();
    ctx.globalAlpha = a * pa;
    ctx.textAlign = 'left';
    ctx.font = `500 40px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('每间房', PANEL_X, 318);
    const nx = PANEL_X + 180;
    ctx.font = `900 130px ${MONO}`;
    ctx.fillStyle = C.text;
    ctx.fillText(String(N), nx, 330);
    const numW = ctx.measureText(String(N)).width;
    ctx.font = `500 40px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('人', nx + numW + 18, 318);
    // Percentage.
    const over = rate >= 0.5;
    ctx.font = `500 36px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('有人撞生日的房间', PANEL_X, 470);
    ctx.font = `900 150px ${MONO}`;
    if (over) {
      ctx.shadowColor = 'rgba(255,181,71,0.5)';
      ctx.shadowBlur = 34;
    }
    ctx.fillStyle = over ? C.amber : C.text;
    ctx.fillText(`${(100 * rate).toFixed(1)}%`, PANEL_X, 590);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Probability curve.
  const ca = ease.out(prog(t, T.sweepStart + 0.2, 0.5));
  if (ca > 0) {
    drawCurve(ctx, t, N, a * ca);
  }
  ctx.restore();
}

function drawCurve(ctx, t, N, alpha) {
  const { x, y, w, h, maxN } = CHART;
  const px = (n) => x + (clamp(n / maxN, 0, 1)) * w;
  const py = (p) => y + h - p * h;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Axes.
  ctx.strokeStyle = 'rgba(244,246,250,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  // 50% line.
  ctx.setLineDash([10, 9]);
  ctx.strokeStyle = 'rgba(255,181,71,0.7)';
  ctx.beginPath();
  ctx.moveTo(x, py(0.5));
  ctx.lineTo(x + w, py(0.5));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `600 28px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.textAlign = 'left';
  ctx.fillText('50%', x + w + 10, py(0.5) + 9);
  // Axis ticks for N.
  ctx.font = `400 24px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'center';
  for (const n of [1, 23, 40, 60]) ctx.fillText(String(n), px(n), y + h + 34);
  // Curve up to current N.
  ctx.strokeStyle = C.text;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let n = 1; n <= N; n++) {
    const X = px(n);
    const Y = py(st.rooms.rate(n));
    if (n === 1) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.stroke();
  // Head marker.
  ctx.fillStyle = C.text;
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(px(N), py(st.rooms.rate(N)), 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // "23 过半" callout once N reaches 23.
  const cross = ease.outBack(prog(t, T.cross50, 0.5));
  if (cross > 0) {
    ctx.globalAlpha = alpha * clamp(cross);
    const cx = px(23);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx, py(0.5));
    ctx.lineTo(cx, y + h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
