// The multiple-choice hook: at least how many people for a better-than-even chance?
// Options A 183 / B 100 / C 57 / D 23. The gut feeling leans toward A (365 / 2).
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life } from './style.js';
import { T } from './timeline.js';

const OPTS = [
  { k: 'A', n: '183', note: '365 ÷ 2' },
  { k: 'B', n: '100', note: '一百多' },
  { k: 'C', n: '57', note: '几十个' },
  { k: 'D', n: '23', note: '一个班' },
];
const CARD = { w: 380, h: 300, gap: 56 };
const ROW_W = OPTS.length * CARD.w + (OPTS.length - 1) * CARD.gap;
const X0 = (W - ROW_W) / 2;
const CY = 520;

export function drawChoice(ctx, t) {
  const a = life(t, T.choice + 0.05, T.room + 0.1, 0.35, 0.3);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Prompt.
  ctx.textAlign = 'center';
  ctx.font = `800 70px ${SANS}`;
  ctx.fillStyle = C.text;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 18;
  drawRich(ctx, [['至少几个人，概率才能 '], ['过一半', C.amber], ['？']], W / 2, 250);
  ctx.shadowBlur = 0;
  // Gut feeling leans toward A.
  const gut = ease.out(prog(t, T.gut, 0.5));
  OPTS.forEach((o, i) => {
    const pop = ease.outBack(prog(t, T.cards[i], 0.4));
    if (pop <= 0) return;
    const x = X0 + i * (CARD.w + CARD.gap);
    const lean = i === 0 ? gut : 0;
    ctx.save();
    ctx.globalAlpha = a * clamp(pop);
    ctx.translate(x + CARD.w / 2, CY);
    ctx.scale(pop, pop);
    ctx.translate(-CARD.w / 2, -CARD.h / 2);
    ctx.fillStyle = lean > 0 ? 'rgba(255,181,71,0.12)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = lean > 0 ? C.amber : C.line;
    ctx.lineWidth = lean > 0 ? 4 : 2;
    if (lean > 0) {
      ctx.shadowColor = C.amber;
      ctx.shadowBlur = 26 * lean;
    }
    ctx.beginPath();
    ctx.roundRect(0, 0, CARD.w, CARD.h, 22);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.font = `800 52px ${SANS}`;
    ctx.fillStyle = lean > 0 ? C.amber : C.slate;
    ctx.fillText(o.k, 36, 84);
    ctx.textAlign = 'center';
    ctx.font = `900 130px ${MONO}`;
    ctx.fillStyle = lean > 0 ? C.amber : C.text;
    ctx.fillText(o.n, CARD.w / 2, CARD.h / 2 + 52);
    ctx.font = `500 34px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(o.note, CARD.w / 2, CARD.h - 34);
    ctx.restore();
  });
  // "直觉" tag over A.
  if (gut > 0) {
    ctx.save();
    ctx.globalAlpha = a * ease.outBack(prog(t, T.gut, 0.4));
    ctx.translate(X0 + CARD.w / 2, CY - CARD.h / 2 - 48);
    ctx.font = `800 40px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.amber;
    ctx.fillText('大多数人选这个', 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
