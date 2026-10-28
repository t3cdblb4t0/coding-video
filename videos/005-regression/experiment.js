// 算: the core experiment (24–48 s). 10,000 cadets fly once (a dot histogram grows), the best and
// worst 10% are coloured, then everyone flies again and the two coloured groups slide towards the
// middle. Every number comes from sim.cadets() (seed 1960).
import { clamp, lerp, prog, ease, drawRich, mulberry32 } from '../../engine/kit.js';
import { drawSimTag } from '../../engine/brand.js';
import { W, C, SANS, MONO, life, pill, sx, numUnit } from './style.js';
import { T, logCount } from './timeline.js';

const AX = { x0: 160, x1: 1760, base: 790 };
const BIN = 1; // score points per column
const COL_W = (AX.x1 - AX.x0) / ((100 - 20) / BIN); // 20 px
const ROW_H = 1.1; // px per stacked cadet: the tallest column (~350 cadets) is ~385 px
const CELL = { w: COL_W - 3, h: ROW_H }; // touching rows, so each column reads as a solid bar

let st = null;
let layout = null;

// Each cadet gets a column (by first score) and a stack height, so the histogram is made of the
// actual 10,000 cadets, one cell each. Second-flight positions use the same stacking rule.
function stack(scores, order) {
  const height = new Map();
  const pos = new Float32Array(scores.length * 2);
  for (const i of order) {
    const col = Math.floor((clamp(scores[i], 20, 99.99) - 20) / BIN);
    const h = height.get(col) ?? 0;
    height.set(col, h + 1);
    pos[2 * i] = AX.x0 + (col + 0.5) * COL_W;
    pos[2 * i + 1] = AX.base - (h + 0.5) * ROW_H;
  }
  return pos;
}

export function setupExperiment(state) {
  st = state;
  const c = st.cad;
  const n = c.count;
  // Arrival order for the growing histogram (seeded shuffle, so it fills evenly).
  const rand = mulberry32(11);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const group = new Uint8Array(n); // 0 middle, 1 top 10%, 2 bottom 10%
  for (const i of c.top) group[i] = 1;
  for (const i of c.bottom) group[i] = 2;
  layout = { order, group, p1: stack(c.s1, order), p2: stack(c.s2, order) };
}

