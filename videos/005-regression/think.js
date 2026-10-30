// 「算完了，想一想」 (105.6–120 s) and the outro. The reflection is our own reading, set apart from
// the maths in serif type on the paper card; the take-away method is the last line.
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { drawThinkCard } from '../../engine/brand.js';
import { W, C, SANS } from './style.js';
import { T, BEAT } from './timeline.js';

const SEAL = '#B5402C';

export function drawThink(ctx, t) {
  drawThinkCard(ctx, t, {
    t0: T.think + 0.1,
    t1: T.outro + 0.2,
    episode: 5,
    lines: [
      { text: [['卡尼曼说：我们夸人，会被统计「'], ['惩罚', SEAL], ['」；']], at: T.think + 0.8 },
      { text: [['骂人，反而被统计「'], ['奖励', SEAL], ['」。']], at: T.think + 2.4 },
      { text: [['这不是说严格没用，而是']], at: T.think + 5.0 },
      { text: [['「骂完变好了」，'], ['证明不了骂有用', SEAL], ['。']], at: T.think + 6.6 },
    ],
    question: [['看到「做了 X 就变好」，先问：不做 X 呢？']],
    questionAt: T.think + 9.4,
  });
}

export function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 22;
  const r1 = ease.out(prog(t, T.outro + 0.2, 0.5));
  ctx.globalAlpha = r1;
  ctx.font = `900 92px ${SANS}`;
  drawRich(ctx, [['你信「'], ['严师出高徒', C.amber], ['」吗？']], W / 2, 300 + (1 - r1) * 20);
  const r2 = ease.out(prog(t, T.outro + 0.7, 0.5));
  ctx.globalAlpha = r2;
  ctx.font = `600 48px ${SANS}`;
  drawRich(ctx, [['说说你挨骂之后，'], ['到底是骂有用，还是本来就会变好', C.amber]], W / 2, 390);
  const b = ease.outBack(prog(t, T.outro + BEAT * 2, 0.5));
  if (b > 0) {
    ctx.globalAlpha = clamp(b);
    ctx.save();
    ctx.translate(W / 2, 530);
    ctx.scale(b, b);
    ctx.shadowBlur = 0;
    ctx.font = `700 34px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 5 期';
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
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3.6, 0.5));
  ctx.font = `600 46px ${SANS}`;
  drawRich(ctx, [['下期：', C.amber], ['成功人士都在讲的经验，可能是幸存者的错觉', C.text]], W / 2, 760);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 4.4, 0.5)) * 0.9;
  ctx.font = `400 28px ${SANS}`;
  drawRich(ctx, '模型：成绩 = 实力 + 运气，两者各占一半 · 随机种子提前固定 · 「想一想」是我们的引申 · 画面与计算均由 AI 编写的代码生成', W / 2, 960, { color: C.faint });
  ctx.restore();
}
