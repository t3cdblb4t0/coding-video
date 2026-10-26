// A field of small squares, one per simulated game. Cells can sit in a row-major grid or be
// sorted into bar-chart columns; morph() moves every cell between the two with a little stagger.
import { clamp, lerp, ease, mulberry32 } from '../../engine/kit.js';

export class CellField {
  // kind[i]: colour group per cell. grid: { x, y, cols, pitch, size }.
  // bars: [{ x, base, cols, pitch, size, members: [cellIndex, ...] }] (members fill bottom-up).
  constructor({ kind, grid, bars, colors, seed = 7 }) {
    const n = kind.length;
    this.n = n;
    this.kind = kind;
    this.colors = colors;
    this.gx = new Float32Array(n);
    this.gy = new Float32Array(n);
    this.bx = new Float32Array(n);
    this.by = new Float32Array(n);
    this.bs = new Float32Array(n);
    this.delay = new Float32Array(n);
    this.grid = grid;
    const rand = mulberry32(seed);
    for (let i = 0; i < n; i++) {
      this.gx[i] = grid.x + (i % grid.cols) * grid.pitch;
      this.gy[i] = grid.y + Math.floor(i / grid.cols) * grid.pitch;
      this.delay[i] = rand() * 0.35;
      this.bx[i] = this.gx[i];
      this.by[i] = this.gy[i];
      this.bs[i] = grid.size;
    }
    for (const b of bars ?? []) {
      b.members.forEach((i, r) => {
        this.bx[i] = b.x + (r % b.cols) * b.pitch;
        this.by[i] = b.base - (Math.floor(r / b.cols) + 1) * b.pitch;
        this.bs[i] = b.size;
      });
    }
    this.groups = new Map();
    for (let i = 0; i < n; i++) {
      if (!this.groups.has(kind[i])) this.groups.set(kind[i], []);
      this.groups.get(kind[i]).push(i);
    }
  }

  // count: cells shown (by index); morph in [0, 1]; appear(i): time cell i appeared (for a flash);
  // dim: { kind: alpha } multipliers; drop: { kind: u } makes that group fall away (u in [0, 1]).
  draw(g, { count = this.n, morph = 0, t = 0, appear = null, dim = {}, drop = {}, alpha = 1 }) {
    if (alpha <= 0) return;
    g.save();
    for (const [k, idx] of this.groups) {
      const a = alpha * (dim[k] ?? 1);
      if (a <= 0.003) continue;
      const du = drop[k] ?? 0;
      g.fillStyle = this.colors[k];
      g.globalAlpha = a * (1 - du);
      for (const i of idx) {
        if (i >= count) continue;
        const m = ease.inOut(clamp(morph * 1.35 - this.delay[i]));
        let x = lerp(this.gx[i], this.bx[i], m);
        let y = lerp(this.gy[i], this.by[i], m);
        const s = lerp(this.grid.size, this.bs[i], m);
        if (du > 0) {
          const d = clamp(du * 1.4 - this.delay[i]);
          y += d * d * 700;
          x += (this.delay[i] - 0.17) * d * 300;
        }
        g.fillRect(x, y, s, s);
      }
    }
    // Flash on the newest cells while the grid is filling.
    if (appear && morph === 0) {
      g.fillStyle = '#FFFFFF';
      const s = this.grid.size;
      for (let i = Math.max(0, count - 400); i < count; i++) {
        const age = t - appear(i);
        if (age < 0 || age > 0.25) continue;
        g.globalAlpha = alpha * (1 - age / 0.25) * 0.85;
        g.fillRect(this.gx[i], this.gy[i], s, s);
      }
    }
    g.restore();
  }
}
