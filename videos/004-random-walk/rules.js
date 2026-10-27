// The rule: at every corner, each of the four directions has probability 1/4. A walker hops a few
// steps with the chosen arrow lighting up (seeded, illustrative).
import { clamp, prog, ease, mulberry32, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, drawWalker } from './style.js';
import { T } from './timeline.js';

const CX = W / 2;
const CY = 540;
const ARM = 260;
const DIRS = [
  { dx: 0, dy: -1, label: '北' },
  { dx: 1, dy: 0, label: '东' },
  { dx: 0, dy: 1, label: '南' },
  { dx: -1, dy: 0, label: '西' },
];
const HOPS = (() => {
  const rand = mulberry32(4);
  return Array.from({ length: 9 }, () => Math.floor(rand() * 4));
})();
const HOP = 0.62; // seconds per hop

export function drawRules(ctx, t) {
  const a = life(t, T.rules + 0.05, T.d1 + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // Roads.
  ctx.fillStyle = 'rgba(120,140,180,0.16)';
  ctx.fillRect(CX - ARM - 60, CY - 34, 2 * ARM + 120, 68);
  ctx.fillRect(CX - 34, CY - ARM - 60, 68, 2 * ARM + 120);
  ctx.strokeStyle = 'rgba(244,246,250,0.22)';
  ctx.setLineDash([18, 16]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - ARM - 60, CY);
  ctx.lineTo(CX + ARM + 60, CY);
  ctx.moveTo(CX, CY - ARM - 60);
  ctx.lineTo(CX, CY + ARM + 60);
  ctx.stroke();
  ctx.setLineDash([]);
  // Which hop are we in?
  const k = Math.floor((t - T.ruleSpin) / HOP);
  const u = ((t - T.ruleSpin) / HOP) % 1;
  const active = t >= T.ruleSpin && k < HOPS.length ? HOPS[k] : -1;
  // Arrows + 1/4 labels.
  DIRS.forEach((d, i) => {
    const on = i === active;
    const appear = ease.outBack(prog(t, T.rules + 0.2 + i * 0.1, 0.4));
    if (appear <= 0) return;
    const tipX = CX + d.dx * (ARM - 10);
    const tipY = CY + d.dy * (ARM - 10);
    const baseX = CX + d.dx * 90;
    const baseY = CY + d.dy * 90;
    ctx.save();
    ctx.globalAlpha = a * clamp(appear);
    ctx.strokeStyle = on ? C.amber : C.slate;
    ctx.fillStyle = on ? C.amber : C.slate;
    ctx.lineWidth = on ? 10 : 7;
    ctx.lineCap = 'round';
    if (on) {
      ctx.shadowColor = C.amber;
      ctx.shadowBlur = 24;
    }
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX - d.dx * 30, tipY - d.dy * 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - d.dx * 44 - d.dy * 26, tipY - d.dy * 44 + d.dx * 26);
    ctx.lineTo(tipX - d.dx * 44 + d.dy * 26, tipY - d.dy * 44 - d.dx * 26);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Label beside the arrow tip: to the right of vertical arrows, above horizontal ones.
    const lx = tipX + (d.dy !== 0 ? 96 : -d.dx * 40);
    const ly = tipY + (d.dy !== 0 ? -d.dy * 40 : -96);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 52px ${MONO}`;
    ctx.fillStyle = on ? C.amber : C.text;
    ctx.fillText('1/4', lx, ly);
    ctx.font = `600 30px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(d.label, lx, ly + 46);
    ctx.restore();
  });
  // Walker hops out along the chosen arrow and snaps back to the crossing for the next pick.
  let wx = CX;
  let wy = CY;
  if (active >= 0) {
    const d = DIRS[active];
    const s = ease.inOut(clamp(u / 0.7));
    wx = CX + d.dx * 150 * s;
    wy = CY + d.dy * 150 * s;
  }
  drawWalker(ctx, wx, wy, 14, C.amber);
  // "随机" badge at the corner.
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `700 40px ${SANS}`;
  drawRich(ctx, [['每个路口：', C.dim], ['四选一', C.amber]], 260, 300, { align: 'left' });
  ctx.restore();
}
