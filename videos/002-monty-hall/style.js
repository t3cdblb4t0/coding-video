// Shared look for episode 02 (16:9): canvas size, palette and small drawing helpers.
import { SANS, MONO, SERIF } from '../../engine/fonts.js';
import { prog, ease, lerp } from '../../engine/kit.js';

export { SANS, MONO, SERIF };
export const W = 1920;
export const H = 1080;

export const C = {
  bg0: '#141B2B', bg1: '#07090E', text: '#F4F6FA', dim: 'rgba(244,246,250,0.62)', faint: 'rgba(244,246,250,0.38)',
  amber: '#FFB547', gold: '#FFC86B', slate: '#8EA2C0', line: 'rgba(150,170,200,0.45)',
  red: '#E0563B', voidCell: 'rgba(224,86,59,0.55)', paper: '#EFE6D2', ink: '#2E2A26',
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function mix(a, b, u) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], u))).join(',')})`;
}

// Alpha for an element living in [a, b], fading in over fin and out over fout.
export function life(t, a, b, fin = 0.35, fout = 0.3) {
  if (t <= a || t >= b) return 0;
  return Math.min(ease.out(prog(t, a, fin)), 1 - ease.in(prog(t, b - fout, fout)));
}

export function pill(g, x, y, text, color, a = 1, size = 34, { fill = 'rgba(7,9,14,0.82)', textColor = null } = {}) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha *= a;
  g.font = `700 ${size}px ${SANS}`;
  const w = g.measureText(text).width + size * 1.2;
  const h = size * 1.7;
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

// Curved arrow from (x0, y0) to (x1, y1), bulging upwards by `bulge` px, drawn on up to fraction u.
export function arcArrow(g, x0, y0, x1, y1, bulge, u, color, width = 5) {
  if (u <= 0) return;
  const cx = (x0 + x1) / 2;
  const cy = Math.min(y0, y1) - bulge;
  const pt = (s) => [(1 - s) ** 2 * x0 + 2 * (1 - s) * s * cx + s * s * x1, (1 - s) ** 2 * y0 + 2 * (1 - s) * s * cy + s * s * y1];
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  const N = 40;
  for (let k = 0; k <= N * u; k++) {
    const [x, y] = pt(k / N);
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  if (u >= 0.98) {
    const [ax, ay] = pt(1);
    const [bx, by] = pt(0.94);
    const a = Math.atan2(ay - by, ax - bx);
    g.beginPath();
    g.moveTo(ax + Math.cos(a) * 6, ay + Math.sin(a) * 6);
    g.lineTo(ax - Math.cos(a - 0.5) * 22, ay - Math.sin(a - 0.5) * 22);
    g.lineTo(ax - Math.cos(a + 0.5) * 22, ay - Math.sin(a + 0.5) * 22);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// A tick mark (✓) or cross (✗), drawn as strokes so it never depends on font glyphs.
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
