// 想: the three steps, 「算完了，想一想」, and the end card.
import { prog, ease } from '../../engine/kit.js';
import { developText } from '../../engine/film.js';
import { drawThinkCard } from '../../engine/brand.js';
import { W, C, SANS, SONG, MONO, card, label, life, rgba } from './style.js';
import { T } from './timeline.js';

const STEPS = [
  { text: [['学完'], ['合上书', C.gold], ['，先把记得的写下来']], tag: '自测' },
  { text: [['想不起来再'], ['看答案', C.gold], ['，看完再想一遍']], tag: '对答案' },
  { text: [['第 1、3、7、15 天，'], ['各想一次', C.gold]], tag: '越隔越久' },
];

export function drawMethod(ctx, t) {
  if (t < T.method || t > T.methodEnd + 0.4) return;
  const a = life(t, T.method, T.methodEnd + 0.4, 0.4, 0.6);
  const cw = 1360;
  const ch = 158;
  const x0 = (W - cw) / 2;
  ctx.save();
  ctx.globalAlpha = a;
  STEPS.forEach((s, k) => {
    const t0 = T.steps[k];
    const u = ease.out(prog(t, t0, 0.5));
    if (u <= 0) return;
    const y = 236 + k * (ch + 34) + (1 - u) * 24;
    ctx.save();
    ctx.globalAlpha *= u;
    card(ctx, x0, y, cw, ch, { r: 24, fill: 'rgba(255,248,234,0.06)', stroke: 'rgba(255,248,234,0.26)', lw: 2.5 });
    // Number badge.
    ctx.save();
    ctx.fillStyle = C.gold;
    ctx.shadowColor = 'rgba(246,207,126,0.8)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x0 + 96, y + ch / 2, 46, 0, 6.283);
    ctx.fill();
    ctx.restore();
    label(ctx, String(k + 1), x0 + 96, y + ch / 2 + 22, { size: 64, weight: 800, family: MONO, color: '#1B2236', halo: 0 });
    ctx.save();
    ctx.font = `700 60px ${SANS}`;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    developText(ctx, s.text, x0 + 180, y + ch / 2 + 22, t, t0 + 0.1, { align: 'left' });
    ctx.restore();
    // Tag on the right.
    ctx.font = `700 40px ${SANS}`;
    const tw = ctx.measureText(s.tag).width + 56;
    card(ctx, x0 + cw - 40 - tw, y + ch / 2 - 38, tw, 76, { r: 38, fill: rgba(C.gold, 0.14), stroke: rgba(C.gold, 0.7), lw: 2 });
    label(ctx, s.tag, x0 + cw - 40 - tw / 2, y + ch / 2 + 15, { size: 40, weight: 700, color: C.gold, halo: 0 });
    ctx.restore();
  });
  ctx.restore();
}

export function drawThink(ctx, t) {
  if (t < T.think || t > T.thinkEnd) return;
  const L = T.thinkLines;
  drawThinkCard(ctx, t, {
    t0: T.think,
    t1: T.thinkEnd,
    episode: 7,
    lines: [
      { text: '背的时候觉得会了，', at: L[0], size: 58 },
      { text: '多半只是眼熟。', at: L[1], size: 58 },
      { text: '合上书、想不起来的那几秒，', at: L[2], size: 58 },
      { text: [['才是记忆在'], ['长', '#B5402C'], ['。']], at: L[3], size: 58, weight: 700 },
    ],
    question: '明天合上眼，再想一遍那 8 个词。',
    questionAt: T.thinkQ,
  });
}

export function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const a1 = ease.out(prog(t, T.outro + 0.6, 0.6));
  ctx.globalAlpha = a1;
  ctx.font = `700 64px ${SONG}`;
  ctx.letterSpacing = '6px';
  developText(ctx, [['算给你看 · '], ['第 7 期', C.gold]], W / 2, 400, t, T.outro + 0.6, { glow: 18, glowColor: 'rgba(246,207,126,0.4)' });
  ctx.letterSpacing = '0px';
  ctx.font = `700 56px ${SANS}`;
  developText(ctx, [['关注，每期教你一个'], ['算过的方法', C.gold]], W / 2, 520, t, T.outro + 1.4);
  ctx.globalAlpha = ease.out(prog(t, T.outro + 2.4, 0.8));
  label(ctx, 'Roediger & Karpicke, Test-Enhanced Learning, Psychological Science 17 (2006) · Dunlosky et al., PSPI 14 (2013)', W / 2, 780, { size: 30, weight: 500, family: '"EB Garamond"', color: C.faint, halo: 0 });
  label(ctx, '记忆模型：FSRS-6 默认参数（open-spaced-repetition/py-fsrs）· 1000 个词的模拟，种子 7007，不挑结果', W / 2, 830, { size: 28, weight: 500, color: C.faint, halo: 0 });
  ctx.restore();
}
