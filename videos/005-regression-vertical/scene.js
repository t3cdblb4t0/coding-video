// 005 · 抖音竖版 (1080x1920): the 16:9 episode in the middle, a fixed title band on top and large,
// wrapped bilingual captions below (same approach as videos/004-random-walk-vertical, which cut
// the 2-second bounce from 40.94% to 36.52%). Same timing as the 16:9 version.
// Layout keeps clear of Douyin's overlays: top bar (y < ~220), right-hand buttons (x > ~930,
// y 900–1600) and the bottom description (y > ~1520).
import { prog, envelope, ease, mulberry32, drawRich, wrapRich } from '../../engine/kit.js';
import { drawActs } from '../../engine/brand.js';
import { SANS, MONO } from '../../engine/fonts.js';
import inner, { OPTS, getCaptions, actAt } from '../005-regression/scene.js';
import { HOOK_OPTS } from '../005-regression/hook.js';
import { T } from '../005-regression/timeline.js';

const W = 1080;
const H = 1920;
const VIDEO = { y: 640, h: (1080 * 9) / 16 };
const CAP = { zhY: 1338, zhSize: 60, zhLead: 76, enSize: 30, enLead: 40, gap: 58, maxWidth: 780 };
const C = { text: '#F4F6FA', dim: 'rgba(244,246,250,0.64)', amber: '#FFB547', cyan: '#5FC9E8' };

// Captions whose Chinese is shorter here because the picture above already shows the numbers.
const SHORT_ZH = {
  3.0: [['这要从诺贝尔奖得主，'], ['卡尼曼讲过的一个故事说起']],
  5.0: [['卡尼曼给以色列空军教官上课，'], ['讲"奖励比惩罚更管用"']],
  48.2: [['为什么？成绩 = 实力 + 运气，'], ['而运气每次都重新来过']],
  106.4: [['夸人，会被统计'], ['惩罚', C.amber], ['；骂人，反被统计'], ['奖励', C.amber], ['。——卡尼曼']],
  111.0: [['这不是说严格没用，'], ['而是"骂完变好"证明不了骂有用', C.amber]],
  31.4: [['最好的 10% 本该被'], ['夸', C.amber], ['，最差的 10% 本该被'], ['骂', C.cyan]],
  44.1: [['没人夸，也没人骂，照样'], ['"夸了变差、骂了变好"', C.amber]],
  66.1: [['第一次离靶最近的 10 人，第二次平均变远了']],
  69.9: [['没有技术，只有运气，'], ['最好的照样变差', C.amber]],
  74.6: [['这就是'], ['"回归均值"', C.amber], ['，来自 1886 年高尔顿的身高研究']],
  90.7: [['运动员上了封面，下个赛季就变差：'], ['"封面魔咒"', C.amber]],
  102.7: [['两组都进步约 10 分：要看骂有没有用，得'], ['和不骂的比', C.amber]],
};
// Vertical-only captions for picture text that gets too small once the 16:9 frame is scaled down:
// the hook's question (the picture's pill pops at 1.6 s and is ~30 px here; the caption is on from
// frame 0), and the outro's comment question and next-episode teaser (~27 px here).
const EXTRA = [
  // From frame 0 (no fade-in), so the lower third is not empty in the feed's first frame.
  { t0: 0, t1: 2.9, zh: [['你信「'], ['严师出高徒', C.amber], ['」吗？']], en: 'Do you believe strict teachers make the best students?' },
  { t0: T.outro + 0.7, t1: T.outro + 4.6, zh: [['挨骂之后变好，是骂有用，'], ['还是本来就会变好？', C.amber]], en: 'You did better after a telling-off: was it the scolding, or would you have improved anyway?' },
  { t0: T.outro + 4.8, t1: T.end - 0.4, zh: [['下期：成功人士的经验，'], ['可能是幸存者的错觉', C.amber]], en: 'Next time: the advice of successful people may be survivorship bias' },
];
const PUNCT_END = '，。：；？！、';
const endsAtPunct = (ln) => {
  const s = ln.map(([x]) => x).join('');
  return PUNCT_END.includes(s[s.length - 1]);
};

let off = null;
let offCtx = null;
let bg = null;
let captions = [];

export const allCaptions = () => captions;

