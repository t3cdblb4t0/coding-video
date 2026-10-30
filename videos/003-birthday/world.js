// Real world: the 2014 World Cup. 32 squads of 23 players; 16 of them actually had two players
// sharing a birthday — matching the ~50.7% the maths predicts. (Reported figure, not simulated.)
import { clamp, prog, ease, drawRich, mulberry32 } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, mark } from './style.js';
import { T } from './timeline.js';

const COLS = 8;
const ROWS = 4;
const CELL = { w: 150, h: 138 };
const GRID_W = COLS * CELL.w;
const X0 = 150; // grid on the left; the 16/32 tally sits to its right
const Y0 = 292; // grid ends at y=844, clear of captions (y>935)
const LIT = (() => {
  // 16 of 32, scattered with a fixed seed (which teams is cosmetic; the count is the real fact).
  const rand = mulberry32(2014);
  const idx = [...Array(32).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return new Set(idx.slice(0, 16));
})();

function drawJersey(g, cx, cy, w, num, lit, alpha) {
  if (alpha <= 0) return;
  const h = w * 1.02;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(cx, cy);
  const body = lit ? C.amber : C.slate;
  g.fillStyle = lit ? 'rgba(255,181,71,0.18)' : 'rgba(142,162,192,0.12)';
  g.strokeStyle = body;
  g.lineWidth = lit ? 4 : 2.4;
  if (lit) {
    g.shadowColor = C.amber;
    g.shadowBlur = 22;
  }
  const sw = w * 0.5; // shoulder half-width
  const nw = w * 0.16; // neck half-width
  const p = new Path2D();
  p.moveTo(-nw, -h / 2);
  p.lineTo(-sw, -h / 2 + h * 0.12);
  p.lineTo(-sw - w * 0.16, -h / 2 + h * 0.34);
  p.lineTo(-w * 0.34, -h / 2 + h * 0.5);
  p.lineTo(-w * 0.34, h / 2);
  p.lineTo(w * 0.34, h / 2);
  p.lineTo(w * 0.34, -h / 2 + h * 0.5);
  p.lineTo(sw + w * 0.16, -h / 2 + h * 0.34);
  p.lineTo(sw, -h / 2 + h * 0.12);
  p.lineTo(nw, -h / 2);
  p.quadraticCurveTo(0, -h / 2 + h * 0.1, -nw, -h / 2);
  p.closePath();
  g.fill(p);
  g.stroke(p);
  g.shadowBlur = 0;
  g.fillStyle = lit ? C.amber : C.slate;
  g.font = `800 ${Math.round(w * 0.36)}px ${MONO}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(num), 0, h * 0.06);
  g.restore();
}

export function drawWorld(ctx, t) {
  const a = life(t, T.world + 0.05, T.outro + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `800 60px ${SANS}`;
  ctx.fillStyle = C.text;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 16;
  drawRich(ctx, [['2014 世界杯：32 支球队，每队 '], ['23 人', C.amber]], W / 2, 210);
  ctx.shadowBlur = 0;
  let lit = 0;
  for (let i = 0; i < 32; i++) {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const cx = X0 + c * CELL.w + CELL.w / 2;
    const cy = Y0 + r * CELL.h + CELL.h / 2;
    const appear = ease.outBack(prog(t, T.jerseys + i * 0.025, 0.4));
    if (appear <= 0) continue;
    const on = LIT.has(i);
    const hit = on ? ease.out(prog(t, T.jerseyHit + (i % 8) * 0.04, 0.4)) : 0;
    if (on && t >= T.jerseyHit + (i % 8) * 0.04) lit++;
    drawJersey(ctx, cx, cy, CELL.w * 0.72, i + 1, hit > 0.3, a * clamp(appear));
  }
  // Tally, to the right of the grid.
  const tally = ease.outBack(prog(t, T.jerseyHit + 0.8, 0.6));
  if (tally > 0) {
    const tx = X0 + GRID_W + 150;
    ctx.save();
    ctx.globalAlpha = a * clamp(tally);
    ctx.textAlign = 'center';
    ctx.font = `900 200px ${MONO}`;
    ctx.fillStyle = C.amber;
    ctx.shadowColor = 'rgba(255,181,71,0.5)';
    ctx.shadowBlur = 36;
    ctx.fillText('16', tx, 520);
    ctx.shadowBlur = 0;
    ctx.font = `700 56px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('/ 32 支队', tx, 600);
    ctx.font = `500 38px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText('真有人同一天生日', tx, 680);
    ctx.restore();
  }
  ctx.restore();
}

export { mark };
