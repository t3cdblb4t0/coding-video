// 算: why it happens (48–62.4 s). Stacked bars: score = skill + luck, for the "praised" (best 10%)
// and "scolded" (worst 10%) groups, flight 1 then flight 2. Numbers are the group averages from
// sim.cadets(); luck is shown as rounded score − rounded skill so the sums add up on screen.
//
// Layout (y): title 150 · group titles 268 · takeaway 330 · bar tops >= 420 · baseline 860 ·
// bar labels 912. Bars start at score 20, not 0, so differences are readable; the axis says so.
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life } from './style.js';
import { T, r1, luck } from './timeline.js';

const BASE = 860; // y of score FLOOR
const FLOOR = 20;
const PX = 6.6; // px per score point: 80.9 -> 402 px tall, top at y = 458
const BAR_W = 160;
const GX = [400, 700, 1220, 1520];

let st = null;
export function setupWhy(state) {
  st = state;
}

const yOf = (v) => BASE - (v - FLOOR) * PX;

// One stacked bar at centre x: skill (slate) up to `skill`, then luck (may be negative).
function bar(ctx, x, skill, lk, color, a, grow = 1) {
  if (a <= 0) return;
  const ySkill = yOf(FLOOR + (skill - FLOOR) * grow);
  const yTop = ySkill - lk * PX * grow;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = C.skill;
  ctx.fillRect(x - BAR_W / 2, ySkill, BAR_W, BASE - ySkill);
  if (lk > 0.05) {
    ctx.fillStyle = color;
    ctx.fillRect(x - BAR_W / 2, yTop, BAR_W, ySkill - yTop);
  } else if (lk < -0.05) {
    // Bad luck: the top of the skill bar is "cut away" and hatched.
    ctx.fillStyle = 'rgba(6,8,15,0.9)';
    ctx.fillRect(x - BAR_W / 2, ySkill, BAR_W, yTop - ySkill);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - BAR_W / 2 + 1.5, ySkill + 1.5, BAR_W - 3, yTop - ySkill - 3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - BAR_W / 2, ySkill, BAR_W, yTop - ySkill);
    ctx.clip();
    ctx.lineWidth = 2;
    for (let k = -200; k < 200; k += 16) {
      ctx.beginPath();
      ctx.moveTo(x - BAR_W / 2 + k, ySkill);
      ctx.lineTo(x - BAR_W / 2 + k + 120, yTop);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// The value sits above the bar's highest point (skill or score, whichever is higher, so a
// bad-luck bar's number clears the hatched notch).
function value(ctx, x, v, top, a, color = C.text) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 56px ${MONO}`;
  ctx.fillStyle = color;
  ctx.fillText(v.toFixed(1), x, yOf(top) - 22);
  ctx.restore();
}

// Bracket + label beside a bar segment between scores v0 and v1 (side = 1 right, -1 left).
function seg(ctx, x, v0, v1, text, color, a, side) {
  if (a <= 0) return;
  const y0 = yOf(Math.max(v0, v1));
  const y1 = yOf(Math.min(v0, v1));
  const bx = x + side * (BAR_W / 2 + 18);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - side * 10, y0);
  ctx.lineTo(bx, y0);
  ctx.lineTo(bx, y1);
  ctx.lineTo(bx - side * 10, y1);
  ctx.stroke();
  ctx.textAlign = side > 0 ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `700 38px ${SANS}`;
  ctx.fillStyle = color;
  ctx.fillText(text, bx + side * 16, (y0 + y1) / 2);
  ctx.restore();
}

export function drawWhy(ctx, t) {
  const a = life(t, T.why + 0.05, T.coins + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  const c = st.cad;
  const ts = r1(c.topSkill);
  const bs = r1(c.botSkill);
  const tl1 = +luck(c.top1, c.topSkill);
  const tl2 = +luck(c.top2, c.topSkill);
  const bl1 = +luck(c.bot1, c.botSkill);
  const bl2 = +luck(c.bot2, c.botSkill);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `800 60px ${SANS}`;
  drawRich(ctx, [['成绩 = ', C.text], ['实力', C.slate], [' + ', C.dim], ['运气', C.amber]], W / 2, 150, { align: 'center' });
  // Baseline and floor note.
  ctx.strokeStyle = 'rgba(244,246,250,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, BASE);
  ctx.lineTo(1700, BASE);
  ctx.stroke();
  // In the gap between the two groups (bars end at x 780 and start at 1140), clear of every bar.
  ctx.font = `500 26px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'center';
  ctx.fillText('柱子从 20 分画起', W / 2, BASE - 12);
  // Group titles.
  ctx.textAlign = 'center';
  ctx.font = `800 44px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.fillText('最好的 10%（本该被夸）', (GX[0] + GX[1]) / 2, 268);
  const scoldA = ease.out(prog(t, T.whyBot - 0.3, 0.5));
  ctx.globalAlpha = a * scoldA;
  ctx.fillStyle = C.cyan;
  ctx.fillText('最差的 10%（本该被骂）', (GX[2] + GX[3]) / 2, 268);
  ctx.globalAlpha = a;
  // Bar labels.
  const lab = (x, s, al) => {
    if (al <= 0) return;
    ctx.save();
    ctx.globalAlpha *= al;
    ctx.font = `600 36px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.textAlign = 'center';
    ctx.fillText(s, x, BASE + 50);
    ctx.restore();
  };
  // Praised group.
  const grow = ease.out(prog(t, T.why + 0.6, 0.8));
  const lk1 = ease.out(prog(t, T.whyTop1, 0.6));
  bar(ctx, GX[0], ts, tl1 * lk1, C.amber, 1, grow);
  lab(GX[0], '第一次', 1);
  value(ctx, GX[0], ts + tl1 * lk1, FLOOR + (ts + tl1 * lk1 - FLOOR) * grow, grow);
  seg(ctx, GX[0], FLOOR, ts, `实力 ${ts.toFixed(1)}`, C.slate, ease.out(prog(t, T.why + 1.4, 0.5)), -1);
  seg(ctx, GX[0], ts, ts + tl1, `好运 +${tl1.toFixed(1)}`, C.amber, ease.out(prog(t, T.whyTop1 + 0.4, 0.5)), -1);
  const t2 = ease.out(prog(t, T.whyTop2, 0.6));
  bar(ctx, GX[1], ts, tl2, C.amber, t2);
  lab(GX[1], '第二次', t2);
  value(ctx, GX[1], ts + tl2, ts + tl2, t2);
  seg(ctx, GX[1], ts, ts + Math.max(tl2, 1.5), `运气 +${tl2.toFixed(1)}`, C.amber, ease.out(prog(t, T.whyTop2 + 0.4, 0.5)), 1);
  // Scolded group.
  bar(ctx, GX[2], bs, bl1, C.cyan, scoldA);
  lab(GX[2], '第一次', scoldA);
  value(ctx, GX[2], bs + bl1, bs, scoldA);
  seg(ctx, GX[2], bs + bl1, bs, `坏运 ${bl1.toFixed(1)}`, C.cyan, ease.out(prog(t, T.whyBot + 0.3, 0.5)), -1);
  const b2 = ease.out(prog(t, T.whyBot + 0.8, 0.6));
  bar(ctx, GX[3], bs, bl2, C.cyan, b2);
  lab(GX[3], '第二次', b2);
  value(ctx, GX[3], bs + bl2, bs + bl2, b2);
  seg(ctx, GX[3], bs, bs + Math.max(bl2, 1.5), `运气 +${bl2.toFixed(1)}`, C.cyan, ease.out(prog(t, T.whyBot + 1.2, 0.5)), 1);
  // Takeaway once both pairs are shown.
  const k = ease.outBack(prog(t, T.whyBot + 1.6, 0.45));
  if (k > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(k);
    ctx.textAlign = 'center';
    ctx.font = `900 56px ${SANS}`;
    drawRich(ctx, [['实力会留下，', C.text], ['运气不会', C.amber]], W / 2, 350, { align: 'center' });
    ctx.restore();
  }
  ctx.restore();
}
