// Account avatar options for 「算给你看」, all drawn in code in the films' language: night blue,
// fine stars, gold = what the computation finds, ice blue = the rest, thin glowing lines, no
// lettering. Each picture comes from a computation with a fixed seed (logged when rendered):
//   A 星球  12,000 points spread evenly over a sphere (a Fibonacci lattice), lit from the upper left,
//          with a banded ring and a point of light riding it: the genre's "point of light on a line".
//   B 骰子  a die in line art, the series' symbol of luck (episodes 05-07 are about luck vs skill).
//   C 钟形  200,000 balls dropped through 30 rows of pegs; where they land piles into a bell curve.
//   node engine/render.mjs videos/account --avatar   -> output/算给你看-头像-A/B/C.png + a check sheet
// Douyin shows avatars as a circle, as small as ~36 px in comments, with its red follow "+" over the
// bottom edge in the feed: each design is one bold shape in the middle of the circle.
import { clamp, lerp, smooth, mulberry32 } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust } from '../../engine/film.js';

const S = 1080;
const GOLD = '246,207,126';
const WARM = '255,241,214';
const ICE = '127,216,242';

const sprites = new Map();
function sprite(rgb) {
  if (sprites.has(rgb)) return sprites.get(rgb);
  const n = 64;
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.22, `rgba(${rgb},0.95)`);
  grad.addColorStop(0.42, `rgba(${rgb},0.3)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  sprites.set(rgb, c);
  return c;
}
function dot(ctx, rgb, x, y, d, a) {
  if (a <= 0.003) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(sprite(rgb), x - d / 2, y - d / 2, d, d);
}
function glowLine(ctx, path, rgb, lw, alpha, blur) {
  ctx.save();
  // Reset what dot() leaves behind: the near half of the ring was drawn at the last dot's alpha.
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = `rgba(${rgb},${alpha})`;
  ctx.shadowColor = `rgba(${rgb},0.9)`;
  ctx.shadowBlur = blur;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(path);
  ctx.restore();
}
function layer(w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = w;
  return c;
}

function backdrop(ctx, w, seed) {
  ctx.drawImage(buildFilmBackground(w, w, { cx: 0.5, cy: 0.5, seed }), 0, 0);
  drawDust(ctx, makeDust(seed, Math.round(150 * (w / S) ** 2 + 20), w, w), 0, w, w, { rgb: '160,196,255', alpha: 0.32 });
}

// A · 星球: 12,000 points spread evenly over a sphere (a Fibonacci lattice, each point nudged by at
// most 15% of the spacing along each axis so it reads as fine grain, not a mesh), lit from the upper left: gold
// where the light falls, an ice-blue rim on the night side, and grains that shrink towards the
// edge the way marks on a real ball do. A banded ring, like Saturn's, passes behind the planet and
// in front of it, with a point of light riding its near side.
export function drawPlanet(ctx, { w = S } = {}) {
  const u = w / S;
  const cx = w * 0.5;
  const cy = w * 0.515;
  const R = 0.245 * w;
  const M = 12000;
  const ga = Math.PI * (3 - Math.sqrt(5));
  const jit = 0.3 * Math.sqrt((4 * Math.PI) / M);
  const tilt = 0.42;
  const spin = 0.7;
  const L = [-0.55, -0.62, 0.56].map((x, _, v) => x / Math.hypot(...v));
  const jr = mulberry32(2600);
  const pts = [];
  for (let i = 0; i < M; i++) {
    const y0 = 1 - (2 * (i + 0.5)) / M;
    const r = Math.sqrt(1 - y0 * y0);
    const th = ga * i;
    let x = Math.cos(th) * r + (jr() - 0.5) * jit;
    let y = y0 + (jr() - 0.5) * jit;
    let z = Math.sin(th) * r + (jr() - 0.5) * jit;
    const nn = Math.hypot(x, y, z);
    x /= nn;
    y /= nn;
    z /= nn;
    [x, z] = [x * Math.cos(spin) + z * Math.sin(spin), -x * Math.sin(spin) + z * Math.cos(spin)];
    [y, z] = [y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
    if (z <= 0) continue; // only the near half shows
    pts.push({ x, y, z, lit: clamp(x * L[0] + y * L[1] + z * L[2]) });
  }
  pts.sort((a, b) => a.z - b.z);
  // The ring: an ellipse seen from a little above its plane, near side at the bottom.
  const K = 0.2;
  const ROT = -0.36;
  const ringPt = (t, r) => {
    const ex = Math.cos(t) * r * R;
    const ey = Math.sin(t) * r * R * K;
    return [cx + ex * Math.cos(ROT) - ey * Math.sin(ROT), cy + ex * Math.sin(ROT) + ey * Math.cos(ROT)];
  };
  const arc = (r, t0, t1) => {
    const p = new Path2D();
    for (let k = 0; k <= 240; k++) {
      const [x, y] = ringPt(lerp(t0, t1, k / 240), r);
      if (k === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    return p;
  };
  // Bands (radius in planet radii, brightness), with a dark gap between the inner and outer ring.
  const BANDS = [
    [1.42, 0.14], [1.46, 0.3], [1.5, 0.44], [1.54, 0.36], [1.58, 0.5], [1.62, 0.26],
    [1.69, 0.22], [1.73, 0.34], [1.77, 0.24], [1.81, 0.12],
  ];
  const rr = mulberry32(77);
  const grains = Array.from({ length: 1800 }, () => {
    const outer = rr() < 0.38;
    return { t: rr() * Math.PI * 2, r: outer ? lerp(1.68, 1.82, rr()) : lerp(1.42, 1.63, rr()), s: rr() };
  });
  const ring = (near, f) => {
    const [t0, t1] = near ? [0, Math.PI] : [Math.PI, 2 * Math.PI];
    for (const [r, a] of BANDS) glowLine(ctx, arc(r, t0, t1), ICE, 2.2 * u, a * f, 5 * u);
    ctx.globalCompositeOperation = 'lighter';
    for (const g of grains) {
      if (Math.sin(g.t) > 0 !== near) continue;
      const [x, y] = ringPt(g.t, g.r);
      if (!near && Math.hypot(x - cx, y - cy) < R) continue;
      dot(ctx, g.s > 0.96 ? WARM : ICE, x, y, (3 + 3 * g.s) * u, (0.25 + 0.45 * g.s) * f);
    }
    ctx.globalCompositeOperation = 'source-over';
  };
  console.log(`[avatar A] ${M} points on a sphere (Fibonacci lattice), ${pts.length} on the near side; ring ${BANDS.length} bands + ${grains.length} grains`);
  ctx.save();
  backdrop(ctx, w, 23);
  ring(false, 0.65);
  // The body: a dark disc that hides the stars and the far ring; the light comes from the points.
  const body = ctx.createRadialGradient(cx - 0.35 * R, cy - 0.4 * R, R * 0.1, cx, cy, R);
  body.addColorStop(0, '#141C30');
  body.addColorStop(1, '#060A14');
  ctx.globalAlpha = 1;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  // A soft gold sheen on the lit side under the points, so the planet still reads as gold, lit from
  // one side, when the avatar is shown at 48 px and the points blur together.
  const sheen = ctx.createRadialGradient(cx + L[0] * 0.55 * R, cy + L[1] * 0.55 * R, 0, cx + L[0] * 0.55 * R, cy + L[1] * 0.55 * R, 1.5 * R);
  sheen.addColorStop(0, `rgba(${GOLD},0.3)`);
  sheen.addColorStop(0.45, `rgba(${GOLD},0.12)`);
  sheen.addColorStop(1, `rgba(${GOLD},0)`);
  ctx.fillStyle = sheen;
  ctx.fill();
  // Atmosphere: a gold glow along the lit limb, fading towards the terminator. The conic gradient
  // peaks in the light's direction on screen.
  const la = Math.atan2(L[1], L[0]);
  const cg = ctx.createConicGradient(la - Math.PI, cx, cy);
  cg.addColorStop(0, `rgba(${GOLD},0)`);
  cg.addColorStop(0.3, `rgba(${GOLD},0)`);
  cg.addColorStop(0.5, `rgba(${GOLD},0.8)`);
  cg.addColorStop(0.7, `rgba(${GOLD},0)`);
  cg.addColorStop(1, `rgba(${GOLD},0)`);
  ctx.save();
  ctx.strokeStyle = cg;
  ctx.filter = `blur(${Math.max(1, Math.round(14 * u))}px)`;
  ctx.lineWidth = 22 * u;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
  ctx.stroke();
  ctx.filter = 'none';
  ctx.restore();
  // The points.
  ctx.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const x = cx + p.x * R;
    const y = cy + p.y * R;
    const fs = 0.45 + 0.55 * Math.sqrt(p.z);
    const b = smooth(0, 0.85, p.lit);
    const night = 1 - smooth(0, 0.22, p.lit);
    const rim = (1 - p.z) ** 2.2 * night;
    const d = (5 + 7.5 * b) * fs * u;
    if (b > 0.005) dot(ctx, GOLD, x, y, d, 0.1 + 0.85 * b);
    if (b > 0.6) dot(ctx, WARM, x, y, d * 0.55, (b - 0.6) * 2.2);
    dot(ctx, ICE, x, y, (4.5 + 2.5 * rim) * fs * u, 0.04 * night + 0.9 * rim);
  }
  ctx.globalCompositeOperation = 'source-over';
  ring(true, 1);
  // A point of light riding the near side of the ring towards its right end, its trail behind it.
  const tc = 0.42;
  const tail = 0.8;
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 90; k++) {
    const f = 1 - k / 90;
    const [x, y] = ringPt(tc + (k / 90) * tail, 1.81);
    dot(ctx, GOLD, x, y, (5 + 16 * f) * u, 0.6 * f * f);
  }
  const [hx, hy] = ringPt(tc, 1.81);
  dot(ctx, GOLD, hx, hy, 96 * u, 0.5);
  dot(ctx, WARM, hx, hy, 36 * u, 1);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// B · 骰子: an isometric die with softly rounded corners. Faces dark glass with a faint gold rim
// light, edges gold, pips lit from inside; 1 on top, 2 on the right, 3 on the left. On a real die
// 1, 2 and 3 meet at one corner; here they run clockwise round it, as on Chinese dice.
const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
};
export function drawDie(ctx, { w = S } = {}) {
  const u = w / S;
  const cx = w * 0.5;
  const cy = w * 0.52;
  const e = 0.335 * w;
  const c30 = Math.cos(Math.PI / 6);
  const ex = [c30 * e, 0.5 * e];
  const ey = [-c30 * e, 0.5 * e];
  const ez = [0, -e];
  const P = (i, j, k) => [cx + (i - 0.5) * ex[0] + (j - 0.5) * ey[0] + (k - 0.5) * ez[0], cy + (i - 0.5) * ex[1] + (j - 0.5) * ey[1] + (k - 0.5) * ez[1]];
  const face = (pts) => {
    const p = new Path2D();
    pts.forEach(([i, j, k], n) => (n === 0 ? p.moveTo(...P(i, j, k)) : p.lineTo(...P(i, j, k))));
    p.closePath();
    return p;
  };
  const top = face([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]);
  const right = face([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]);
  const left = face([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]);
  // The silhouette, a hexagon with rounded corners.
  const hex = [[0, 0, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1]].map(([i, j, k]) => P(i, j, k));
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const hull = new Path2D();
  hull.moveTo(...mid(hex[5], hex[0]));
  hex.forEach((p, i) => hull.arcTo(...p, ...mid(p, hex[(i + 1) % 6]), 0.075 * e));
  hull.closePath();
  ctx.save();
  backdrop(ctx, w, 41);
  // Floor glow under the die.
  const [bx, by] = P(1, 1, 0);
  const fl = ctx.createRadialGradient(bx, by + 10 * u, 10 * u, bx, by + 10 * u, 0.36 * w);
  fl.addColorStop(0, `rgba(${GOLD},0.22)`);
  fl.addColorStop(1, `rgba(${GOLD},0)`);
  ctx.fillStyle = fl;
  ctx.save();
  ctx.translate(bx, by + 10 * u);
  ctx.scale(1, 0.32);
  ctx.translate(-bx, -(by + 10 * u));
  ctx.beginPath();
  ctx.arc(bx, by + 10 * u, 0.36 * w, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.clip(hull);
  // Faces: top lit, right in half light, left in shade.
  const fill = (path, c0, c1, a, b) => {
    const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fill(path);
  };
  fill(top, '#2C3A5C', '#18223A', P(0, 0, 1), P(1, 1, 1));
  fill(right, '#16213B', '#0B1225', P(1, 0, 1), P(1, 1, 0));
  fill(left, '#0D1529', '#070C19', P(0, 1, 1), P(1, 1, 0));
  // Rim light just inside each face's edges, as if the glass caught the gold edges.
  for (const [f, a] of [[top, 0.2], [right, 0.12], [left, 0.08]]) {
    ctx.save();
    ctx.clip(f);
    ctx.filter = `blur(${Math.max(1, Math.round(12 * u))}px)`;
    ctx.strokeStyle = `rgba(${GOLD},${a})`;
    ctx.lineWidth = 30 * u;
    ctx.stroke(f);
    ctx.filter = 'none';
    ctx.restore();
  }
  // Pips: discs in each face's own plane, brightest in the middle.
  const pips = (n, origin, a, b, core, edge, alpha, glow) => {
    const r = n === 1 ? 0.15 : 0.1;
    for (const [s, t] of PIPS[n]) {
      ctx.save();
      ctx.transform(a[0], a[1], b[0], b[1], origin[0] + s * a[0] + t * b[0], origin[1] + s * a[1] + t * b[1]);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(${core},${alpha})`);
      g.addColorStop(0.55, `rgba(${core},${alpha})`);
      g.addColorStop(1, `rgba(${edge},${alpha})`);
      ctx.shadowColor = `rgba(${edge},0.9)`;
      ctx.shadowBlur = glow * u;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  pips(1, P(0, 0, 1), ex, ey, WARM, GOLD, 1, 30);
  pips(2, P(1, 0, 1), ey, [-ez[0], -ez[1]], '252,224,160', GOLD, 0.92, 20);
  pips(3, P(0, 1, 1), ex, [-ez[0], -ez[1]], GOLD, '214,170,92', 0.78, 16);
  // The three inner edges, finer than the outline.
  const inner = new Path2D();
  for (const q of [P(1, 0, 1), P(0, 1, 1), P(1, 1, 0)]) {
    inner.moveTo(...P(1, 1, 1));
    inner.lineTo(...q);
  }
  glowLine(ctx, inner, GOLD, 2.4 * u, 0.7, 10 * u);
  ctx.restore();
  glowLine(ctx, hull, GOLD, 4 * u, 0.95, 22 * u);
  // A glint on the near top corner.
  ctx.globalCompositeOperation = 'lighter';
  const [gx, gy] = P(1, 1, 1);
  dot(ctx, WARM, gx, gy, 30 * u, 0.85);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// C · 钟形: a Galton board's result. 200,000 balls, each knocked left or right at random by 30 rows
