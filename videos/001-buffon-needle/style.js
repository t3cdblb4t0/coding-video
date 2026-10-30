// Shared look: canvas size, palette, and small drawing helpers used by every part of the episode.
import { SANS, OLD, MONO } from '../../engine/fonts.js';
import { lerp, prog, ease, measureRich } from '../../engine/kit.js';

export { SANS, OLD, MONO };
export const W = 1080;
export const H = 1920;

export const C = {
  bg0: '#121826', bg1: '#07090E', text: '#F4F6FA', dim: 'rgba(244,246,250,0.62)', faint: 'rgba(244,246,250,0.38)',
  amber: '#FFB547', gold: '#FFC86B', slate: '#8EA2C0', cyan: '#6FD3FF', line: 'rgba(150,170,200,0.45)',
  ink: '#3B2E21', red: '#B4442C',
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

export function lineNeedle(g, X, Y, cos, sin, len) {
  const dx = (cos * len) / 2;
  const dy = (sin * len) / 2;
  g.moveTo(X - dx, Y - dy);
  g.lineTo(X + dx, Y + dy);
}

// Tapered needle with an eye, for close-ups.
export function bigNeedle(g, X, Y, cos, sin, len, w, color, glow = 0) {
  const hx = (cos * len) / 2;
  const hy = (sin * len) / 2;
  const nx = -sin;
  const ny = cos;
  g.save();
  if (glow > 0) {
    g.shadowColor = `rgba(255,181,71,${0.85 * glow})`;
    g.shadowBlur = 26 * glow;
  }
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(X + hx, Y + hy);
  g.lineTo(X - hx + (nx * w) / 2, Y - hy + (ny * w) / 2);
  g.quadraticCurveTo(X - hx - cos * w * 0.9, Y - hy - sin * w * 0.9, X - hx - (nx * w) / 2, Y - hy - (ny * w) / 2);
  g.closePath();
  g.fill();
  g.restore();
  const ex = X - hx + cos * w * 1.6;
  const ey = Y - hy + sin * w * 1.6;
  g.fillStyle = 'rgba(7,9,14,0.85)';
  g.beginPath();
  g.ellipse(ex, ey, w * 0.85, w * 0.22, Math.atan2(sin, cos), 0, Math.PI * 2);
  g.fill();
}

export function ripple(g, X, Y, t, land, color, size) {
  const r = prog(t, land, 0.45);
  if (r <= 0 || r >= 1) return;
  g.save();
  g.globalAlpha *= (1 - r) * 0.8;
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(X, Y, size * (0.3 + ease.out(r) * 0.9), 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

export function dot(g, x, y, r, color, glow = 0) {
  g.save();
  if (glow > 0) {
    g.shadowColor = color;
    g.shadowBlur = glow;
  }
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function pill(g, x, y, text, color, a, size = 34) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha *= a;
  g.font = `700 ${size}px ${SANS}`;
  const w = g.measureText(text).width + size * 1.2;
  const h = size * 1.7;
  g.fillStyle = 'rgba(7,9,14,0.78)';
  g.strokeStyle = color;
  g.lineWidth = 2.5;
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y + size * 0.04);
  g.restore();
}

// Vertical bracket from y0 to y1 at x; side -1 puts the label on the left, +1 on the right.
export function bracket(g, x, y0, y1, side, label, color, size = 40) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - side * 14, y0);
  g.lineTo(x, y0);
  g.lineTo(x, y1);
  g.lineTo(x - side * 14, y1);
  g.stroke();
  g.font = `700 ${size}px ${SANS}`;
  g.textAlign = side < 0 ? 'right' : 'left';
  g.textBaseline = 'middle';
  g.fillText(label, x + side * 22, (y0 + y1) / 2);
  g.restore();
}

// Set ctx.font, shrinking the size so rich text `s` fits within maxWidth.
export function fitFont(ctx, weight, size, family, s, maxWidth) {
  ctx.font = `${weight} ${size}px ${family}`;
  const w = measureRich(ctx, s);
  if (w > maxWidth) ctx.font = `${weight} ${Math.floor((size * maxWidth) / w)}px ${family}`;
}

// Standard fade-in/fade-out alpha for an element living in [a, b].
export function life(t, a, b, fin = 0.35, fout = 0.3) {
  if (t <= a || t >= b) return 0;
  return Math.min(ease.out(prog(t, a, fin)), 1 - ease.in(prog(t, b - fout, fout)));
}

// Floor lines inside a rectangle (screen px), spacing `s`, first line at y0.
export function floorLines(g, rect, y0, s, color = C.line, width = 2) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  for (let y = y0; y <= rect.y + rect.h + 0.5; y += s) {
    if (y < rect.y - 0.5) continue;
    g.moveTo(rect.x, y);
    g.lineTo(rect.x + rect.w, y);
  }
  g.stroke();
  g.restore();
}
