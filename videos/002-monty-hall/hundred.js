// 100 doors: pick door 1, the host opens 98 goat doors, two remain; then the key insight.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { C, SANS, life, pill } from './style.js';
import { drawDoor, stageFloor } from './doors.js';
import { T } from './timeline.js';

let st = null;
const G = { cols: 20, w: 62, h: 88, px: 84, py: 124, y0: 196 };
G.x0 = (1920 - (G.cols * G.px - (G.px - G.w))) / 2;
const STAGE = { w: 210, h: 310, top: 330, xs: [640, 1070] };

export function setupHundred(state) {
  st = state;
  const h = st.hundred;
  st.hOpenAt = new Float32Array(100).fill(Infinity);
  h.order.forEach((d, k) => (st.hOpenAt[d] = T.hOpen0 + (k * (T.hOpen1 - T.hOpen0 - 0.25)) / (h.order.length - 1)));
}

const slot = (d) => ({ x: G.x0 + (d % G.cols) * G.px, y: G.y0 + Math.floor(d / G.cols) * G.py, w: G.w, h: G.h });

export function drawHundred(ctx, t) {
  const a = life(t, T.hundred + 0.05, T.twist + 0.1, 0.35, 0.4);
  if (a <= 0) return;
  const h = st.hundred;
  const keyDim = 1 - 0.93 * ease.inOut(prog(t, T.key, 0.6));
  const focus = ease.inOut(prog(t, T.hFocus, 1.0));
  ctx.save();
  ctx.globalAlpha = a * keyDim;
  ctx.textBaseline = 'alphabetic';
  // The two remaining doors are drawn last so they sit on top once they move to centre stage.
  const drawOrder = [];
  for (let d = 0; d < 100; d++) if (d !== h.pick && d !== h.keep) drawOrder.push(d);
  drawOrder.push(h.pick, h.keep);
  for (const d of drawOrder) {
    const appear = ease.out(prog(t, T.hundred + 0.1 + d * 0.008, 0.35));
    if (appear <= 0) continue;
    const s = slot(d);
    const remaining = d === h.pick || d === h.keep;
    let { x, y, w, h: dh } = s;
    if (remaining && focus > 0) {
      const k = d === h.pick ? 0 : 1;
      x = lerp(s.x, STAGE.xs[k], focus);
      y = lerp(s.y, STAGE.top, focus);
      w = lerp(s.w, STAGE.w, focus);
      dh = lerp(s.h, STAGE.h, focus);
    }
    const open = remaining ? (d === h.keep ? ease.inOut(prog(t, T.hReveal, 0.6)) : 0) : ease.inOut(prog(t, st.hOpenAt[d], 0.25));
    const dimOthers = remaining ? 1 : 1 - 0.75 * focus;
    drawDoor(ctx, {
      x, y: y - (1 - appear) * 20, w, h: dh, num: d + 1, open, alpha: appear * dimOthers,
      content: h.car === d ? 'car' : 'goat', highlight: d === h.pick ? ease.out(prog(t, T.hundred + 1.2, 0.3)) : d === h.keep ? 0.6 * focus : 0,
    });
  }
  if (focus > 0) stageFloor(ctx, 520, 1400, STAGE.top + STAGE.h + 2, focus);
  // Labels.
  const p1 = life(t, T.hundred + 1.2, T.hFocus + 0.2, 0.3, 0.3);
  const s1 = slot(h.pick);
  pill(ctx, s1.x + G.w / 2, s1.y - 30, '你选的', C.amber, p1, 24);
  const lab = ease.outBack(prog(t, T.hLabels, 0.4));
  if (lab > 0) {
    pill(ctx, STAGE.xs[0] + STAGE.w / 2, STAGE.top - 56, '1/100', C.slate, clamp(lab), 46);
    pill(ctx, STAGE.xs[1] + STAGE.w / 2, STAGE.top - 56, '99/100', C.amber, clamp(lab), 46, { fill: 'rgba(255,181,71,0.16)' });
    ctx.save();
    ctx.globalAlpha *= clamp(lab);
    ctx.textAlign = 'center';
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('你的门', STAGE.xs[0] + STAGE.w / 2, STAGE.top + STAGE.h + 50);
    ctx.fillText('他留下的门', STAGE.xs[1] + STAGE.w / 2, STAGE.top + STAGE.h + 50);
    ctx.restore();
  }
  const opened = h.order.filter((d) => t >= st.hOpenAt[d] + 0.2).length;
  const oa = life(t, T.hOpen0, T.hFocus + 0.6, 0.3, 0.4);
  if (oa > 0) {
    ctx.save();
    ctx.globalAlpha *= oa;
    ctx.textAlign = 'center';
    ctx.font = `600 34px ${SANS}`;
    drawRich(ctx, [['主持人已开 ', C.dim], [`${opened}`, C.text], [' 扇，全是羊', C.dim]], 960, 140);
    ctx.restore();
  }
  ctx.restore();
}

export function drawKey(ctx, t) {
  const a = life(t, T.key + 0.1, T.twist, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 26;
  const r1 = ease.out(prog(t, T.key + 0.2, 0.45));
  ctx.globalAlpha = a * r1;
  ctx.font = `900 108px ${SANS}`;
  drawRich(ctx, [['主持人'], ['知道', C.amber], ['车在哪']], 960, 400 + (1 - r1) * 20);
  const r2 = ease.out(prog(t, T.key + 1.3, 0.45));
  ctx.globalAlpha = a * r2;
  ctx.font = `600 50px ${SANS}`;
  drawRich(ctx, '开门时，他总会避开汽车', 960, 500 + (1 - r2) * 16, { color: C.dim });
  const r3 = ease.outBack(prog(t, 99.7, 0.45));
  if (r3 > 0) {
    ctx.globalAlpha = a * clamp(r3);
    ctx.save();
    ctx.translate(960, 660);
    ctx.scale(r3, r3);
    ctx.font = `800 70px ${SANS}`;
    drawRich(ctx, [['他留下的门 = '], ['他给你的提示', C.amber]], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
