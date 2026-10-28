// 006 · 抖音竖版 (1080x1920) of the 16:9 film: a fixed title band on top, the 16:9 picture in the
// middle, large captions below that develop character by character like the 16:9 ones.
// Layout keeps clear of Douyin's overlays: top bar (y < ~220), right-hand buttons (x > ~930,
// y 900-1600) and the bottom description (y > ~1520). Same timing and sound as the 16:9 version.
import { prog, ease, wrapRich } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust, drawChapter, developText, FILM } from '../../engine/film.js';
import { SANS, SONG, SERIF } from '../../engine/fonts.js';
import inner, { OPTS, getCaptions, actAt } from '../006-survivors/scene.js';
import { T } from '../006-survivors/timeline.js';

const W = 1080;
const H = 1920;
const VIDEO = { y: 660, h: (1080 * 9) / 16 };
const CAP = { y: 1356, maxWidth: 800 };
const PUNCT_END = '，。：；？！、——';

// Vertical-only second lines: the model and the note on the legend are drawn small inside the
// picture, which is unreadable at this size, so they take the English line's place here.
const NOTES = {
  31.6: '示意模拟：1,000 架次，落点随机 · 不是二战真实数据',
  41.8: '"军官主张在洞多处加装甲"的对话没有可靠记载；红点飞机图是 2005 年后的示意图',
};

let off = null;
let offCtx = null;
let bg = null;
let dust = null;
let captions = [];

export const allCaptions = () => captions;

const endsAtPunct = (ln) => {
  const s = ln.map(([x]) => x).join('');
  return PUNCT_END.includes(s[s.length - 1]);
};

// Chinese: the largest size (60 -> 52 px) that fits one line, or two lines split at punctuation;
// failing that, the largest size that fits two lines. The second line (English or note) shrinks
// until it fits two lines.
export function captionLayout(ctx, cap) {
  let zh = { size: 60, lines: [] };
  if (cap.zh) {
    let found = null;
    for (const size of [60, 58, 56, 54, 52]) {
      ctx.font = `600 ${size}px ${SANS}`;
      const lines = wrapRich(ctx, cap.zh, CAP.maxWidth);
      if (lines.length === 1 || (lines.length === 2 && endsAtPunct(lines[0]))) {
        found = { size, lines };
        break;
      }
    }
    if (!found) {
      ctx.font = `600 52px ${SANS}`;
      found = { size: 52, lines: wrapRich(ctx, cap.zh, CAP.maxWidth) };
    }
    zh = found;
  }
  const note = NOTES[cap.t0];
  const second = note ?? cap.en;
  let en = { size: 30, lines: [], note: !!note };
  if (second) {
    for (let size = note ? 28 : 31; ; size -= 2) {
      ctx.font = note ? `400 ${size}px ${SANS}` : `italic 400 ${size}px ${SERIF}`;
      const lines = wrapRich(ctx, second, CAP.maxWidth);
      if (lines.length <= 2 || size <= 22) {
        en = { size, lines, note: !!note };
        break;
      }
    }
  }
  return { zh, en };
}

function drawBand(ctx, t) {
  // Dimmed while the picture shows the title card, which carries the same line.
  const card = Math.min(ease.out(prog(t, T.title, 0.4)), 1 - ease.in(prog(t, T.titleEnd - 0.6, 0.6)));
  const a = (1 - prog(t, T.sampleEnd - 0.6, 0.6)) * (1 - 0.75 * Math.max(0, card));
  const [act] = actAt(t);
  ctx.save();
  ctx.globalAlpha = a;
  drawChapter(ctx, 6, act, 1, { x: 92, y: 292 });
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `500 30px ${SANS}`;
  ctx.letterSpacing = '8px';
  ctx.fillStyle = 'rgba(246,207,126,0.85)';
  ctx.fillText('幸存者偏差', 92, 372);
  ctx.letterSpacing = '0px';
  ctx.font = `700 100px ${SONG}`;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = FILM.text;
  ctx.fillText('你看到的，', 84, 488);
  const grad = ctx.createLinearGradient(0, 520, 0, 610);
  grad.addColorStop(0, '#FFF1C9');
  grad.addColorStop(1, '#D9A548');
  ctx.fillStyle = FILM.text;
  ctx.fillText('都是', 84, 606);
  const w = ctx.measureText('都是').width;
  ctx.fillStyle = grad;
  ctx.fillText('飞回来的', 84 + w, 606);
  ctx.restore();
}

