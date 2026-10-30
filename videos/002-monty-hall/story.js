// Hook, rules and gut-feeling sections.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, life, pill, arcArrow } from './style.js';
import { drawDoor, drawCar, drawGoat, stageFloor } from './doors.js';
import { T, BEAT } from './timeline.js';

// ---------------------------------------------------------------- hook (also the cover frame)
export function drawHook(ctx, t) {
  const a = 1 - ease.in(prog(t, T.rules - 0.3, 0.3));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Doors on the right: door 1 picked, door 3 open (goat), arrow 1 -> 2 "换？".
  const dw = 200;
  const dh = 300;
  const xs = [1050, 1310, 1570];
  const top = 340;
  stageFloor(ctx, 990, 1830, top + dh + 2);
  const glow = 0.75 + 0.25 * Math.sin(t * 4);
  xs.forEach((x, k) => drawDoor(ctx, { x, y: top, w: dw, h: dh, num: k + 1, open: k === 2 ? 1 : 0, content: k === 2 ? 'goat' : null, highlight: k === 0 ? glow : 0 }));
  pill(ctx, xs[0] + dw / 2, top - 46, '你选的', C.amber, 1, 30);
  arcArrow(ctx, xs[0] + dw * 0.7, top - 80, xs[1] + dw * 0.4, top - 60, 90, 1, C.amber, 6);
  pill(ctx, (xs[0] + xs[1] + dw) / 2 + 10, top - 175, '换？', C.amber, 1, 40, { fill: 'rgba(255,181,71,0.16)' });
  // Title block on the left.
  ctx.textAlign = 'left';
  ctx.font = `700 34px ${SANS}`;
  ctx.letterSpacing = '6px';
  ctx.fillStyle = C.amber;
  ctx.fillText('算给你看 · 02', 150, 300);
  ctx.letterSpacing = '0px';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 24;
  ctx.font = `900 150px ${SANS}`;
  drawRich(ctx, '三门问题', 140, 470, { align: 'left' });
  ctx.font = `900 96px ${SANS}`;
  const pulse = Math.max(0, 1 - Math.abs(t - BEAT) / 0.35);
  ctx.shadowColor = `rgba(255,181,71,${0.3 + 0.6 * pulse})`;
  ctx.shadowBlur = 24 + 40 * pulse;
  drawRich(ctx, [['换', C.amber], ['，还是不换？']], 146, 600, { align: 'left' });
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.font = `700 40px ${SANS}`;
  drawRich(ctx, [['全程真实计算', C.text], ['  ·  ', C.faint], ['结尾有反转', C.amber]], 150, 690, { align: 'left' });
  ctx.font = `400 34px ${SANS}`;
  drawRich(ctx, 'The Monty Hall problem: switch or stay?', 150, 750, { align: 'left', color: C.dim });
  ctx.restore();
}

// ---------------------------------------------------------------- rules + gut feeling
export const STAGE = { w: 240, h: 360, top: 300, xs: [500, 840, 1180] };

// Items above the doors shuffle, then fly into the doors (we never see which door gets the car).
function drawLegend(ctx, t) {
  const a = life(t, T.legend, T.legend + 3.2, 0.3, 0.01);
  if (a <= 0) return;
  const { w, xs, top } = STAGE;
  const order = ['car', 'goat', 'goat'];
  // Three swaps: (0,1), (1,2), (0,2), each 0.35 s.
  const slots = [0, 1, 2];
  const swaps = [[0, 1], [1, 2], [0, 2]];
  const sw0 = T.legend + 1.2;
  let pos = slots.map((s) => xs[s] + w / 2);
  let lift = [0, 0, 0];
  let cur = [0, 1, 2]; // cur[item] = slot
  swaps.forEach(([i, j], k) => {
    const u = ease.inOut(prog(t, sw0 + k * 0.38, 0.34));
    const ii = cur.indexOf(i);
    const jj = cur.indexOf(j);
    if (u >= 1) {
      cur[ii] = j;
      cur[jj] = i;
    } else if (u > 0) {
      pos = cur.map((s) => xs[s] + w / 2);
      pos[ii] = lerp(xs[i] + w / 2, xs[j] + w / 2, u);
      pos[jj] = lerp(xs[j] + w / 2, xs[i] + w / 2, u);
      lift[ii] = Math.sin(u * Math.PI) * 40;
      lift[jj] = -Math.sin(u * Math.PI) * 40;
    }
  });
  if (t >= sw0 + 3 * 0.38) {
    pos = cur.map((s) => xs[s] + w / 2);
    lift = [0, 0, 0];
  }
  const fly = ease.in(prog(t, T.legend + 2.5, 0.6));
  ctx.save();
  ctx.globalAlpha = a;
  const appear = ease.outBack(prog(t, T.legend, 0.4));
  order.forEach((item, k) => {
    const x = pos[k];
    const y = lerp(top - 40 - lift[k], top + STAGE.h * 0.62, fly);
    const s = lerp(1, 0.35, fly) * appear;
    const alpha = 1 - clamp((fly - 0.6) / 0.4);
    if (item === 'car') drawCar(ctx, x, y, 170 * s, alpha);
    else drawGoat(ctx, x, y, 130 * s, alpha);
  });
  ctx.restore();
}

