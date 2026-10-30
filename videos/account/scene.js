// Account avatar for 「算给你看」: 半枫, a maple leaf that is half leaf and half digital life.
// User, 10-29: the core is 数字生命 (digital life) and 半枫, which sounds like 半疯 (half mad).
//   Left half: the leaf as it grows, gold near the stalk and red towards the edges, with its veins
//   and the fine network of smaller veins between them (the leaf's own cells).
//   Right half: the same half leaf as square cells of Conway's Game of Life, the best-known digital
//   life: each cell lives or dies by counting its 8 neighbours. The leaf's cells are held alive, so
//   the whole outline reads; at the mouth of the gap between the central and the side lobe, the
//   edge cells and a scatter of cells just outside are left to the rules for 4 generations (the
//   ones that die leave a faint trace). Three gliders, the Game of Life's walkers, fly off from
//   there. The leaf's veins carry on across the midrib as lines of gold cells.
//   The midrib between the halves glows: the line where the leaf turns into code.
//   Two versions: 半枫 as above, and 半疯, where strips of the digital half slip sideways with red
//   and blue fringes, like a glitching screen, while the leaf half stays whole.
// node engine/render.mjs videos/account --avatar  -> output/算给你看-头像-<name>.png + a check sheet
// (Douyin crops avatars to a circle, as small as ~36 px in comments, with a red follow "+" over the
// bottom edge in the feed.) The earlier options (planet, die, bell curve) are in git history.
import { clamp, lerp, smooth, mulberry32 } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust } from '../../engine/film.js';

const S = 1080;
const ICE = [127, 216, 242];

function layer(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
const rgba = ([r, g, b], a = 1) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
const mix = (c0, c1, t) => [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];

// ---- noise -------------------------------------------------------------------------------------
function hash2(i, j, s) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash2(i, j, s), hash2(i + 1, j, s), sx), lerp(hash2(i, j + 1, s), hash2(i + 1, j + 1, s), sx), sy);
}
// Distances to the nearest and second-nearest of a jittered grid of points (Worley noise): where the
// two are close, the pixel lies on a boundary between cells.
function worley(x, y, s) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const px = i + di + hash2(i + di, j + dj, s);
      const py = j + dj + hash2(i + di, j + dj, s + 101);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return [f1, f2];
}

// ---- the leaf ----------------------------------------------------------------------------------
// Leaf units: origin where the stalk meets the blade, y up, the central lobe's tip at (0, 1). The
// right half runs from that tip clockwise down to the stalk; the left half is its mirror image.
// 't' = a lobe tip or tooth (sharp), 'n' = the notch between teeth, 's' = a sinus between lobes
// (rounded), 'e' = the end, on the midrib.
// Proportions of a sugar maple leaf: a central lobe with two shoulders, side lobes with a tooth above
// and below their tip, small lobes at the base.
const OUTLINE = [
  [0, 1, 't'],
  [0.1, 0.79, 'n'],
  [0.25, 0.845, 't'],
  [0.19, 0.5, 's'],
  [0.355, 0.64, 't'],
  [0.405, 0.54, 'n'],
  [0.61, 0.585, 't'],
  [0.535, 0.37, 'n'],
  [0.63, 0.32, 't'],
  [0.3, 0.07, 's'],
  [0.345, -0.055, 't'],
  [0.05, -0.005, 's'],
  [0, -0.02, 'e'],
];
const BOW = 0.06; // how far each edge between two points curves inwards, as a share of its length
const ROUND = 0.05; // how much of the outline around each sinus is replaced by a rounded curve

