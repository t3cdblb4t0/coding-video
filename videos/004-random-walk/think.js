// 「算完了，想一想」 (series column) and the outro. The reflection is our own reading of the
// result, so it sits on the paper card in serif type, set apart from the maths.
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { drawThinkCard } from '../../engine/brand.js';
import { W, C, SANS, life, drawHouse, drawBird } from './style.js';
import { T, BEAT } from './timeline.js';

export function drawThink(ctx, t) {
  drawThinkCard(ctx, t, {
    t0: T.think + 0.1,
    t1: T.outro + 0.2,
    episode: 4,
    lines: [
      { text: [['醉汉一定能回家，']], at: T.think + 0.8 },
      { text: [['是因为他能去的地方，'], ['太少了', '#B5402C'], ['。']], at: T.think + 2.6 },
      { text: [['鸟多了一个方向的自由，']], at: T.think + 5.4 },
      { text: [['也多了一份「'], ['再也回不去', '#B5402C'], ['」的可能。']], at: T.think + 7.2 },
    ],
    question: [['你想做哪一个：一定能回去的醉汉，还是能去任何地方的鸟？']],
    questionAt: T.think + 9.6,
  });
}

export function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 22;
  // Comment-section question: an opinion everyone can answer.
  const r1 = ease.out(prog(t, T.outro + 0.2, 0.5));
  ctx.globalAlpha = r1;
  ctx.font = `900 92px ${SANS}`;
  drawRich(ctx, [['你是'], ['醉汉', C.amber], ['，还是'], ['鸟', C.violet], ['？']], W / 2, 300 + (1 - r1) * 20);
  drawHouse(ctx, W / 2 - 520, 268, 50, C.home, r1, 0.7);
  drawBird(ctx, W / 2 + 520, 270, 56, C.violet, t * 6, r1);
  const r2 = ease.out(prog(t, T.outro + 0.7, 0.5));
  ctx.globalAlpha = r2;
  ctx.font = `600 48px ${SANS}`;
  drawRich(ctx, [['在评论区打出你的答案，和'], ['一个理由', C.amber]], W / 2, 390);
  // Series badge + follow reason.
  const b = ease.outBack(prog(t, T.outro + BEAT * 2, 0.5));
  if (b > 0) {
    ctx.globalAlpha = clamp(b);
    ctx.save();
    ctx.translate(W / 2, 530);
    ctx.scale(b, b);
    ctx.shadowBlur = 0;
    ctx.font = `700 34px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 4 期';
    const w = ctx.measureText(label).width + 56;
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -38, w, 72, 36);
    ctx.stroke();
    ctx.fillStyle = C.amber;
    ctx.textAlign = 'center';
    ctx.fillText(label, 2, 10);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 2.6, 0.5));
  ctx.font = `700 48px ${SANS}`;
  drawRich(ctx, [['关注，', C.text], ['每期用代码算一个反直觉的问题，再想一想', C.amber]], W / 2, 640);
  // Next episode: psychology.
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3.6, 0.5));
  ctx.font = `600 46px ${SANS}`;
  drawRich(ctx, [['下期：', C.amber], ['为什么夸完就变差，骂完就变好？', C.text]], W / 2, 760);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 4.4, 0.5)) * 0.9;
  ctx.font = `400 28px ${SANS}`;
  drawRich(ctx, '随机种子提前固定，结果未经挑选 · 「想一想」是我们的引申，不是数学结论 · 画面与计算均由 AI 编写的代码生成', W / 2, 960, { color: C.faint });
  ctx.restore();
}

export { life };