// Chinese: the largest size (60 -> 52 px) whose two-line split falls at punctuation; failing that,
// the largest size that fits in two lines. English: shrink until it fits in two lines.
export function captionLayout(ctx, cap) {
  const zh = SHORT_ZH[cap.t0] ?? (cap.zh || cap.vzh || '');
  let zhL = { size: CAP.zhSize, lines: [] };
  if (zh) {
    let found = null;
    for (const size of [60, 58, 56, 54, 52]) {
      ctx.font = `700 ${size}px ${SANS}`;
      const lines = wrapRich(ctx, zh, CAP.maxWidth);
      if (lines.length === 1 || (lines.length === 2 && endsAtPunct(lines[0]))) {
        found = { size, lines };
        break;
      }
    }
    if (!found) {
      for (const size of [60, 56, 52, 48]) {
        ctx.font = `700 ${size}px ${SANS}`;
        const lines = wrapRich(ctx, zh, CAP.maxWidth);
        if (lines.length <= 2 || size === 48) {
          found = { size, lines };
          break;
        }
      }
    }
    zhL = found;
  }
  let enL = { size: CAP.enSize, lines: [] };
  if (cap.en) {
    for (let size = CAP.enSize; ; size -= 2) {
      ctx.font = `400 ${size}px ${SANS}`;
      const lines = wrapRich(ctx, cap.en, CAP.maxWidth);
      if (lines.length <= 2 || size <= 24) {
        enL = { size, lines };
        break;
      }
    }
  }
  return { zh: zhL, en: enL };
}

function buildBackground() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, H * 0.75);
  grad.addColorStop(0, '#141C30');
  grad.addColorStop(1, '#06080F');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const rand = mulberry32(98);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 5;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function drawTitleBand(ctx, t) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.roundRect(90, 252, 9, 36, 4);
  ctx.fill();
  ctx.font = `700 32px ${SANS}`;
  ctx.letterSpacing = '4px';
  ctx.fillStyle = C.text;
  ctx.fillText('算给你看', 114, 282);
  const tw = ctx.measureText('算给你看').width;
  ctx.letterSpacing = '0px';
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = C.amber;
  ctx.fillText('05', 114 + tw + 14, 282);
  const [act, u] = actAt(t);
  drawActs(ctx, act, u, 1, { x0: 770, y: 270, gap: 100 });
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 20;
  ctx.font = `900 108px ${SANS}`;
  drawRich(ctx, [['骂完就变好，']], 84, 418, { align: 'left', color: C.text });
  drawRich(ctx, [['是'], ['骂的功劳', C.amber], ['吗？']], 84, 540, { align: 'left', color: C.text });
  ctx.shadowBlur = 0;
  ctx.font = `600 38px ${SANS}`;
  // "最差的人": the 84% is of the worst 10% (the ones who would have been scolded), not of all 10,000.
  drawRich(ctx, [['1 万人模拟：最差的人不挨骂，'], ['84% 照样变好', C.amber]], 90, 604, { align: 'left', color: C.dim });
  ctx.restore();
}

function drawCaptions(ctx, t) {
  for (const cap of captions) {
    // A caption that starts at 0 is fully on from the first frame: no fade-in, no rise.
    const a = cap.t0 === 0 ? (t < cap.t1 ? Math.min(1, (cap.t1 - t) / 0.2) : 0) : envelope(t, cap.t0, cap.t1, 0.2, 0.2);
    if (a <= 0) continue;
    const L = captionLayout(ctx, cap);
    const rise = cap.t0 === 0 ? 0 : (1 - ease.out(prog(t, cap.t0, 0.35))) * 14;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 16;
    let y = CAP.zhY + rise;
    if (L.zh.lines.length) {
      ctx.font = `700 ${L.zh.size}px ${SANS}`;
      for (const ln of L.zh.lines) {
        drawRich(ctx, ln, W / 2, y, { align: 'center', color: C.text });
        y += L.zh.size * (CAP.zhLead / CAP.zhSize);
      }
      y += CAP.gap - CAP.zhLead;
    }
    if (L.en.lines.length) {
      ctx.font = `400 ${L.en.size}px ${SANS}`;
      for (const ln of L.en.lines) {
        drawRich(ctx, ln, W / 2, y, { align: 'center', color: C.dim });
        y += L.en.size * (CAP.enLead / CAP.enSize);
      }
    }
    ctx.restore();
  }
}

export default {
  meta: { title: '回归均值（抖音竖版）', output: '005-回归均值-抖音竖版.mp4' },
  width: W,
  height: H,
  fps: inner.fps,
  duration: inner.duration,
  bitrate: 7e6,

  async setup() {
    OPTS.captions = false;
    OPTS.chrome = false;
    HOOK_OPTS.badge = false;
    off = document.createElement('canvas');
    off.width = 1920;
    off.height = 1080;
    offCtx = off.getContext('2d', { alpha: false });
    await inner.setup({ canvas: off, ctx: offCtx });
    captions = [...getCaptions(), ...EXTRA].sort((a, b) => a.t0 - b.t0);
    bg = buildBackground();
  },

  draw(ctx, t, frame) {
    inner.draw(offCtx, t, frame);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.drawImage(bg, 0, 0);
    drawTitleBand(ctx, t);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, VIDEO.y, W, VIDEO.h);
    ctx.fillStyle = 'rgba(244,246,250,0.10)';
    ctx.fillRect(0, VIDEO.y - 1, W, 1);
    ctx.fillRect(0, VIDEO.y + VIDEO.h, W, 1);
    drawCaptions(ctx, t);
    const fade = prog(t, T.end - 0.6, 0.6);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};