function bez(a, c, b, t) {
  const s = 1 - t;
  return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]];
}
function halfOutline() {
  const pts = [[OUTLINE[0][0], OUTLINE[0][1]]];
  const marks = [0];
  for (let i = 1; i < OUTLINE.length; i++) {
    const a = OUTLINE[i - 1];
    const b = OUTLINE[i];
    // Going clockwise with y up, the inside of the leaf is to the right: (dy, -dx).
    const c = [(a[0] + b[0]) / 2 + BOW * (b[1] - a[1]), (a[1] + b[1]) / 2 - BOW * (b[0] - a[0])];
    for (let k = 1; k <= 24; k++) pts.push(bez(a, c, b, k / 24));
    marks.push(pts.length - 1);
  }
  for (let m = OUTLINE.length - 1; m >= 0; m--) {
    if (OUTLINE[m][2] !== 's') continue;
    const at = marks[m];
    const V = pts[at];
    let a = at;
    while (a > 0 && Math.hypot(pts[a][0] - V[0], pts[a][1] - V[1]) < ROUND) a--;
    let b = at;
    while (b < pts.length - 1 && Math.hypot(pts[b][0] - V[0], pts[b][1] - V[1]) < ROUND) b++;
    const curve = [];
    for (let k = 1; k < 16; k++) curve.push(bez(pts[a], V, pts[b], k / 16));
    pts.splice(a + 1, b - a - 1, ...curve);
  }
  return pts;
}
const HALF = halfOutline();
const LEAF = [...HALF, ...HALF.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
const LEFT = [...HALF.map(([x, y]) => [-x, y])];

function pathOf(pts, close = true) {
  const p = new Path2D();
  pts.forEach(([x, y], k) => (k ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (close) p.closePath();
  return p;
}
function insidePoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Veins of the right half (mirrored for the left): primary veins from the stalk to the side lobes'
// tips (the midrib to the central tip is the seam), secondary veins out to the teeth.
// [start, control, end, width at the start, width at the end] (widths in px at 1080).
const VEINS = [
  [[0, 0.02], [0.28, 0.24], [0.6, 0.575], 8, 1.6],
  [[0, 0], [0.17, -0.01], [0.335, -0.05], 6, 1.4],
  [[0, 0.55], [0.1, 0.72], [0.245, 0.835], 3.6, 0.9],
  [[0.26, 0.242], [0.29, 0.45], [0.35, 0.63], 3.6, 0.9],
  [[0.35, 0.327], [0.49, 0.34], [0.62, 0.32], 3.4, 0.9],
];
const veinPts = ([a, c, b], n = 40) => Array.from({ length: n + 1 }, (_, k) => bez(a, c, b, k / n));

// Gold near the stalk, red towards the edges, in patches: the leaf's colour at a point.
const RAMP = [
  [0, [250, 186, 84]],
  [0.3, [243, 128, 48]],
  [0.6, [224, 72, 36]],
  [1, [160, 28, 26]],
];
function ramp(t) {
  for (let k = 1; k < RAMP.length; k++) {
    if (t <= RAMP[k][0]) {
      const [t0, c0] = RAMP[k - 1];
      const [t1, c1] = RAMP[k];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return RAMP[RAMP.length - 1][1].slice();
}
function leafColor(x, y) {
  const r = Math.hypot(x, y);
  const m = vnoise(x * 4 + 7.3, y * 4 + 1.1, 3);
  const m2 = vnoise(x * 12 + 2.2, y * 12 + 5.5, 9);
  return ramp(clamp(r / 0.9 + (m - 0.5) * 0.36 + (m2 - 0.5) * 0.1));
}

// ---- Conway's Game of Life ---------------------------------------------------------------------
function lifeStep(cur, NI, NJ, fixed, free) {
  const nxt = new Uint8Array(NI * NJ);
  for (let j = 0; j < NJ; j++) {
    for (let i = 0; i < NI; i++) {
      const k = j * NI + i;
      if (fixed[k]) {
        nxt[k] = 1;
        continue;
      }
      if (!free[k]) continue;
      let n = 0;
      for (let dj = -1; dj <= 1; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= NJ) continue;
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          if ((di || dj) && ii >= 0 && ii < NI) n += cur[jj * NI + ii];
        }
      }
      nxt[k] = n === 3 || (n === 2 && cur[k]) ? 1 : 0;
    }
  }
  return nxt;
}
// A glider heading up and to the right (y up), in each of its 4 phases.
function gliderPhases() {
  const N = 8;
  let g = new Uint8Array(N * N);
  for (const [i, j] of [[1, 2], [2, 3], [0, 4], [1, 4], [2, 4]]) g[j * N + i] = 1;
  const all = new Uint8Array(N * N).fill(1);
  const none = new Uint8Array(N * N);
  const phases = [];
  for (let s = 0; s < 4; s++) {
    const cells = [];
    for (let k = 0; k < N * N; k++) if (g[k]) cells.push([k % N, (k / N) | 0]);
    const i0 = Math.min(...cells.map((c) => c[0]));
    const j0 = Math.min(...cells.map((c) => c[1]));
    phases.push(cells.map(([i, j]) => [i - i0, j - j0]));
    g = lifeStep(g, N, N, none, all);
  }
  return phases;
}

// ---- the picture -------------------------------------------------------------------------------
// glitch: the 半疯 variant. Strips of the digital half slip sideways and its colours split, the way a
// screen glitches. The leaf half is left alone: one half sane, one half mad.
export function drawHalfMaple(ctx, { w = S, tilt = 0.12, glitch = false, gens = 4, seed = 2026 } = {}) {
  const u = w / S;
  const U = 610 * u; // one leaf unit in px
  const anchor = [0.06, 0.47]; // the leaf point placed at the centre of the picture
  const cosA = Math.cos(tilt);
  const sinA = Math.sin(tilt);
  const cx = w / 2 - (anchor[0] * cosA + anchor[1] * sinA) * U;
  const cy = w / 2 + (-anchor[0] * sinA + anchor[1] * cosA) * U;
  const toCanvas = (x, y) => [cx + U * (x * cosA + y * sinA), cy - U * (-x * sinA + y * cosA)];
  const toLeaf = (X, Y) => [((X - cx) * cosA + (Y - cy) * sinA) / U, ((X - cx) * sinA - (Y - cy) * cosA) / U];
  const leafT = (g = ctx) => g.setTransform(U * cosA, U * sinA, U * sinA, -U * cosA, cx, cy);
  const px = (v) => (v * u) / U; // px at 1080 -> leaf units
  const leafPath = pathOf(LEAF);
  const leftPath = pathOf(LEFT);
  const leftEdge = pathOf(LEFT, false);
  const rightEdge = pathOf(HALF, false);

  ctx.save();
  ctx.drawImage(buildFilmBackground(w, w, { cx: 0.5, cy: 0.5, seed: 61 }), 0, 0);
  drawDust(ctx, makeDust(61, Math.round(150 * u * u + 20), w, w), 0, w, w, { rgb: '160,196,255', alpha: 0.3 });
  // Halos: warm behind the leaf half, cold behind the digital half.
  for (const [lx, ly, c, a] of [[-0.36, 0.45, [236, 96, 44], 0.15], [0.4, 0.45, ICE, 0.1]]) {
    const [hx, hy] = toCanvas(lx, ly);
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 0.9 * U);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  }

  // ---- the digital half's grid and its Game of Life run ----
  const p = 0.03; // cell pitch in leaf units (18 px at 1080)
  const y0 = -0.3;
  const NI = Math.ceil(1.0 / p);
  const NJ = Math.ceil((1.3 - y0) / p);
  const cellX = (i) => (i + 0.5) * p;
  const cellY = (j) => y0 + (j + 0.5) * p;
  // A cell belongs to the leaf when at least 6 of 16 points spread over its square lie inside the
  // outline, so the narrow teeth keep their cells.
  const inLeaf = new Uint8Array(NI * NJ);
  for (let j = 0; j < NJ; j++) {
    for (let i = 0; i < NI; i++) {
      let n = 0;
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) n += insidePoly(LEAF, cellX(i) + ((a + 0.5) / 4 - 0.5) * p, cellY(j) + ((b + 0.5) / 4 - 0.5) * p) ? 1 : 0;
      }
      inLeaf[j * NI + i] = n >= 6 ? 1 : 0;
    }
  }
  const bfs = (src) => {
    const dist = new Int16Array(NI * NJ).fill(-1);
    const q = [];
    for (let k = 0; k < NI * NJ; k++) {
      if (src(k)) {
        dist[k] = 0;
        q.push(k);
      }
    }
    for (let h = 0; h < q.length; h++) {
      const k = q[h];
      const i = k % NI;
      const j = (k / NI) | 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= NI || jj >= NJ) continue;
          const kk = jj * NI + ii;
          if (dist[kk] < 0) {
            dist[kk] = dist[k] + 1;
            q.push(kk);
          }
        }
      }
    }
    return dist;
  };
  const din = bfs((k) => !inLeaf[k]); // inside: cells to the nearest cell outside the leaf
  const dout = bfs((k) => inLeaf[k]); // outside: cells to the leaf
  // The corner the gliders leave from, at the mouth of the gap between the central and the side lobe.
  // Everywhere else the leaf's cells are held alive, so the whole outline stays readable; here the
  // edge cells, and a scatter of cells just outside, are left to the rules.
  const EXIT = [0.27, 0.66];
  const zone = (x, y) => Math.exp(-((x - EXIT[0]) ** 2 + (y - EXIT[1]) ** 2) / (2 * 0.09 ** 2));
  const rand = mulberry32(seed);
  const fixed = new Uint8Array(NI * NJ);
  const free = new Uint8Array(NI * NJ);
  let cur = new Uint8Array(NI * NJ);
  for (let k = 0; k < NI * NJ; k++) {
    const z = zone(cellX(k % NI), cellY((k / NI) | 0));
    if (inLeaf[k] && (din[k] >= 2 || z < 0.3)) fixed[k] = 1;
    if (!fixed[k] && (inLeaf[k] || (dout[k] <= 3 && z > 0.12))) free[k] = 1;
    if (inLeaf[k]) cur[k] = fixed[k] || rand() < 0.8 ? 1 : 0;
    else if (free[k]) cur[k] = rand() < 0.5 * z ? 1 : 0;
  }
  const last = new Int16Array(NI * NJ).fill(-1); // the last generation each cell was alive
  for (let k = 0; k < NI * NJ; k++) if (cur[k]) last[k] = 0;
  for (let g = 1; g <= gens; g++) {
    cur = lifeStep(cur, NI, NJ, fixed, free);
    for (let k = 0; k < NI * NJ; k++) if (cur[k]) last[k] = g;
  }
  // Gliders leaving through the gap, fading as they go.
  const phases = gliderPhases();
  const GLIDERS = [[0.31, 0.75, 0, 0.95], [0.41, 0.85, 1, 0.68], [0.51, 0.95, 2, 0.42]];
  const glider = new Map();
  for (const [gx, gy, ph, a] of GLIDERS) {
    const i0 = Math.round(gx / p);
    const j0 = Math.round((gy - y0) / p);
    // Clear the cells around each glider so it reads as one shape.
    for (let dj = -2; dj <= 4; dj++) {
      for (let di = -2; di <= 4; di++) {
        const i = i0 + di;
        const j = j0 + dj;
        if (i >= 0 && j >= 0 && i < NI && j < NJ && !inLeaf[j * NI + i]) {
          cur[j * NI + i] = 0;
          last[j * NI + i] = -1;
        }
      }
    }
    for (const [di, dj] of phases[ph]) glider.set((j0 + dj) * NI + i0 + di, a);
  }
  const veinCell = new Uint8Array(NI * NJ);
  const veinSamples = VEINS.flatMap((v) => veinPts(v, 80));
  for (let k = 0; k < NI * NJ; k++) {
    if (!cur[k] || !inLeaf[k]) continue;
    const x = cellX(k % NI);
    const y = cellY((k / NI) | 0);
    if (veinSamples.some(([vx, vy]) => Math.abs(vx - x) < 0.5 * p && Math.abs(vy - y) < 0.5 * p)) veinCell[k] = 1;
  }
  let nLeaf = 0;
  let nHeld = 0;
  let nDied = 0;
  let nOut = 0;
  for (let k = 0; k < NI * NJ; k++) {
    nLeaf += inLeaf[k];
    nHeld += fixed[k];
    if (inLeaf[k] && !cur[k]) nDied++;
    if (!inLeaf[k] && cur[k]) nOut++;
  }
  console.log(`[avatar] grid ${NI}x${NJ}: ${nLeaf} cells in the half leaf, ${nHeld} held alive; after ${gens} generations of Life near the gap, ${nDied} leaf cells dead and ${nOut} grown outside; ${GLIDERS.length} gliders`);

  // ---- the stalk, behind the blade ----
  leafT();
  const stalk = veinPts([[0, 0], [0, -0.16], [-0.055, -0.3]], 30);
  for (let k = 1; k < stalk.length; k++) {
    const t = k / (stalk.length - 1);
    ctx.strokeStyle = rgba(mix([200, 78, 36], [128, 34, 22], t));
    ctx.lineWidth = px(lerp(10, 4.5, t));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(...stalk[k - 1]);
    ctx.lineTo(...stalk[k]);
    ctx.stroke();
  }

  // ---- the leaf half ----
  // Edge shading comes from a blurred mask of the whole leaf: 1 deep inside, 0.5 at the edge.
  const mask = layer(w);
  const mg = mask.getContext('2d');
  leafT(mg);
  mg.fillStyle = '#fff';
  mg.fill(leafPath);
  const soft = layer(w);
  const sg = soft.getContext('2d');
  sg.filter = `blur(${Math.max(1, Math.round(20 * u))}px)`;
  sg.drawImage(mask, 0, 0);
  const edge = sg.getImageData(0, 0, w, w).data;
  const tex = layer(w);
  const tg = tex.getContext('2d');
  const img = tg.createImageData(w, w);
  const d = img.data;
  const cellSize = 0.05;
  for (let Y = 0; Y < w; Y++) {
    for (let X = 0; X < w; X++) {
      const [x, y] = toLeaf(X + 0.5, Y + 0.5);
      if (x > 0.02 || x < -0.7 || y < -0.15 || y > 1.05) continue;
      const o = (Y * w + X) * 4;
      let [R, G, B] = leafColor(x, y);
      const [f1, f2] = worley(x / cellSize, y / cellSize, 17);
      const line = 1 - smooth(0, 0.1, f2 - f1);
      const dome = smooth(0.15, 0.8, f1);
      R += (255 - R) * 0.16 * line - 12 * dome;
      G += (206 - G) * 0.16 * line - 8 * dome;
      B += (132 - B) * 0.16 * line - 5 * dome;
      const e = clamp((1 - edge[o + 3] / 255) * 2);
      const dk = 1 - 0.3 * e * e;
      d[o] = R * dk;
      d[o + 1] = G * dk * (1 - 0.15 * e);
      d[o + 2] = B * dk * (1 - 0.15 * e);
      d[o + 3] = 255;
    }
  }
  tg.putImageData(img, 0, 0);
  leafT();
  ctx.save();
  ctx.shadowColor = 'rgba(240,104,48,0.6)';
  ctx.shadowBlur = 44 * u;
  ctx.fillStyle = 'rgb(214,74,38)';
  ctx.fill(leftPath);
  ctx.restore();
  ctx.save();
  ctx.clip(leftPath);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tex, 0, 0);
  leafT();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,200,120,0.6)';
  ctx.shadowBlur = 5 * u;
  for (const [a, c, b, w0, w1] of VEINS) {
    const pts = veinPts([[-a[0], a[1]], [-c[0], c[1]], [-b[0], b[1]]]);
    for (let k = 1; k < pts.length; k++) {
      const t = k / (pts.length - 1);
      ctx.strokeStyle = `rgba(255,208,134,${lerp(0.6, 0.2, t)})`;
      ctx.lineWidth = px(lerp(w0, w1, t));
      ctx.beginPath();
      ctx.moveTo(...pts[k - 1]);
      ctx.lineTo(...pts[k]);
      ctx.stroke();
    }
  }
  ctx.restore();
  leafT();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,196,120,0.7)';
  ctx.lineWidth = px(2);
  ctx.shadowColor = 'rgba(255,170,90,0.8)';
  ctx.shadowBlur = 8 * u;
  ctx.stroke(leftEdge);
  ctx.restore();

  // ---- the digital half, drawn on its own layer so the 半疯 variant can tear it ----
  const sz = p * 0.8;
  const round = sz * 0.22;
  // The cells to draw: [i, j, colour, alpha, size]. The leaf's veins carry on across the seam as
  // lines of gold cells.
  const cr = mulberry32(seed + 1);
  const VEIN_GOLD = [255, 226, 168];
  const cells = [];
  for (let k = 0; k < NI * NJ; k++) {
    const i = k % NI;
    const j = (k / NI) | 0;
    const v = cr();
    if (cur[k]) {
      let c = ICE;
      let a;
      if (inLeaf[k]) {
        a = 0.62 + 0.38 * v;
        if (veinCell[k]) [c, a] = [VEIN_GOLD, 0.95];
        else if (v > 0.975) c = mix(ICE, [235, 250, 255], 0.65);
      } else a = clamp(1 - dout[k] / 5) * (0.55 + 0.45 * v);
      cells.push([i, j, c, a, sz]);
    } else if (last[k] >= 0) {
      // Was alive a generation or more ago: a faint trace where a cell has gone.
      cells.push([i, j, ICE, (0.1 * (last[k] + 1)) / (gens + 1), sz * 0.7]);
    }
  }
  for (const [k, a] of glider) cells.push([k % NI, (k / NI) | 0, mix(ICE, [235, 250, 255], 0.4), a, sz]);
  // solid: every cell grown to the full pitch, with no glow and no outline, so the cells merge into
  // one shape (used for the 半疯 colour fringes, which belong on the shape's edges, not between cells).
  // opaque: the same shape with every cell at full strength, to cut the fringes away cleanly.
  const drawDigital = (solid = false, opaque = false) => {
    const c = layer(w);
    const g = c.getContext('2d');
    leafT(g);
    if (!solid) {
      g.strokeStyle = rgba(ICE, 0.32);
      g.lineWidth = px(1.6);
      g.stroke(rightEdge);
      g.shadowColor = rgba(ICE, 0.85);
      g.shadowBlur = 8 * u;
    }
    for (const [i, j, col, a, s0] of cells) {
      const s = solid ? p * 1.02 : s0;
      g.fillStyle = rgba(col, opaque ? 1 : a);
      g.beginPath();
      if (solid) g.rect(cellX(i) - s / 2, cellY(j) - s / 2, s, s);
      else if (g.roundRect) g.roundRect(cellX(i) - s / 2, cellY(j) - s / 2, s, s, round);
      else g.rect(cellX(i) - s / 2, cellY(j) - s / 2, s, s);
      g.fill();
    }
    return c;
  };
  const dig = drawDigital();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (glitch) {
    // 半疯: horizontal strips of the screen slip to the right (fixed strips, so the picture is
    // repeatable), then a red fringe on the left of every cell and a blue one on the right.
    // [top, height, shift] in px at 1080.
    const STRIPS = [[268, 16, 30], [404, 40, 54], [452, 10, 22], [548, 24, 36], [636, 12, 70], [720, 30, 26]];
    const tear = (src) => {
      const t = layer(w);
      const g = t.getContext('2d');
      g.drawImage(src, 0, 0);
      for (const [top, h, dx] of STRIPS) {
        const Y = Math.round(top * u);
        const H = Math.max(1, Math.round(h * u));
        g.clearRect(0, Y, w, H);
        g.drawImage(src, 0, Y, w, H, Math.round(dx * u), Y, w, H);
      }
      return t;
    };
    const torn = tear(dig);
    const shape = tear(drawDigital(true));
    const cut = tear(drawDigital(true, true));
    // A tinted copy of the shape, shifted by dx, with the part that lies over the shape cut away:
    // only the fringe outside the edges shows, and the cells keep their own colour.
    const fringe = (col, dx) => {
      const t = layer(w);
      const g = t.getContext('2d');
      g.drawImage(shape, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = col;
      g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(cut, -dx, 0);
      return t;
    };
    ctx.drawImage(torn, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8;
    for (const [col, dx] of [['rgb(255,56,96)', -7 * u], ['rgb(48,112,255)', 7 * u]]) ctx.drawImage(fringe(col, dx), dx, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else ctx.drawImage(dig, 0, 0);
  ctx.restore();

  // ---- the seam: the midrib, where the leaf turns into code ----
  leafT();
  const seam = new Path2D();
  seam.moveTo(0, -0.02);
  seam.lineTo(0, 1);
  const fade = (c, a) => {
    const g = ctx.createLinearGradient(0, -0.02, 0, 1);
    g.addColorStop(0, rgba(c, 0));
    g.addColorStop(0.12, rgba(c, a));
    g.addColorStop(0.85, rgba(c, a));
    g.addColorStop(1, rgba(c, a * 0.3));
    return g;
  };
  ctx.save();
  ctx.lineCap = 'round';
  for (const [dx, c, a, lw, blur] of [[-3, [255, 170, 90], 0.45, 4, 14], [3, ICE, 0.45, 4, 14], [0, [255, 248, 235], 1, 2.2, 8]]) {
    ctx.save();
    ctx.translate(px(dx), 0);
    ctx.strokeStyle = fade(c, a);
    ctx.lineWidth = px(lw);
    ctx.shadowColor = rgba(c, 0.9);
    ctx.shadowBlur = blur * u;
    ctx.stroke(seam);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export const avatars = {
  半枫: (ctx, o) => drawHalfMaple(ctx, o),
  半疯: (ctx, o) => drawHalfMaple(ctx, { ...o, glitch: true }),
};

export default {
  meta: { title: '账号头像', output: '算给你看.mp4' },
  width: S,
  height: S,
  fps: 30,
  duration: 1,
  avatars,
  draw: (ctx) => drawHalfMaple(ctx),
};
