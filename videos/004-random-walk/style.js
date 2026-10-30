// Shared look for episode 04 (16:9): night-city palette and small helpers.
import { SANS, MONO, SERIF, SONG } from '../../engine/fonts.js';
import { prog, ease } from '../../engine/kit.js';

export { SANS, MONO, SERIF, SONG };
export const W = 1920;
export const H = 1080;

export const C = {
  bg0: '#141C30', bg1: '#06080F', text: '#F4F6FA', dim: 'rgba(244,246,250,0.64)', faint: 'rgba(244,246,250,0.38)',
  amber: '#FFB547', gold: '#FFC86B', slate: '#8EA2C0', cyan: '#5FC9E8', violet: '#B79CFF', red: '#E0563B',
  street: 'rgba(120,140,180,0.22)', streetHi: 'rgba(150,170,210,0.45)', home: '#FFB547',
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

// A small house icon centred at (x, y), `s` = width.
export function drawHouse(g, x, y, s, color = C.home, alpha = 1, glow = 0) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  if (glow > 0) {
    g.shadowColor = color;
    g.shadowBlur = 24 * glow;
  }
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - s * 0.55);
  g.lineTo(x + s * 0.55, y - s * 0.05);
  g.lineTo(x + s * 0.4, y - s * 0.05);
  g.lineTo(x + s * 0.4, y + s * 0.45);
  g.lineTo(x - s * 0.4, y + s * 0.45);
  g.lineTo(x - s * 0.4, y - s * 0.05);
  g.lineTo(x - s * 0.55, y - s * 0.05);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#1A1408';
  g.fillRect(x - s * 0.1, y + s * 0.12, s * 0.2, s * 0.33);
  g.restore();
}

// Glowing walker dot.
export function drawWalker(g, x, y, r, color, alpha = 1) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  const halo = g.createRadialGradient(x, y, 0, x, y, r * 4);
  halo.addColorStop(0, color);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha *= 0.35;
  g.fillStyle = halo;
  g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  g.globalAlpha /= 0.35;
  g.fillStyle = '#FFFFFF';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// A small bird silhouette centred at (x, y), wings flapping with phase `ph`.
export function drawBird(g, x, y, s, color, ph = 0, alpha = 1) {
  if (alpha <= 0) return;
  const flap = Math.sin(ph) * 0.45;
  g.save();
  g.globalAlpha *= alpha;
  g.strokeStyle = color;
  g.lineWidth = Math.max(2, s * 0.12);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x - s * 0.6, y - s * (0.15 + flap));
  g.quadraticCurveTo(x - s * 0.25, y - s * (0.35 + flap * 0.5), x, y);
  g.quadraticCurveTo(x + s * 0.25, y - s * (0.35 + flap * 0.5), x + s * 0.6, y - s * (0.15 + flap));
  g.stroke();
  // Body, head and a short tail, so it reads as a bird rather than a tick mark.
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y + s * 0.06, s * 0.2, s * 0.11, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(x + s * 0.22, y - s * 0.02, s * 0.085, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(x - s * 0.18, y + s * 0.06);
  g.lineTo(x - s * 0.36, y + s * 0.0);
  g.lineTo(x - s * 0.34, y + s * 0.16);
  g.closePath();
  g.fill();
  g.restore();
}
