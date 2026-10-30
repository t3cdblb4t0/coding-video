// Real simulations behind every number shown on screen. Line spacing = 1 everywhere.
// Lines sit at integer y. Centres are uniform in [0, cols) x [0, rows) with integer `rows`,
// so y mod 1 is uniform; orientations are uniform. Seeds are fixed in advance (see 分镜.md).
import { mulberry32 } from '../../engine/kit.js';

export const SEED = 1777; // main experiment
export const TOTAL = 1_000_000;
export const SEEDS = { hook: 31, short: 1, long: 2, noodle: 3, circle: 4 };

// Straight needles of length `len`. hits[i] = number of lines crossed (0, 1, 2, ...).
export function simulate({ count = TOTAL, seed = SEED, cols, rows, len = 1 }) {
  const rand = mulberry32(seed);
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const cos = new Float32Array(count);
  const sin = new Float32Array(count);
  const cross = new Uint8Array(count);
  const cum = new Int32Array(count + 1); // cum[n] = total crossings among the first n needles
  for (let i = 0; i < count; i++) {
    const cx = rand() * cols;
    const cy = rand() * rows;
    const th = rand() * Math.PI;
    const s = Math.sin(th);
    const h = 0.5 * len * s;
    const c = Math.floor(cy + h) - Math.floor(cy - h);
    x[i] = cx;
    y[i] = cy;
    cos[i] = Math.cos(th);
    sin[i] = s;
    cross[i] = c;
    cum[i + 1] = cum[i] + c;
  }
  return { count, len, x, y, cos, sin, cross, cum };
}

export const estimate = (sim, n) => (n > 0 && sim.cum[n] > 0 ? (2 * n) / sim.cum[n] : null);

// Bent needles ("noodles") of total length `len`, as polylines of `segs` equal segments with
// smoothly varying random curvature. Each is placed with uniform random centre and rotation.
// pts holds (segs + 1) points per noodle in world units; cross[i] counts every line crossing.
export function simulateNoodles({ count, seed, cols, rows, len = 2, segs = 24 }) {
  const rand = mulberry32(seed);
  const P = segs + 1;
  const pts = new Float32Array(count * P * 2);
  const cross = new Uint8Array(count);
  const cum = new Int32Array(count + 1);
  const ds = len / segs;
  const hx = new Float64Array(P);
  const hy = new Float64Array(P);
  for (let i = 0; i < count; i++) {
    const a1 = (rand() * 2 - 1) * 4.5;
    const a2 = (rand() * 2 - 1) * 3;
    const f1 = 0.4 + rand() * 0.9;
    const f2 = 1.1 + rand() * 1.4;
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    let h = rand() * Math.PI * 2; // uniform random rotation
    hx[0] = 0;
    hy[0] = 0;
    for (let k = 0; k < segs; k++) {
      const s = (k + 0.5) / segs;
      const kappa = a1 * Math.sin(2 * Math.PI * f1 * s + p1) + a2 * Math.sin(2 * Math.PI * f2 * s + p2);
      h += kappa * ds;
      hx[k + 1] = hx[k] + Math.cos(h) * ds;
      hy[k + 1] = hy[k] + Math.sin(h) * ds;
    }
    // Anchor at the midpoint along the curve, so every point lies within len/2 of the centre.
    const mx = hx[segs >> 1];
    const my = hy[segs >> 1];
    const cx = rand() * cols;
    const cy = rand() * rows;
    let c = 0;
    let prevFloor = 0;
    for (let k = 0; k < P; k++) {
      const px = cx + hx[k] - mx;
      const py = cy + hy[k] - my;
      pts[(i * P + k) * 2] = px;
      pts[(i * P + k) * 2 + 1] = py;
      const f = Math.floor(py);
      if (k > 0) c += Math.abs(f - prevFloor);
      prevFloor = f;
    }
    cross[i] = c;
    cum[i + 1] = cum[i] + c;
  }
  return { count, len, segs, pts, cross, cum };
}

// Circles of diameter 1 (= line spacing): always exactly two crossings (tangency has probability 0).
// `avoid` rectangles ({x0, x1, y0, y1}, world units) keep circles off on-screen labels; this
// only moves where they are drawn, not how many lines they cross (always 2).
export function simulateCircles({ count, seed, cols, rows, minGap = 1.15, avoid = [] }) {
  const rand = mulberry32(seed);
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 10000) {
    const x = 0.6 + rand() * (cols - 1.2);
    const y = 0.6 + rand() * (rows - 1.2);
    if (out.some((c) => Math.hypot(c.x - x, c.y - y) < minGap)) continue; // keep labels readable
    if (avoid.some((r) => x > r.x0 - 0.55 && x < r.x1 + 0.55 && y > r.y0 - 0.55 && y < r.y1 + 0.55)) continue;
    const k = Math.round(y); // the single line within 0.5 of the centre
    const dy = k - y;
    const dx = Math.sqrt(Math.max(0, 0.25 - dy * dy));
    const hits = Math.floor(y + 0.5) - Math.floor(y - 0.5) === 1 ? 2 : 0;
    out.push({ x, y, line: k, dots: [[x - dx, k], [x + dx, k]], hits });
  }
  return out;
}

// Intersection points of a straight needle with the lines (for the crossing dots).
export function needleDots(cx, cy, cos, sin, len) {
  const x0 = cx - (cos * len) / 2;
  const y0 = cy - (sin * len) / 2;
  const x1 = cx + (cos * len) / 2;
  const y1 = cy + (sin * len) / 2;
  const dots = [];
  const lo = Math.min(y0, y1);
  const hi = Math.max(y0, y1);
  for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) {
    const u = (k - y0) / (y1 - y0);
    dots.push([x0 + (x1 - x0) * u, k]);
  }
  return dots;
}
