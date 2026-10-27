// Outro. The call to action turns the comment section into the experiment, which is the strongest
// way to pull comments (two videos in, follower growth has been slow).
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, life } from './style.js';
import { T, BEAT } from './timeline.js';

export function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 22;
  // Headline: the comment-section experiment.
  const r1 = ease.out(prog(t, T.outro + 0.1, 0.5));
  ctx.globalAlpha = r1;
  ctx.font = `900 96px ${SANS}`;
  drawRich(ctx, [['把你的生日打在'], ['评论区', C.amber]], W / 2, 320 + (1 - r1) * 20);
  const r1b = ease.out(prog(t, T.outro + 0.5, 0.5));
  ctx.globalAlpha = r1b;
  ctx.font = `700 60px ${SANS}`;
  drawRich(ctx, [['看看第几条，开始 '], ['撞车', C.amber]], W / 2, 410 + (1 - r1b) * 16);
  ctx.globalAlpha = ease.out(prog(t, T.outro + 0.9, 0.5));
  ctx.font = `400 34px ${SANS}`;
  drawRich(ctx, '(按统计，大约第 20-30 条就会出现)', W / 2, 466, { color: C.dim });

  // Follow reason.
  const b = ease.outBack(prog(t, T.outro + BEAT * 1.8, 0.5));
  if (b > 0) {
    ctx.globalAlpha = clamp(b);
    ctx.save();
    ctx.translate(W / 2, 600);
    ctx.scale(b, b);
    ctx.shadowBlur = 0;
    ctx.font = `700 34px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 3 期';
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
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 2.4, 0.5));
  ctx.font = `700 48px ${SANS}`;
  drawRich(ctx, [['关注，', C.text], ['每期用代码算一个反直觉的问题', C.amber]], W / 2, 710);

  // Next up: the random walk.
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3.2, 0.5));
  ctx.font = `600 44px ${SANS}`;
  drawRich(ctx, [['下期：', C.amber], ['喝醉的人，能自己走回家吗？', C.text]], W / 2, 820);

  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 4, 0.5)) * 0.9;
  ctx.font = `400 28px ${SANS}`;
  drawRich(ctx, '假设一年 365 天、出生均匀分布 · 随机种子提前固定，结果未经挑选 · 画面与计算均由 AI 编写的代码生成', W / 2, 980, { color: C.faint });
  ctx.restore();
}