function drawCaptions(ctx, t) {
  for (const cap of captions) {
    if (t < cap.t0 || t > cap.t1) continue;
    const out = 1 - ease.in(prog(t, cap.t1 - 0.3, 0.3));
    if (out <= 0) continue;
    const L = captionLayout(ctx, cap);
    ctx.save();
    ctx.globalAlpha = out;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 16;
    let y = CAP.y;
    ctx.font = `600 ${L.zh.size}px ${SANS}`;
    L.zh.lines.forEach((ln, k) => {
      // The second line starts developing where the first one left off.
      const chars = L.zh.lines.slice(0, k).reduce((n, l) => n + l.reduce((m, [s]) => m + [...s].length, 0), 0);
      developText(ctx, ln, W / 2, y, t, cap.t0 + Math.min(0.6, chars * 0.05));
      y += L.zh.size * 1.3;
    });
    if (L.en.lines.length) {
      y += 6;
      ctx.globalAlpha = out * ease.out(prog(t, cap.t0 + 0.25, 0.55));
      ctx.font = L.en.note ? `400 ${L.en.size}px ${SANS}` : `italic 400 ${L.en.size}px ${SERIF}`;
      ctx.fillStyle = L.en.note ? FILM.faint : FILM.dim;
      ctx.textAlign = 'center';
      for (const ln of L.en.lines) {
        ctx.fillText(ln.map(([s]) => s).join(''), W / 2, y);
        y += L.en.size * 1.35;
      }
    }
    ctx.restore();
  }
}

export default {
  meta: { title: '弹孔（样片 · 抖音竖版）', output: '006-弹孔-样片-抖音竖版.mp4' },
  width: W,
  height: H,
  fps: inner.fps,
  duration: inner.duration,
  bitrate: 8e6,
  audioPeakDb: inner.audioPeakDb,

  async setup() {
    OPTS.captions = false;
    OPTS.chrome = false;
    OPTS.big = 1.45;
    off = document.createElement('canvas');
    off.width = 1920;
    off.height = 1080;
    offCtx = off.getContext('2d', { alpha: false });
    await inner.setup({ canvas: off, ctx: offCtx });
    captions = getCaptions();
    bg = buildFilmBackground(W, H, { cy: 0.5 });
    dust = makeDust(67, 150, W, H);
  },

  audio: inner.audio,

  draw(ctx, t, frame) {
    inner.draw(offCtx, t, frame);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.filter = 'none';
    ctx.drawImage(bg, 0, 0);
    drawDust(ctx, dust, t, W, H, { rgb: '160,196,255', alpha: 0.3 });
    drawBand(ctx, t);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // The picture, with its top and bottom edges feathered into the page instead of hard lines.
    ctx.drawImage(off, 0, VIDEO.y, W, VIDEO.h);
    for (const [y0, dir] of [[VIDEO.y, 1], [VIDEO.y + VIDEO.h, -1]]) {
      const g = ctx.createLinearGradient(0, y0, 0, y0 + dir * 46);
      g.addColorStop(0, 'rgba(5,8,16,0.9)');
      g.addColorStop(1, 'rgba(5,8,16,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(y0, y0 + dir * 46), W, 46);
    }
    drawCaptions(ctx, t);
    const fade = prog(t, T.sampleEnd - 0.6, 0.6);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};
