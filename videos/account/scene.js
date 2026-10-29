// Account avatar for 「算给你看」. The series' gold Song "算" on the night-blue of the films, the
// same look as the title cards from episode 06. Its texture is computed: points are scattered at
// random over the frame (seeded) and only the ones that land inside the character are kept, the
// way the needles in episode 01 and the dots in episodes 05-06 were counted.
//   node engine/render.mjs videos/account --avatar     -> output/算给你看-头像.png (+ a check sheet)
// Douyin shows avatars as a circle, as small as ~36 px in comments, with its red follow "+" over the
// bottom edge in the feed: the character fills the middle of the circle and nothing else matters.
import { mulberry32 } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust } from '../../engine/film.js';
import { SONG } from '../../engine/fonts.js';

const S = 1080;
const GLYPH = '算';
const SEED = 2026;

// Where the character goes, by its ink box (not its em box), centred a little above the middle so
// the follow "+" covers only the bottom strokes.
function layout(ctx, w) {
  const size = Math.round(w * 0.66);
  ctx.font = `700 ${size}px ${SONG}`;
  const m = ctx.measureText(GLYPH);
  const cx = w / 2;
  const cy = w * 0.48;
  return {
    font: ctx.font,
    x: cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
    y: cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2,
    box: {
      x0: cx - (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2,
      y0: cy - (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 2,
      w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    },
  };
}

// Rejection sampling: random points over the ink box, kept if they fall on the character.
function samplePoints(L, w, n, seed) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = w;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = L.font;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillStyle = '#fff';
  g.fillText(GLYPH, L.x, L.y);
  const img = g.getImageData(0, 0, w, w).data;
  const rand = mulberry32(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries < n * 40) {
    tries++;
    const x = L.box.x0 + rand() * L.box.w;
    const y = L.box.y0 + rand() * L.box.h;
    if (img[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 150) pts.push({ x, y, s: rand(), c: rand() });
  }
  return { pts, kept: pts.length, tries };
}

function sprite(rgb, size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.3, `rgba(${rgb},0.9)`);
  grad.addColorStop(0.55, `rgba(${rgb},0.25)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

// solid: opacity of the filled character; dots: how many sampled points to lay over it; sparkle:
// their brightness.
export function drawAvatar(ctx, { w = S, solid = 1, dots = 900, glow = 1, sparkle = 0.6 } = {}) {
  const u = w / S;
  ctx.save();
  ctx.drawImage(buildFilmBackground(w, w, { cx: 0.5, cy: 0.47, seed: 9 }), 0, 0);
  drawDust(ctx, makeDust(SEED, Math.round(90 * u * u + 30), w, w), 0, w, w, { rgb: '160,196,255', alpha: 0.4 });
  const L = layout(ctx, w);
  ctx.font = L.font;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const grad = ctx.createLinearGradient(0, L.box.y0, 0, L.box.y0 + L.box.h);
  grad.addColorStop(0, '#FFF1C9');
  grad.addColorStop(1, '#D9A548');
  if (solid > 0) {
    // Glow first (a blurred copy), then the character itself on top, crisp.
    ctx.globalAlpha = solid * 0.55 * glow;
    ctx.filter = `blur(${Math.round(26 * u)}px)`;
    ctx.fillStyle = '#F6CF7E';
    ctx.fillText(GLYPH, L.x, L.y);
    ctx.filter = 'none';
    ctx.globalAlpha = solid;
    ctx.fillStyle = grad;
    ctx.fillText(GLYPH, L.x, L.y);
  }
  if (dots > 0) {
    const { pts, tries } = samplePoints(L, w, dots, SEED);
    console.log(`[avatar] scattered ${tries} points over the character's box, kept the ${pts.length} that landed on it`);
    const warm = sprite('255,244,222', 32);
    const gold = sprite('246,207,126', 32);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pts) {
      const d = (6 + 9 * p.s) * u;
      ctx.globalAlpha = sparkle * (0.35 + 0.45 * p.s);
      ctx.drawImage(p.c < 0.55 ? warm : gold, p.x - d / 2, p.y - d / 2, d, d);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

export default {
  meta: { title: '账号头像', output: '算给你看.mp4' },
  width: S,
  height: S,
  fps: 30,
  duration: 1,
  avatar: (ctx, { w }) => drawAvatar(ctx, { w }),
  draw: (ctx) => drawAvatar(ctx),
};