export function drawRules(ctx, t) {
  const a = life(t, T.rules + 0.05, T.hist + 0.1, 0.35, 0.35);
  if (a <= 0) return;
  const { w, h, top, xs } = STAGE;
  ctx.save();
  ctx.globalAlpha = a;
  stageFloor(ctx, 380, 1540, top + h + 2);
  const pick = ease.out(prog(t, T.pick, 0.4));
  const open3 = ease.inOut(prog(t, T.hostOpen, 0.7));
  xs.forEach((x, k) => {
    const drop = ease.out(prog(t, T.rules + 0.05 + k * 0.08, 0.4));
    drawDoor(ctx, {
      x, y: top - (1 - drop) * 30, w, h, num: k + 1, alpha: drop,
      open: k === 2 ? open3 : 0, content: k === 2 ? 'goat' : null, highlight: k === 0 ? pick : 0,
    });
  });
  drawLegend(ctx, t);
  ctx.textBaseline = 'alphabetic';
  // Labels above the doors.
  const gut = prog(t, T.fifty, 0.3);
  pill(ctx, xs[0] + w / 2, top - 50, '你选的', C.amber, pick * (1 - gut), 32);
  const host = life(t, T.hostTag, T.offer, 0.3, 0.3);
  pill(ctx, xs[2] + w / 2, top - 50, '主持人开门', C.slate, host, 32);
  const offer = ease.out(prog(t, T.offer, 0.6)) * (1 - gut);
  arcArrow(ctx, xs[0] + w * 0.65, top - 95, xs[1] + w * 0.4, top - 70, 70, offer, C.amber, 6);
  pill(ctx, (xs[0] + xs[1] + w) / 2 + 20, top - 160, '换？', C.amber, ease.outBack(prog(t, T.offer + 0.45, 0.35)) * (1 - gut), 40, { fill: 'rgba(255,181,71,0.16)' });
  // Gut feeling: 50% / 50%, then "真的吗？".
  const f = ease.outBack(prog(t, T.fifty, 0.4));
  if (f > 0) {
    for (const k of [0, 1]) pill(ctx, xs[k] + w / 2, top - 55, '50%', C.text, clamp(f), 44, { fill: 'rgba(7,9,14,0.85)' });
  }
  const r = ease.outBack(prog(t, T.really, 0.4));
  if (r > 0) {
    ctx.save();
    ctx.translate(1590, top + h / 2);
    ctx.rotate(-0.08);
    ctx.scale(r, r);
    ctx.font = `900 92px ${SANS}`;
    ctx.shadowColor = 'rgba(255,181,71,0.5)';
    ctx.shadowBlur = 30;
    drawRich(ctx, [['真的吗？', C.amber]], 0, 30);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- outro
export function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 22;
  const r1 = ease.out(prog(t, T.outro + 0.1, 0.5));
  ctx.globalAlpha = r1;
  ctx.font = `900 110px ${SANS}`;
  drawRich(ctx, [['直觉会骗人，'], ['计算不会', C.amber]], 960, 380 + (1 - r1) * 20);
  ctx.globalAlpha = ease.out(prog(t, T.outro + 0.6, 0.5));
  ctx.font = `400 38px ${SANS}`;
  drawRich(ctx, "Intuition can fool you. Numbers don't.", 960, 456, { color: C.dim });
  const b = ease.outBack(prog(t, T.outro + BEAT * 1.5, 0.45));
  if (b > 0) {
    ctx.globalAlpha = clamp(b);
    ctx.save();
    ctx.translate(960, 570);
    ctx.scale(b, b);
    ctx.shadowBlur = 0;
    ctx.font = `700 36px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 2 期';
    const w = ctx.measureText(label).width + 60;
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -40, w, 74, 37);
    ctx.stroke();
    ctx.fillStyle = C.amber;
    ctx.textAlign = 'center'; // drawRich leaves textAlign at 'left'
    ctx.fillText(label, 2, 10);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 2, 0.5));
  ctx.font = `600 46px ${SANS}`;
  drawRich(ctx, [['下期：', C.amber], ['23 个人里，有两人同一天生日的概率超过一半？', C.text]], 960, 690);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3, 0.5));
  ctx.font = `700 44px ${SANS}`;
  drawRich(ctx, [['关注我，', C.text], ['下期继续算给你看', C.amber]], 960, 780);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3.5, 0.5)) * 0.9;
  ctx.font = `400 28px ${SANS}`;
  drawRich(ctx, '本片所有随机实验的种子均提前固定，结果未经挑选 · 画面与计算均由 AI 编写的代码生成', 960, 960, { color: C.faint });
  ctx.restore();
}

export { W };
