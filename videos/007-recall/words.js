// The 8 words the viewer is asked to remember at frame 0 and is tested on at the end. At 5 s each
// word breaks into square cells that drift off (forgetting); at the end the cells fly back.
import { clamp, lerp, prog, ease, mulberry32 } from '../../engine/kit.js';
import { W, C, SANS, MONO, card, label, life } from './style.js';
import { T } from './timeline.js';
import { developText } from '../../engine/film.js';

export const WORDS = ['钢琴', '雨伞', '火锅', '月亮', '剪刀', '骆驼', '书包', '闪电'];
const CW = 330;
const CH = 180;
const GAP = 36;
const X0 = (W - (4 * CW + 3 * GAP)) / 2;
const Y0 = 352;
const FONT = 104;
const PITCH = 5;
export const cardBox = (k) => [X0 + (k % 4) * (CW + GAP), Y0 + Math.floor(k / 4) * (CH + GAP), CW, CH];

let parts = null;
export function setupWords() {
  const rand = mulberry32(707);
  parts = [];
  const c = document.createElement('canvas');
  c.width = CW;
  c.height = CH;
  const g = c.getContext('2d');
  WORDS.forEach((wd, k) => {
    g.clearRect(0, 0, CW, CH);
    g.font = `700 ${FONT}px ${SANS}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(wd, CW / 2, CH / 2 + 6);
    const d = g.getImageData(0, 0, CW, CH).data;
    const [bx, by] = cardBox(k);
    for (let y = 0; y < CH; y += PITCH) {
      for (let x = 0; x < CW; x += PITCH) {
        if (d[((y + 2) * CW + x + 2) * 4 + 3] < 128) continue;
        const ang = -Math.PI / 2 + (rand() - 0.5) * 2.4;
        const dist = 60 + rand() * 260;
        parts.push({ x: bx + x, y: by + y, dx: Math.cos(ang) * dist + 40, dy: Math.sin(ang) * dist, delay: rand() * 0.55, spin: rand() });
      }
    }
  });
  return parts.length;
}

function drawWordText(ctx, k, alpha) {
  const [bx, by] = cardBox(k);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `700 ${FONT}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(127,216,242,0.55)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = C.text;
  ctx.fillText(WORDS[k], bx + CW / 2, by + CH / 2 + 6);
  ctx.restore();
}

// u = 0: the cells sit where the letters are; u = 1: all gone. Each cell leaves after its own delay.
// Run u backwards (1 -> 0) and the cells fly back in.
function drawParts(ctx, u) {
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.fillStyle = C.text;
  ctx.shadowColor = 'rgba(127,216,242,0.8)';
  ctx.shadowBlur = 6;
  for (const p of parts) {
    const v = clamp(u * 1.55 - p.delay);
    if (v >= 0.99) continue;
    const e = ease.inOut(v);
    ctx.globalAlpha = base * (1 - v * v);
    const s = lerp(PITCH - 1, 2.5, e);
    ctx.fillRect(p.x + p.dx * e, p.y + p.dy * e, s, s);
  }
  ctx.restore();
}

function drawCards(ctx, alpha, { glow = 0 } = {}) {
  for (let k = 0; k < WORDS.length; k++) {
    const [x, y, w, h] = cardBox(k);
    ctx.save();
    ctx.globalAlpha *= alpha;
    card(ctx, x, y, w, h, { glow });
    ctx.restore();
  }
}

// A draining gold bar under the cards with the seconds left at its right end.
function drawTimer(ctx, t, t0, dur, alpha) {
  const left = clamp(1 - (t - t0) / dur);
  const x = X0;
  const w = 4 * CW + 3 * GAP;
  const y = Y0 + 2 * CH + GAP + 56;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(255,248,234,0.12)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 12, 6);
  ctx.fill();
  ctx.fillStyle = C.gold;
  ctx.shadowColor = 'rgba(246,207,126,0.8)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(12, w * left), 12, 6);
  ctx.fill();
  const secs = Math.max(1, Math.ceil(dur - (t - t0) - 1e-6));
  if (left > 0) label(ctx, `${secs}`, x + w, y + 92, { size: 72, weight: 700, family: MONO, color: C.gold, align: 'right' });
  ctx.restore();
}

export function drawOpening(ctx, t) {
  if (t > T.title + 0.3) return;
  const out = 1 - prog(t, T.title - 0.2, 0.4);
  ctx.save();
  ctx.globalAlpha = out;
  // Heading, complete from frame 0.
  const hA = t < T.memoEnd ? 1 : 1 - prog(t, T.memoEnd, 0.5);
  if (hA > 0) {
    ctx.save();
    ctx.globalAlpha *= hA;
    ctx.font = `700 76px ${SANS}`;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 14;
    developText(ctx, [['给你 '], ['5 秒', C.gold], ['，记住这 '], ['8 个词', C.gold]], W / 2, 258, t, -5);
    ctx.restore();
    drawTimer(ctx, t, 0, T.memoEnd, hA);
  }
  // Cards: solid until the dissolve, then the borders fade as the words break up.
  const cardA = t < T.dissolve ? 1 : 1 - prog(t, T.dissolve + 0.2, 0.7);
  if (cardA > 0) drawCards(ctx, cardA * 0.9);
  if (t < T.dissolve) for (let k = 0; k < WORDS.length; k++) drawWordText(ctx, k, 1);
  else drawParts(ctx, prog(t, T.dissolve, 3.6));
  ctx.restore();
}

// The test at the end: blank cards with "?", three seconds, then the words fly back.
export function drawRecall(ctx, t) {
  if (t < T.recall || t > T.outro + 0.6) return;
  const a = life(t, T.recall, T.outro + 0.6, 0.5, 0.6);
  ctx.save();
  ctx.globalAlpha = a;
  drawCards(ctx, 0.9, { glow: t > T.reveal ? 10 * (1 - prog(t, T.reveal + 0.8, 1)) : 0 });
  const qA = 1 - prog(t, T.reveal, 0.35);
  if (qA > 0) {
    ctx.save();
    ctx.globalAlpha = a * qA;
    for (let k = 0; k < WORDS.length; k++) {
      const [x, y, w, h] = cardBox(k);
      label(ctx, '?', x + w / 2, y + h / 2 + 36, { size: 104, weight: 700, color: C.gold, halo: 20 });
    }
    ctx.restore();
    drawTimer(ctx, t, T.countdown[0], 3, a * qA * life(t, T.countdown[0] - 0.3, T.reveal + 0.3, 0.3, 0.3));
  }
  if (t >= T.reveal) {
    const u = prog(t, T.reveal, 1.1);
    if (u < 1) drawParts(ctx, 1 - u);
    const txtA = prog(t, T.reveal + 0.85, 0.35);
    if (txtA > 0) for (let k = 0; k < WORDS.length; k++) drawWordText(ctx, k, txtA);
  }
  ctx.restore();
}
