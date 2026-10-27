// Shared look for episode 03 (16:9): palette and small drawing helpers. Bigger type than
// earlier episodes (feedback: text was too small when watched on a phone).
import { SANS, MONO, SERIF } from '../../engine/fonts.js';
import { prog, ease, lerp } from '../../engine/kit.js';

export { SANS, MONO, SERIF };
export const W = 1920;
export const H = 1080;

export const C = {
  bg0: '#17213A', bg1: '#070A12', text: '#F4F6FA', dim: 'rgba(244,246,250,0.64)', faint: 'rgba(244,246,250,0.40)',
  amber: '#FFB547', gold: '#FFC86B', slate: '#8EA2C0', cyan: '#5FC9E8', green: '#5BC27A', red: '#E0563B',
  line: 'rgba(150,170,200,0.40)', cell: 'rgba(142,162,192,0.55)',
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

// A little standing person: head + rounded body. (cx, base) = centre of the feet; h = height.
export function drawPerson(g, cx, base, h, color, alpha = 1) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = color;
  const headR = h * 0.2;
  const headCy = base - h + headR;
  g.beginPath();
  g.arc(cx, headCy, headR, 0, Math.PI * 2);
  g.fill();
  const bodyTop = headCy + headR + h * 0.04;
  const bw = h * 0.42;
  g.beginPath();
  g.moveTo(cx - bw / 2, base);
  g.lineTo(cx - bw / 2, bodyTop + bw / 2);
  g.quadraticCurveTo(cx - bw / 2, bodyTop, cx, bodyTop);
  g.quadraticCurveTo(cx + bw / 2, bodyTop, cx + bw / 2, bodyTop + bw / 2);
  g.lineTo(cx + bw / 2, base);
  g.closePath();
  g.fill();
  g.restore();
}

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
