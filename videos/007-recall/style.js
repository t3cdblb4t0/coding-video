// Episode 07 look: the series' night blue, gold and ice, made for a phone. Episode 06 was drawn
// for a monitor: 46 px captions with an English line under them, 22-28 px labels, thin line art,
// a lot of near-black. On a phone a 16:9 film in the vertical feed is about 56% of its size, so
// here: captions 66 px and no English line, labels at least 40 px, key numbers 110 px or more,
// filled shapes instead of hairlines, and one subject filling the frame at a time.
// Colour is vocabulary:
//   ice  = reading, the ordinary way; words on screen     gold = recalling (默写, 自测), the answer
//   red  = forgetting, the low-utility methods            white = text
import { FILM, SANS, SONG, SERIF, MONO } from '../../engine/film.js';
import { prog, ease, clamp } from '../../engine/kit.js';

export const W = 1920;
export const H = 1080;
export const C = { ...FILM, ice: '#7FD8F2', iceDeep: '#2B6F8C', paper: '#FFF3DC' };
export { SANS, SONG, SERIF, MONO };

export function life(t, a, b, fin = 0.4, fout = 0.4) {
  if (t <= a || t >= b) return 0;
  return Math.min(ease.out(prog(t, a, fin)), 1 - ease.in(prog(t, b - fout, fout)));
}

export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// A rounded card: soft fill, a border, an optional glow.
export function card(ctx, x, y, w, h, { r = 18, fill = 'rgba(127,216,242,0.08)', stroke = 'rgba(127,216,242,0.55)', lw = 2.5, glow = 0, glowColor = null } = {}) {
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = glowColor ?? stroke;
    ctx.shadowBlur = glow;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.shadowBlur = glow > 0 ? glow * 0.6 : 0;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

// Text with a dark halo so it reads over anything.
export function label(ctx, text, x, y, { size = 44, weight = 600, color = C.text, align = 'center', family = SANS, halo = 12, spacing = 0 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = halo;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Counts a number up from 0 over dur seconds starting at t0 (integers).
export const countUp = (t, t0, dur, v) => Math.round(v * ease.out(clamp((t - t0) / dur)));