// of pegs, land in 31 bins. The pile's height in each bin is the simulated count (shaped within the
// bin along the normal curve the counts approach, drawn in ice blue), shown as 3,200 grains of
// light. With 12,000 balls a bin 2 sd short left a visible bite out of the peak; with 200,000 every
// pile sits within a few pixels of the curve (the gap is logged). The pile stands on a glass floor
// that reflects it; one more ball is still falling.
const binom = (n, k) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};
export function drawBell(ctx, { w = S } = {}) {
  const u = w / S;
  const rows = 30;
  const N = 200000;
  const rand = mulberry32(1886);
  const bins = new Array(rows + 1).fill(0);
  for (let i = 0; i < N; i++) {
    let k = 0;
    for (let r = 0; r < rows; r++) if (rand() < 0.5) k++;
    bins[k]++;
  }
  const cx = w / 2;
  const base = w * 0.655;
  const sd = Math.sqrt(rows) / 2;
  const bw = (0.8 * w) / (6.4 * sd);
  const hMax = 0.3 * w;
  const mid = rows / 2;
  const pdf = (b) => Math.exp(-0.5 * ((b - mid) / sd) ** 2);
  const peakN = N / (sd * Math.sqrt(2 * Math.PI)); // the normal curve's height in balls per bin
  const max = Math.max(...bins);
  const expected = bins.map((_, k) => (N * binom(rows, k)) / 2 ** rows);
  const worstSd = Math.max(...bins.map((n, k) => Math.abs(n - expected[k]) / Math.sqrt(expected[k] + 1)));
  // What shows: the gap between each bin's pile and the drawn curve, as a share of the curve's peak.
  const gap = Math.max(...bins.map((n, k) => Math.abs(n / peakN - pdf(k))));
  console.log(`[avatar C] ${N} balls through ${rows} rows of pegs; tallest bin ${max} (bin ${bins.indexOf(max)}); largest miss from the binomial expectation ${worstSd.toFixed(2)} sd; largest gap between a pile and the normal curve ${(100 * gap).toFixed(2)}% of the peak (${(gap * hMax).toFixed(1)} px)`);
  const X = (b) => cx + (b - mid) * bw;
  const curveY = (b) => base - hMax * pdf(b);
  const hill = (lo, hi, f) => {
    const p = new Path2D();
    p.moveTo(X(lo), base);
    for (let k = 0; k <= 240; k++) {
      const b = lerp(lo, hi, k / 240);
      p.lineTo(X(b), base - hMax * pdf(b) * f(b));
    }
    p.lineTo(X(hi), base);
    p.closePath();
    return p;
  };
  // The pile, drawn once into its own layer so the floor can reflect it.
  const pile = layer(w);
  const g = pile.getContext('2d');
  const ratio = (b) => {
    const k = clamp(Math.round(b), 0, rows);
    return bins[k] / (peakN * pdf(k));
  };
  const shape = hill(-1.5, rows + 1.5, (b) => (Math.abs(b - mid) > 4.2 * sd ? 1 : ratio(b)));
  const hg = g.createLinearGradient(0, base - hMax, 0, base);
  hg.addColorStop(0, `rgba(${GOLD},0.5)`);
  hg.addColorStop(1, `rgba(${GOLD},0.14)`);
  g.save();
  g.shadowColor = `rgba(${GOLD},0.45)`;
  g.shadowBlur = 44 * u;
  g.fillStyle = hg;
  g.fill(shape);
  g.restore();
  const jr = mulberry32(7);
  const per = N / 3200; // 3,200 grains of light in all
  g.globalCompositeOperation = 'lighter';
  bins.forEach((n, k) => {
    const grains = Math.round(n / per);
    for (let j = 0; j < grains; j++) {
      const b = k + jr() - 0.5;
      const h = hMax * pdf(b) * ratio(k);
      const v = jr();
      const y = base - v * h;
      const nearTop = v > 0.9;
      dot(g, nearTop ? WARM : GOLD, X(b), y, (3.5 + 3 * jr()) * u, (nearTop ? 0.55 : 0.32) + 0.35 * jr());
    }
  });
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  ctx.save();
  backdrop(ctx, w, 37);
  // The reflection: the pile flipped under the floor, fading out.
  const refl = layer(w);
  const rg = refl.getContext('2d');
  rg.save();
  rg.translate(0, 2 * base + 16 * u);
  rg.scale(1, -1);
  rg.drawImage(pile, 0, 0);
  rg.restore();
  rg.globalCompositeOperation = 'destination-in';
  const fade = rg.createLinearGradient(0, base, 0, base + 0.2 * w);
  fade.addColorStop(0, 'rgba(0,0,0,0.32)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  rg.fillStyle = fade;
  rg.fillRect(0, 0, w, w);
  ctx.drawImage(refl, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(pile, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  // The normal curve the bins approach.
  const curve = new Path2D();
  for (let k = 0; k <= 240; k++) {
    const b = lerp(-1.5, rows + 1.5, k / 240);
    if (k === 0) curve.moveTo(X(b), curveY(b));
    else curve.lineTo(X(b), curveY(b));
  }
  glowLine(ctx, curve, ICE, 3 * u, 0.9, 14 * u);
  const floor = new Path2D();
  floor.moveTo(X(-1.5), base + 8 * u);
  floor.lineTo(X(rows + 1.5), base + 8 * u);
  glowLine(ctx, floor, WARM, 2 * u, 0.4, 0);
  // One more ball, still falling, off to the right of the peak.
  ctx.globalCompositeOperation = 'lighter';
  const fx = X(mid + 2.6);
  const fy = base - hMax - 0.09 * w;
  for (let k = 1; k < 16; k++) dot(ctx, GOLD, fx, fy - k * 7 * u, (20 - k) * u, 0.4 * (1 - k / 16));
  dot(ctx, GOLD, fx, fy, 70 * u, 0.5);
  dot(ctx, WARM, fx, fy, 30 * u, 1);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

export const avatars = { A: (ctx, o) => drawPlanet(ctx, o), B: (ctx, o) => drawDie(ctx, o), C: (ctx, o) => drawBell(ctx, o) };

export default {
  meta: { title: '账号头像', output: '算给你看.mp4' },
  width: S,
  height: S,
  fps: 30,
  duration: 1,
  avatars,
  draw: (ctx) => drawPlanet(ctx),
};
