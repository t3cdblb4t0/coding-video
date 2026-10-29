// 86.4-134.4 s (想): two everyday versions of the same mistake, drawn with the film's one rule
// (red dashed = the ones nobody sees): an old fridge, and the growth tips in your feed; the method;
// 「算完了，想一想」; back to the opening plane; the outro with the comment question.
// The fridge and the phone are illustrations, not data (see 分镜.md).
import { lerp, prog, ease } from '../../engine/kit.js';
import { developText, drawDenominator } from '../../engine/film.js';
import { drawThinkCard } from '../../engine/brand.js';
import { W, C, SANS, SONG, life } from './style.js';
import { T, pct, n } from './timeline.js';
import { drawCallback } from './act1.js';

const SEAL = '#B5402C';
let st = null;

export function setupAct3(state) {
  st = state;
}

// An old fridge, line art: body, freezer door, two handles, feet.
function fridge(ctx, x, y, s, { color, alpha = 1, dash = null, glow = 14 }) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.lineWidth = 3 / s;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash.map((d) => d / s));
  ctx.fillStyle = 'rgba(255,248,234,0.03)';
  ctx.beginPath();
  ctx.roundRect(-80, -150, 160, 300, 16);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-80, -52);
  ctx.lineTo(80, -52);
  ctx.stroke();
  ctx.lineWidth = 6 / s;
  ctx.beginPath();
  ctx.moveTo(56, -128);
  ctx.lineTo(56, -82);
  ctx.moveTo(56, -28);
  ctx.lineTo(56, 44);
  ctx.stroke();
  ctx.lineWidth = 3 / s;
  ctx.beginPath();
  ctx.moveTo(-58, 150);
  ctx.lineTo(-58, 164);
  ctx.moveTo(58, 150);
  ctx.lineTo(58, 164);
  ctx.stroke();
  ctx.restore();
}

