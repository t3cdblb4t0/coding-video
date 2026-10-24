// Buffon's needle, simulated for real. Needle length = line spacing = 1.
// Lines sit at integer y (0..rows). Centres are uniform in [0, cols) x [0, rows), angles uniform
// in [0, π). Because `rows` is an integer, y mod 1 is uniform, so P(cross) = 2/π exactly.
import { mulberry32 } from '../../engine/kit.js';

export const SEED = 1777; // the year Buffon published the problem; chosen up front, not tuned
export const TOTAL = 1_000_000;

export function simulate({ count = TOTAL, seed = SEED, cols, rows }) {
  const rand = mulberry32(seed);
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const cos = new Float32Array(count);
  const sin = new Float32Array(count);
  const cross = new Uint8Array(count);
  const cum = new Int32Array(count + 1); // cum[n] = crossings among the first n needles
  for (let i = 0; i < count; i++) {
    const cx = rand() * cols;
    const cy = rand() * rows;
    const th = rand() * Math.PI;
    const s = Math.sin(th);
    const h = 0.5 * s;
    const c = Math.floor(cy - h) !== Math.floor(cy + h) ? 1 : 0;
    x[i] = cx;
    y[i] = cy;
    cos[i] = Math.cos(th);
    sin[i] = s;
    cross[i] = c;
    cum[i + 1] = cum[i] + c;
  }
  return { count, x, y, cos, sin, cross, cum };
}

export const estimate = (sim, n) => (n > 0 && sim.cum[n] > 0 ? (2 * n) / sim.cum[n] : null);
