// Why 23 is enough: it is not about "someone shares MY day" but about every PAIR. 23 people make
// 253 pairs; the exact product of "all different" is only 49.3%.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life } from './style.js';
import { T, lerpT } from './timeline.js';

const CIRC = { x: 600, y: 560, r: 330, n: 23 };
const PAIRS = 253;

let st = null;
export function setupWhy(state) {
  st = state;
  // Precompute the 23 points and the 253 pairs, ordered so lines fan out evenly.
  st.pts = [];
  for (let i = 0; i < CIRC.n; i++) {
    const a = -Math.PI / 2 + (i / CIRC.n) * Math.PI * 2;
    st.pts.push([CIRC.x + Math.cos(a) * CIRC.r, CIRC.y + Math.sin(a) * CIRC.r]);
  }
  st.pairList = [];
  for (let gap = 1; gap <= CIRC.n / 2; gap++) {
    for (let i = 0; i < CIRC.n; i++) {
      const j = (i + gap) % CIRC.n;
      if (gap === CIRC.n / 2 && i >= CIRC.n / 2) continue;
      st.pairList.push([i, j]);
    }
  }
}

export function drawWhy(ctx, t) {
  const a = life(t, T.why + 0.05, T.twist + 0.1, 0.4, 0.3);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';

  // Two framings at the top.
  const c1 = ease.out(prog(t, T.whyCards, 0.5));
  const c2 = ease.out(prog(t, T.whyCards + 1.0, 0.5));
  ctx.textAlign = 'center';
  if (c1 > 0) {
    ctx.save();
    ctx.globalAlpha = a * c1;
    ctx.font = `600 44px ${SANS}`;
    ctx.fillStyle = C.dim;
    const y = 150;
    drawRich(ctx, [['你以为的：', C.faint], ['有人跟「我」同一天', C.slate]], W / 2, y);
    // Strike-through once the second line lands.
    if (c2 > 0) {
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 4;
      ctx.globalAlpha = a * c2;
      const w = ctx.measureText('你以为的：有人跟「我」同一天').width;
      ctx.beginPath();
      ctx.moveTo(W / 2 - w / 2, y - 14);
      ctx.lineTo(W / 2 - w / 2 + w * ease.out(prog(t, T.whyCards + 1.0, 0.4)), y - 14);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (c2 > 0) {
    ctx.save();
    ctx.globalAlpha = a * c2;
    ctx.font = `800 52px ${SANS}`;
    drawRich(ctx, [['题目问的：', C.text], ['任意两个人', C.amber]], W / 2, 222);
    ctx.restore();
  }

  // Circle of 23 dots with pair-lines.
  const pa = ease.out(prog(t, T.pairs, 0.5));
  if (pa > 0) {
    const drawn = Math.floor(lerpT(t, T.pairs + 0.3, T.pairsCount, 0, PAIRS));
    ctx.save();
    ctx.globalAlpha = a * pa;
    ctx.strokeStyle = 'rgba(244,246,250,0.22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k < drawn && k < PAIRS; k++) {
      const [i, j] = st.pairList[k];
      ctx.moveTo(st.pts[i][0], st.pts[i][1]);
      ctx.lineTo(st.pts[j][0], st.pts[j][1]);
    }
    ctx.stroke();
    // The most recent few lines flash brighter.
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let k = Math.max(0, drawn - 6); k < drawn && k < PAIRS; k++) {
      const [i, j] = st.pairList[k];
      ctx.moveTo(st.pts[i][0], st.pts[i][1]);
      ctx.lineTo(st.pts[j][0], st.pts[j][1]);
    }
    ctx.stroke();
    // Dots.
    for (const [x, y] of st.pts) {
      ctx.fillStyle = C.amber;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pair counter in the centre.
    ctx.textAlign = 'center';
    ctx.font = `900 120px ${MONO}`;
    ctx.fillStyle = C.text;
    ctx.fillText(String(Math.min(drawn, PAIRS)), CIRC.x, CIRC.y + 20);
    ctx.font = `500 38px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('对', CIRC.x, CIRC.y + 74);
    ctx.restore();
  }

  // Right side: the exact product.
  const q = ease.out(prog(t, T.product, 0.5));
  if (q > 0) {
    const RX = 1180;
    ctx.save();
    ctx.globalAlpha = a * q;
    ctx.textAlign = 'left';
    ctx.font = `600 40px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('23 个人全都不同天', RX, 360);
    ctx.font = `600 44px ${MONO}`;
    ctx.fillStyle = C.text;
    ctx.fillText('365  364  363        343', RX + 8, 440);
    ctx.fillText('———  ———  ——— ...  ———', RX + 8, 452);
    ctx.font = `500 34px ${MONO}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('365  365  365        365', RX + 8, 500);
    // Result.
    const r = ease.outBack(prog(t, T.product + 1.0, 0.5));
    if (r > 0) {
      ctx.globalAlpha = a * clamp(r);
      ctx.font = `500 40px ${SANS}`;
      ctx.fillStyle = C.dim;
      ctx.fillText('≈', RX, 600);
      ctx.font = `900 130px ${MONO}`;
      ctx.fillStyle = C.text;
      ctx.fillText('49.3%', RX + 70, 630);
      ctx.font = `500 36px ${SANS}`;
      ctx.fillStyle = C.faint;
      ctx.fillText('全都不撞', RX + 70, 686);
    }
    const r2 = ease.outBack(prog(t, T.product + 2.4, 0.5));
    if (r2 > 0) {
      ctx.globalAlpha = a * clamp(r2);
      ctx.font = `800 56px ${SANS}`;
      drawRich(ctx, [['所以至少一对撞 '], ['50.7%', C.amber]], RX, 800, { align: 'left' });
    }
    ctx.restore();
  }
  ctx.restore();
}
