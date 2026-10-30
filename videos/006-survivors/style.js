// Episode 06 look ("夜航"): the film grammar from engine/film.js, a night-blue frame, the aircraft
// as thin ice-blue line art. Colour is vocabulary and never changes meaning within the film:
//   ice  = the aircraft, what is known      white = holes we can see (planes that came back)
//   red  = holes we never see (planes that were lost), and wrong answers
//   gold = the answer, the key number, the denominator
import { FILM, SANS, SONG, SERIF, MONO } from '../../engine/film.js';
import { prog, ease } from '../../engine/kit.js';

export const W = 1920;
export const H = 1080;
export const C = { ...FILM, plane: '#7FD8F2', hole: '#FFF1D6', lost: '#F0566E' };
export { SANS, SONG, SERIF, MONO };

export function life(t, a, b, fin = 0.4, fout = 0.4) {
  if (t <= a || t >= b) return 0;
  return Math.min(ease.out(prog(t, a, fin)), 1 - ease.in(prog(t, b - fout, fout)));
}

// A soft dot sprite (core + glow), drawn with drawImage: far cheaper than shadowBlur per dot.
export function dotSprite(rgb, size = 32) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.22, `rgba(${rgb},0.95)`);
  grad.addColorStop(0.38, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