function drawFridges(ctx, t) {
  const a = life(t, T.life + 0.05, T.phone + 0.1, 0.5, 0.5);
  if (a <= 0) return;
  const row = ease.inOut(prog(t, T.fridgeRow, 0.7));
  const s = lerp(1.05, 0.6, row);
  const cy = lerp(420, 460, row);
  ctx.save();
  ctx.globalAlpha = a;
  // The rest of the batch: in white (same batch), then red dashed (broke), then gone.
  for (let k = 0; k < 11; k++) {
    if (k === 5) continue;
    const d = Math.abs(k - 5);
    const ra = ease.out(prog(t, T.fridgeRow + 0.3 + d * 0.06, 0.4));
    if (ra <= 0) continue;
    const broke = prog(t, T.fridgeRow + 1.0 + d * 0.05, 0.3) >= 1;
    const gone = ease.in(prog(t, T.fridgeRow + 1.8 + (k % 3) * 0.14, 1.3));
    fridge(ctx, 960 + (k - 5) * 140, cy + 90 * gone, 0.6, {
      color: broke ? C.lost : C.hole, alpha: ra * (1 - gone) * (broke ? 0.9 : 0.6), dash: broke ? [9, 7] : null, glow: 8,
    });
  }
  fridge(ctx, 960, cy, s, { color: C.hole, glow: 18 });
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 30px ${SANS}`;
  developText(ctx, '1996 年买的，还在用', 960, cy + 172 * s + 46, t, T.life + 0.5, { color: C.dim });
  ctx.restore();
  const ia = life(t, T.life + 0.6, T.phone, 0.4, 0.4);
  drawDenominator(ctx, { seen: '1', seenLabel: '还在用的', total: '?', totalLabel: '当年那一批', alpha: a * ia, alphaTotal: prog(t, T.fridgeRow + 0.9, 1.0) });
}

function phone(ctx, x, y, s, { color, alpha = 1, dash = null, rot = 0, glow = 12 }) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.lineWidth = 3 / s;
  if (dash) ctx.setLineDash(dash.map((d) => d / s));
  ctx.fillStyle = 'rgba(8,12,24,0.9)';
  ctx.beginPath();
  ctx.roundRect(-150, -270, 300, 540, 38);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-34, -254, 68, 14, 7);
  ctx.stroke();
  ctx.restore();
}

function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
}

const FANS = [12, 0, 37, 5, 103, 2, 58, 0, 9, 21, 4, 76]; // illustration: accounts that tried the same tips

function drawPhones(ctx, t) {
  const a = life(t, T.phone + 0.05, T.method + 0.1, 0.5, 0.5);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // Behind: the same three tips, on accounts that did not take off. Nobody sees them.
  FANS.forEach((f, k) => {
    const d = k - 5.5;
    const ra = ease.out(prog(t, T.phoneStack + Math.abs(d) * 0.05, 0.4));
    if (ra <= 0) return;
    const fade = 1 - 0.55 * ease.inOut(prog(t, T.phoneStack + 1.5, 1.0));
    const x = 960 + d * 122;
    const y = 470 + Math.abs(d) * 8;
    phone(ctx, x, y, 0.6, { color: C.lost, alpha: ra * fade * 0.85, dash: [8, 7], rot: d * 0.045, glow: 6 });
    ctx.save();
    ctx.globalAlpha = a * ra * fade * 0.85;
    ctx.translate(x, y);
    ctx.rotate(d * 0.045);
    ctx.font = `600 26px ${SANS}`;
    ctx.fillStyle = C.lost;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${f} 粉`, 0, 40);
    ctx.restore();
  });
  // In front: the one you see.
  const fa = ease.out(prog(t, T.phone, 0.5));
  phone(ctx, 960, 450, 0.95, { color: C.hole, alpha: fa, glow: 18 });
  ctx.save();
  ctx.globalAlpha = a * fa;
  ctx.translate(960, 450);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,248,234,0.25)';
  ctx.beginPath();
  ctx.arc(-92, -186, 22, 0, 6.283);
  ctx.fill();
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('@一个做起来的号', -58, -178);
  ctx.textAlign = 'center';
  ctx.font = `700 42px ${SANS}`;
  ctx.fillStyle = C.text;
  ctx.fillText('我靠这 3 招', 0, -70);
  ctx.fillText('一个月', 0, -12);
  ctx.font = `700 50px ${SANS}`;
  ctx.fillStyle = C.gold;
  ctx.fillText('涨粉 10 万', 0, 56);
  ctx.fillStyle = C.lost;
  heart(ctx, -52, 160, 14);
  ctx.textAlign = 'left';
  ctx.font = `500 26px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('2.3 万', -30, 170);
  ctx.textAlign = 'center';
  ctx.font = `400 18px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.fillText('示意', 0, 226);
  ctx.restore();
  ctx.restore();
  const ia = life(t, T.phone + 0.5, T.method, 0.4, 0.4);
  drawDenominator(ctx, { seen: '1', seenLabel: '讲经验的', total: '?', totalLabel: '用了这 3 招的', alpha: a * ia, alphaTotal: prog(t, T.phoneStack + 0.6, 1.0) });
}

const STEPS = ['找没回来的飞机', '数一数有多少', '看成功占几成'];

