// Shared look for episode 05 (16:9). Same night palette as the series; amber = "praised" / the
// best group, cyan = "scolded" / the worst group. In-picture type is larger than in earlier
// episodes because the vertical cut shrinks the picture to 56%.
import { SANS, MONO, SERIF, SONG } from '../../engine/fonts.js';
import { prog, ease, lerp } from '../../engine/kit.js';

export { SANS, MONO, SERIF, SONG };
export const W = 1920;
export const H = 1080;

export const C = {
  bg0: '#141C30', bg1: '#06080F', text: '#F4F6FA', dim: 'rgba(244,246,250,0.66)', faint: 'rgba(244,246,250,0.40)',
  amber: '#FFB547', gold: '#FFC86B', cyan: '#5FC9E8', slate: '#8EA2C0', red: '#E0563B', violet: '#B79CFF',
  skill: '#6F7F9C', chalk: 'rgba(240,240,232,0.85)', line: 'rgba(150,170,200,0.30)',
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Alpha for an element living in [a, b], fading in over fin and out over fout.
export function life(t, a, b, fin = 0.35, fout = 0.3) {
  if (t <= a || t >= b) return 0;
  return Math.min(ease.out(prog(t, a, fin)), 1 - ease.in(prog(t, b - fout, fout)));
}

export function pill(g, x, y, text, color, a = 1, size = 40, { fill = 'rgba(7,9,14,0.82)', textColor = null } = {}) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha *= a;
  g.font = `700 ${size}px ${SANS}`;
  const w = g.measureText(text).width + size * 1.3;
  const h = size * 1.75;
  g.fillStyle = fill;
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.stroke();
  g.fillStyle = textColor ?? color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y + size * 0.04);
  g.restore();
}

// Score axis shared by the histogram and the second-flight picture: scores 20–100 -> [x0, x1].
export const SCORE = { lo: 20, hi: 100 };
export const sx = (v, x0, x1) => lerp(x0, x1, (v - SCORE.lo) / (SCORE.hi - SCORE.lo));

// Tick (ok) or cross, drawn as strokes so it never depends on font glyphs. u animates the draw-on.
export function mark(g, x, y, size, ok, color, u = 1) {
  if (u <= 0) return;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = size * 0.16;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  if (ok) {
    g.moveTo(x - size * 0.45, y);
    g.lineTo(x - size * 0.12, y + size * 0.32 * Math.min(1, u * 2));
    if (u > 0.5) g.lineTo(x - size * 0.12 + size * 0.6 * (u - 0.5) * 2, y + size * 0.32 - size * 0.75 * (u - 0.5) * 2);
  } else {
    const s = size * 0.38 * u;
    g.moveTo(x - s, y - s);
    g.lineTo(x + s, y + s);
    g.moveTo(x + s, y - s);
    g.lineTo(x - s, y + s);
  }
  g.stroke();
  g.restore();
}

// Big arrow pointing up (dir = -1) or down (dir = 1), centred at (x, y), length len.
export function arrow(g, x, y, len, dir, color, width = 26) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  const tip = y + (dir * len) / 2;
  const base = y - (dir * len) / 2;
  const head = width * 1.9;
  g.moveTo(x - width / 2, base);
  g.lineTo(x + width / 2, base);
  g.lineTo(x + width / 2, tip - dir * head);
  g.lineTo(x + width * 1.25, tip - dir * head);
  g.lineTo(x, tip);
  g.lineTo(x - width * 1.25, tip - dir * head);
  g.lineTo(x - width / 2, tip - dir * head);
  g.closePath();
  g.fill();
  g.restore();
}

// A "number + unit" pair where the number is monospace and the unit is Chinese (the mono font has
// no CJK glyphs). Drawn left-aligned at (x, y); returns the total width.
export function numUnit(g, num, unit, x, y, { numFont, unitFont, numColor, unitColor, gap = 10 }) {
  g.save();
  g.textAlign = 'left';
  g.font = numFont;
  g.fillStyle = numColor;
  g.fillText(num, x, y);
  const nw = g.measureText(num).width;
  g.font = unitFont;
  g.fillStyle = unitColor;
  g.fillText(unit, x + nw + gap, y);
  const uw = g.measureText(unit).width;
  g.restore();
  return nw + gap + uw;
}
