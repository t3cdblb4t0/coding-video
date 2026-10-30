// The aha: "someone shares YOUR day" only adds up with YOU in every pair — 22 pairs, 5.9%. To
// reach 50% that way you'd need 253 other people. "Any two" reaches 50% at 23 people — because 23
// people already make 253 pairs. What matters is the number of pairs.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, drawPerson } from './style.js';
import { T, lerpT } from './timeline.js';

const CX = 560;
const CY = 530;

let st = null;
export function setupTwist(state) {
  st = state;
}

function fan(ctx, count, r, lineAlpha, dotR) {
  ctx.save();
  ctx.strokeStyle = `rgba(95,201,232,${lineAlpha})`;
  ctx.lineWidth = count > 60 ? 1.2 : 2.4;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = C.slate;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * r, CY + Math.sin(a) * r, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawTwist(ctx, t) {
  const a = life(t, T.twist + 0.05, T.world + 0.1, 0.4, 0.3);
  if (a <= 0) return;
  // Phase A: 22 others. Phase B: grow toward 253.
  const grow = ease.inOut(prog(t, T.needMore, 1.1));
  const count = Math.round(lerp(22, 253, grow));
  const r = lerp(300, 340, grow);
  const dotR = lerp(12, 3.2, grow);
  const pct = st.sameAsYou(count);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Fan from you.
  const fa = ease.out(prog(t, T.youLines, 0.5));
  if (fa > 0) {
    ctx.globalAlpha = a * fa;
    fan(ctx, count, r, lerp(0.5, 0.28, grow), dotR);
    drawPerson(ctx, CX, CY + 24, 70, C.amber, 1);
    ctx.textAlign = 'center';
    ctx.font = `700 32px ${SANS}`;
    ctx.fillStyle = C.amber;
    ctx.fillText('你', CX, CY + 70);
  }
  // Right side: count of pairs and the resulting probability.
  const ra = ease.out(prog(t, T.youLines + 0.3, 0.5));
  if (ra > 0) {
    const RX = 1180;
    ctx.save();
    ctx.globalAlpha = a * ra;
    ctx.textAlign = 'left';
    ctx.font = `600 42px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('有人跟「你」同一天', RX, 300);
    ctx.font = `500 36px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.fillText(`和你有关的只有 ${count} 对`, RX, 370);
    ctx.font = `900 150px ${MONO}`;
    ctx.fillStyle = grow >= 1 ? C.amber : C.text;
    if (grow >= 1) {
      ctx.shadowColor = 'rgba(255,181,71,0.5)';
      ctx.shadowBlur = 34;
    }
    ctx.fillText(`${(100 * pct).toFixed(1)}%`, RX, 500);
    ctx.shadowBlur = 0;
    // Needle: how many people this needs.
    const need = ease.out(prog(t, T.needMore + 0.6, 0.5));
    if (need > 0) {
      ctx.globalAlpha = a * ra * need;
      ctx.font = `700 46px ${SANS}`;
      drawRich(ctx, [['要凑够 '], ['253 个人', C.amber], ['，才到一半']], RX, 600, { align: 'left' });
    }
    ctx.restore();
  }
  // Key banner.
  const key = ease.outBack(prog(t, T.twistKey, 0.5));
  if (key > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(key);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(7,10,18,0.8)';
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 3;
    const bw = 1400;
    ctx.beginPath();
    ctx.roundRect(W / 2 - bw / 2, 770, bw, 120, 24);
    ctx.fill();
    ctx.stroke();
    ctx.font = `800 58px ${SANS}`;
    drawRich(ctx, [['关键不是「人数」，而是「'], ['配对数', C.amber], ['」']], W / 2, 848);
    ctx.restore();
  }
  ctx.restore();
}