function drawMethod(ctx, t) {
  const a = life(t, T.method + 0.05, T.think + 0.2, 0.5, 0.5);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'middle';
  STEPS.forEach((s, k) => {
    const x = 400 + k * 560;
    const y = 300;
    const on = prog(t, T.steps[k], 0.4);
    const next = k < 2 ? T.steps[k + 1] : T.think;
    const active = t >= T.steps[k] && t < next;
    const col = on > 0 ? C.gold : 'rgba(255,248,234,0.3)';
    ctx.save();
    ctx.globalAlpha = a * (on > 0 ? (active ? 1 : 0.62) : 0.55);
    if (active) {
      ctx.shadowColor = C.gold;
      ctx.shadowBlur = 22;
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.roundRect(x - 230, y - 58, 460, 116, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x - 168, y, 28, 0, 6.283);
    ctx.stroke();
    ctx.font = `700 32px ${SANS}`;
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.fillText(String(k + 1), x - 168, y + 1);
    ctx.font = `600 38px ${SANS}`;
    ctx.fillStyle = on > 0 ? C.text : 'rgba(255,248,234,0.45)';
    ctx.textAlign = 'left';
    ctx.fillText(s, x - 122, y + 1);
    ctx.restore();
  });
  // The fraction the three steps build.
  const fa = ease.out(prog(t, T.steps[0] + 0.5, 0.6));
  if (fa > 0) {
    ctx.globalAlpha = a * fa;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 66px ${SONG}`;
    ctx.fillStyle = C.text;
    ctx.fillText('成功的', 960, 588);
    ctx.fillStyle = 'rgba(255,248,234,0.8)';
    ctx.fillRect(780, 614, 360, 3);
    ctx.save();
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 18;
    ctx.fillStyle = C.gold;
    ctx.fillText('试过的', 960, 698);
    ctx.restore();
  }
  const ba = ease.out(prog(t, T.steps[1] + 0.3, 0.5));
  if (ba > 0) {
    ctx.globalAlpha = a * ba;
    ctx.strokeStyle = C.lost;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.roundRect(800, 634, 320, 92, 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = C.lost;
    ctx.textAlign = 'center';
    ctx.fillText('没成功的那些，你看不见', 960, 780);
  }
  if (t >= T.steps[2]) {
    ctx.globalAlpha = a;
    ctx.font = `700 66px ${SONG}`;
    developText(ctx, [['= 几成？', C.gold]], 1170, 640, t, T.steps[2] + 0.3, { align: 'left', glow: 16, glowColor: 'rgba(246,207,126,0.6)' });
  }
  ctx.restore();
}

function drawThink(ctx, t) {
  drawThinkCard(ctx, t, {
    t0: T.think + 0.1,
    t1: T.callback + 0.2,
    episode: 6,
    lines: [
      { text: [['成功的人，值得学。']], at: T.think + 0.8 },
      { text: [['可只听他们讲，你看到的永远是'], ['机翼上的洞', SEAL], ['。']], at: T.think + 2.6 },
      { text: [['这不是叫你别冒险，']], at: T.think + 6.0 },
      { text: [['是冒险之前，先数一数'], ['没回来的', SEAL], ['。']], at: T.think + 8.4 },
    ],
    question: [['听到成功经验，先问：没成功的有多少？']],
    questionAt: T.think + 10.2,
  });
}

function drawOutro(ctx, t) {
  if (t < T.outro) return;
  const pp = st.people;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 78px ${SONG}`;
  developText(ctx, [['你一开始选的是 '], ['A、B 还是 C', C.gold], ['？']], 960, 300, t, T.outro + 0.2);
  ctx.font = `500 36px ${SANS}`;
  developText(ctx, '评论区打一个字母就行', 960, 372, t, T.outro + 0.9, { color: C.dim });
  const b = ease.out(prog(t, T.outro + 1.8, 0.5));
  if (b > 0) {
    ctx.save();
    ctx.globalAlpha = b;
    ctx.font = `600 32px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 6 期';
    const w = ctx.measureText(label).width + 60;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(960 - w / 2, 466, w, 64, 32);
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'center';
    ctx.fillText(label, 962, 509);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  ctx.font = `600 38px ${SANS}`;
  developText(ctx, [['关注，'], ['每期用代码算一个反直觉的问题，再想一想', C.gold]], 960, 612, t, T.outro + 2.6);
  ctx.font = `500 34px ${SANS}`;
  developText(ctx, [['下期：', C.gold], [`all in 的人平均变成本金的 ${Math.floor(pp.gamblerMean)} 倍多，为什么 ${pct(pp.gamblerBelowStart)} 的人亏了钱？`]], 960, 690, t, T.outro + 3.6);
  ctx.globalAlpha = 0.95 * ease.out(prog(t, T.outro + 4.6, 0.8));
  ctx.font = `400 21px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'center';
  ctx.fillText('文献线索 · A. Wald, A Method of Estimating Plane Vulnerability Based on Damage of Survivors (1943; CRC 432 重印, 1980)', 960, 800);
  ctx.fillText("M. Mangel & F. J. Samaniego, Abraham Wald's Work on Aircraft Survivability, JASA 79 (1984) · B. Casselman, The Legend of Abraham Wald, AMS (2016)", 960, 834);
  ctx.fillText(`飞机和人的数字都是示意模拟（${n(st.model.sorties)} 架次 · ${n(pp.n)} 人），种子事先固定 · 冰箱和手机是示意 · 「想一想」是我们的引申 · 画面与计算均由 AI 编写的代码生成`, 960, 868);
  ctx.restore();
}

export function drawAct3(ctx, t) {
  if (t < T.life - 0.2) return;
  drawFridges(ctx, t);
  drawPhones(ctx, t);
  drawMethod(ctx, t);
  drawThink(ctx, t);
  drawCallback(ctx, t, T.callback, T.outro + 0.4);
  drawOutro(ctx, t);
}

export { W };
