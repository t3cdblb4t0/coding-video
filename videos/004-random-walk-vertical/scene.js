// 004 · 抖音竖版 (1080x1920): the 16:9 episode in the middle, a fixed title band on top and large,
// wrapped bilingual captions below. Why: on Douyin's vertical feed a 16:9 frame fills about a
// quarter of the screen and its captions render smaller than the app's own text (episode 03:
// 40.75% left within 2 s). Same timing as the 16:9 version, so the same music fits.
// Layout keeps clear of Douyin's overlays: top bar (y < ~220), right-hand buttons (x > ~930,
// y 900–1600) and the bottom description (y > ~1520).
import { prog, envelope, ease, mulberry32, drawRich, wrapRich } from '../../engine/kit.js';
import { drawActs } from '../../engine/brand.js';
import { SANS, MONO } from '../../engine/fonts.js';
import inner, { OPTS, getCaptions, actAt } from '../004-random-walk/scene.js';
import { HOOK_OPTS } from '../004-random-walk/hook.js';
import { T } from '../004-random-walk/timeline.js';

const W = 1080;
const H = 1920;
const VIDEO = { y: 640, h: (1080 * 9) / 16 }; // 607.5 px tall
const CAP = { zhY: 1338, zhSize: 60, zhLead: 76, enSize: 30, enLead: 40, gap: 58, maxWidth: 780 };
const C = { text: '#F4F6FA', dim: 'rgba(244,246,250,0.64)', faint: 'rgba(244,246,250,0.40)', amber: '#FFB547', violet: '#B79CFF' };

// The 想一想 card carries its Chinese inside the picture; here it is repeated as large captions.
const THINK_ZH = {
  77.6: [['醉汉一定能回家，是因为他能去的地方'], ['太少了', C.amber]],
  82.2: [['鸟多了一个方向的自由，也多了一份'], ['再也回不去', C.amber], ['的可能']],
  86.4: [['你想做哪一个：一定能回去的'], ['醉汉', C.amber], ['，还是能去任何地方的'], ['鸟', C.violet], ['？']],
};

let off = null;
let offCtx = null;
let bg = null;
let captions = [];

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
  // Series tag.
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
  ctx.fillText('04', 114 + tw + 14, 282);
  // 问 → 算 → 想 progress, top right of the band.
  const [act, u] = actAt(t);
  drawActs(ctx, act, u, 1, { x0: 770, y: 270, gap: 100 });
  // Fixed title: the episode's big question, plus the concrete claim underneath.
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 20;
  ctx.font = `900 108px ${SANS}`;
  drawRich(ctx, [['自由越多，']], 84, 418, { align: 'left', color: C.text });
  drawRich(ctx, [['越'], ['回不了家', C.amber], ['？']], 84, 540, { align: 'left', color: C.text });
  ctx.shadowBlur = 0;
  ctx.font = `600 38px ${SANS}`;
  drawRich(ctx, [['醉汉一定能回家，'], ['鸟却可能永远迷路', C.violet]], 90, 604, { align: 'left', color: C.dim });
  ctx.restore();
}

// A few captions read better shortened here, where the picture above already shows the details.
const SHORT_ZH = {
  3.0: '要从 1921 年的一次散步说起',
  68.7: [['1 万步里平均回家：'], ['77 次、2.7 次、0.54 次', C.amber]],
  72.4: [['喝醉的人终会回家，喝醉的鸟'], ['可能永远迷路', C.violet]],
  86.4: [['你想做一定能回去的'], ['醉汉', C.amber], ['，还是能去任何地方的'], ['鸟', C.violet], ['？']],
};
const PUNCT_END = '，。：；？！、';
const endsAtPunct = (ln) => {
  const s = ln.map(([x]) => x).join('');
  return PUNCT_END.includes(s[s.length - 1]);
};

export const allCaptions = () => captions;

// Chinese: the largest size (60 → 52 px) whose two-line split falls at punctuation; failing that,
// the largest size that fits in two lines. English: shrink until it fits in two lines.
export function captionLayout(ctx, cap) {
  const zh = SHORT_ZH[cap.t0] ?? (cap.zh || THINK_ZH[cap.t0] || '');
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

function drawCaptions(ctx, t) {
  for (const cap of captions) {
    const a = envelope(t, cap.t0, cap.t1, 0.2, 0.2);
    if (a <= 0) continue;
    const L = captionLayout(ctx, cap);
    const rise = (1 - ease.out(prog(t, cap.t0, 0.35))) * 14;
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
  meta: { title: '随机游走（抖音竖版）', output: '004-随机游走-抖音竖版.mp4' },
  width: W,
  height: H,
  fps: inner.fps,
  duration: inner.duration,
  bitrate: 7e6,

  async setup() {
    OPTS.captions = false; // drawn below the picture instead, larger
    OPTS.chrome = false; // badge and 问→算→想 move to the title band
    HOOK_OPTS.badge = false;
    off = document.createElement('canvas');
    off.width = 1920;
    off.height = 1080;
    offCtx = off.getContext('2d', { alpha: false });
    await inner.setup({ canvas: off, ctx: offCtx });
    captions = getCaptions();
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