function histAxis(ctx, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(244,246,250,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(AX.x0, AX.base + 6);
  ctx.lineTo(AX.x1, AX.base + 6);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `600 34px ${MONO}`;
  ctx.fillStyle = C.faint;
  for (const v of [20, 40, 60, 80, 100]) ctx.fillText(String(v), sx(v, AX.x0, AX.x1), AX.base + 52);
  ctx.font = `500 32px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText('飞行成绩', AX.x1, AX.base + 96);
  ctx.restore();
}

function groupLabel(ctx, x, top, title, color, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 46px ${SANS}`;
  ctx.fillStyle = color;
  ctx.fillText(title, x, top);
  ctx.restore();
}

// A group's mean: a faint marker stays at the flight-1 mean, a bright one glides to flight 2, and
// an arrow between them shows the move with "80.9 → 70.9" above it.
function meanShift(ctx, m1, m2, u, color, a, y) {
  if (a <= 0) return;
  const x1 = sx(m1, AX.x0, AX.x1);
  const x2 = sx(lerp(m1, m2, u), AX.x0, AX.x1);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(244,246,250,0.35)';
  ctx.beginPath();
  ctx.moveTo(x1, y + 20);
  ctx.lineTo(x1, AX.base);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y + 20);
  ctx.lineTo(x2, AX.base);
  ctx.stroke();
  ctx.setLineDash([]);
  if (Math.abs(x2 - x1) > 30) {
    const dir = Math.sign(x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y + 20);
    ctx.lineTo(x2 - dir * 18, y + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y + 20);
    ctx.lineTo(x2 - dir * 26, y + 6);
    ctx.lineTo(x2 - dir * 26, y + 34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 64px ${MONO}`;
  ctx.fillStyle = color;
  const label = u > 0.02 ? `${m1.toFixed(1)} → ${lerp(m1, m2, u).toFixed(1)}` : m1.toFixed(1);
  ctx.fillText(label, (x1 + x2) / 2, y - 14);
  ctx.restore();
}

export function drawExperiment(ctx, t) {
  const a = life(t, T.setup + 0.05, T.why + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  const c = st.cad;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Formula banner at the top during set-up.
  const fa = life(t, T.setup + 0.2, T.pick + 0.2, 0.4, 0.3);
  if (fa > 0) {
    ctx.save();
    ctx.globalAlpha *= fa;
    ctx.textAlign = 'center';
    ctx.font = `800 64px ${SANS}`;
    drawRich(ctx, [['每次成绩 = ', C.text], ['实力', C.slate], [' + ', C.dim], ['运气', C.amber]], W / 2, 200, { align: 'center' });
    ctx.font = `500 36px ${SANS}`;
    drawRich(ctx, [['实力：每人固定　　运气：每次重新抽', C.dim]], W / 2, 262, { align: 'center' });
    ctx.restore();
  }
  drawSimTag(ctx, t, T.fill0 - 0.5, T.pick, '模拟 1 万个学员 · 每人飞两次', W / 2, 340);
  histAxis(ctx, ease.out(prog(t, T.setup + 0.4, 0.5)));
  // How many first flights are in.
  const n = logCount(t, T.fill0, T.fill1, c.count);
  // "No praise, no scolding" stamp.
  const stamp = life(t, T.noPraise, T.pick + 0.3, 0.3, 0.3);
  if (stamp > 0) {
    ctx.save();
    ctx.globalAlpha *= stamp;
    ctx.translate(1560, 470);
    ctx.rotate(-0.07);
    const s = ease.outBack(prog(t, T.noPraise, 0.4));
    ctx.scale(s, s);
    ctx.strokeStyle = C.red;
    ctx.fillStyle = C.red;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-230, -70, 460, 140, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 56px ${SANS}`;
    ctx.fillText('谁也不夸', 0, -24);
    ctx.fillText('谁也不骂', 0, 36);
    ctx.restore();
  }
  // Colour the two tails, then fly again.
  const tintTop = ease.out(prog(t, T.pickTop, 0.6));
  const tintBot = ease.out(prog(t, T.pickBot, 0.6));
  const tint = Math.min(tintTop, 1) * (t < T.pickBot ? 1 : 1);
  const uTop = ease.inOut(prog(t, T.fly2Top, 1.6));
  const uBot = ease.inOut(prog(t, T.fly2Bot, 1.6));
  const midFade = lerp(1, 0.28, ease.out(prog(t, T.pickTop, 0.6)));
  // Draw the middle, then each tail with its own progress.
  const { order, group, p1, p2 } = layout;
  const drawGroup = (g, color, uu, alpha) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = a * alpha;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const i = order[k];
      if (group[i] !== g) continue;
      const x = lerp(p1[2 * i], p2[2 * i], uu);
      const y = lerp(p1[2 * i + 1], p2[2 * i + 1], uu);
      ctx.rect(x - CELL.w / 2, y - CELL.h / 2, CELL.w, CELL.h + 0.2);
    }
    ctx.fill();
    ctx.restore();
  };
  drawGroup(0, 'rgba(142,162,192,0.6)', 0, midFade);
  drawGroup(1, tintTop > 0 ? C.amber : 'rgba(142,162,192,0.6)', uTop, tintTop > 0 ? Math.max(0.6, tintTop) : 1);
  drawGroup(2, tintBot > 0 ? C.cyan : 'rgba(142,162,192,0.6)', uBot, tintBot > 0 ? Math.max(0.6, tintBot) : 1);
  // Labels for the tails while picking.
  const la = life(t, T.pickTop, T.fly2Top + 0.2, 0.4, 0.3);
  groupLabel(ctx, sx(85, AX.x0, AX.x1), 560, '最好的 10%', C.amber, la * tintTop);
  groupLabel(ctx, sx(85, AX.x0, AX.x1), 616, '本该被夸', C.amber, la * tintTop * 0.8);
  groupLabel(ctx, sx(34, AX.x0, AX.x1), 560, '最差的 10%', C.cyan, la * tintBot);
  groupLabel(ctx, sx(34, AX.x0, AX.x1), 616, '本该被骂', C.cyan, la * tintBot * 0.8);
  // Group means: the flight-1 value stays visible and an arrow shows the move to flight 2.
  const showTop = life(t, T.fly2Top - 0.1, T.why + 0.1, 0.3, 0.4);
  const showBot = life(t, T.fly2Bot - 0.1, T.why + 0.1, 0.3, 0.4);
  meanShift(ctx, c.top1, c.top2, uTop, C.amber, showTop, 250);
  meanShift(ctx, c.bot1, c.bot2, uBot, C.cyan, showBot, 250);
  // Punchline tags: share worse / better, under the arrows.
  const pa = ease.outBack(prog(t, T.punch - 0.6, 0.45));
  if (pa > 0) {
    pill(ctx, sx((c.top1 + c.top2) / 2, AX.x0, AX.x1), 330, `${(100 * c.topWorse).toFixed(0)}% 变差`, C.amber, clamp(pa) * showTop, 44, { fill: 'rgba(255,181,71,0.16)' });
    pill(ctx, sx((c.bot1 + c.bot2) / 2, AX.x0, AX.x1), 330, `${(100 * c.botBetter).toFixed(0)}% 变好`, C.cyan, clamp(pa) * showBot, 44, { fill: 'rgba(95,201,232,0.16)' });
  }
  ctx.restore();
}

export { numUnit };
