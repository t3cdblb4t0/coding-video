// 0-45.6 s, the 30-second sample: the cold open (planes come home, their holes land on one big
// diagram, "where would you put the armour?"), the title, and the reveal (the planes that never
// came back). All positions are plane-local units mapped through view(t).
import { clamp, lerp, prog, ease, mulberry32 } from '../../engine/kit.js';
import { developText, drawTitleCard, drawFlash, drawDenominator, drawAnchor } from '../../engine/film.js';
import { TYPE } from '../../engine/fonts.js';
import { W, H, C, SANS, SONG, SERIF, MONO, life, dotSprite } from './style.js';
import { planePaths, CHOICES, NACELLES, VITAL } from './plane.js';
import { T, pct } from './timeline.js';

let st = null;
let paths = null;
let spr = null;
let ghosts = [];
let flights = [];
let backHoles = [];
let lostHoles = [];
let landAt = [];

const PRESENT = 24; // planes already home at frame 0, so the first frame is never empty
const GHOSTS = 12;

export function setupAct1(state) {
  st = state;
  paths = planePaths();
  spr = { hole: dotSprite('255,241,214', 40), lost: dotSprite('240,86,110', 40), gold: dotSprite('246,207,126', 40) };
  const p = st.planes;
  const n = p.back.length;
  // Landing times: PRESENT at t = -1, six we watch fly in, then an accelerating stream.
  landAt = new Array(n);
  for (let i = 0; i < n; i++) {
    if (i < PRESENT) landAt[i] = -1;
    else if (i < PRESENT + T.flights.length) landAt[i] = T.flights[i - PRESENT];
    else {
      const j = i - PRESENT - T.flights.length;
      const m = n - PRESENT - T.flights.length;
      const k = 3;
      const u = Math.log(1 + ((j + 1) / m) * (Math.exp(k) - 1)) / k;
      landAt[i] = T.stream0 + u * (T.stream1 - T.stream0);
    }
  }
  backHoles = [];
  p.back.forEach((pl, i) => pl.hits.forEach((h, k) => backHoles.push({ x: h.x, y: h.y, r: h.r, t: landAt[i] + k * 0.03 })));
  // Lost planes' holes appear in two steps: engines first (the point being made), then the rest.
  lostHoles = [];
  const rand = mulberry32(31);
  p.lost.forEach((pl) => pl.hits.forEach((h) => lostHoles.push({ x: h.x, y: h.y, r: h.r, fatal: h.fatal, j: rand() })));
  // The six planes we watch: start beyond the top edge, alternating sides.
  const rf = mulberry32(5);
  // (Kept clear of the chapter mark top-left and the counter top-right.)
  flights = T.flights.map((land, k) => ({ land, x0: k % 2 ? 1250 + rf() * 380 : 330 + rf() * 380, y0: -60, idx: PRESENT + k }));
  // Ghosts: the first 12 lost planes in simulation order (a fixed rule, not picked by look).
  ghosts = p.lost.slice(0, GHOSTS).map((pl, k) => {
    const col = k % 4;
    const row = Math.floor(k / 4);
    const x = [205, 470, 1450, 1715][col];
    const y = [250, 470, 690][row];
    return { pl, x, y, k };
  });
}

export const landedCount = (t) => {
  let n = 0;
  for (const a of landAt) if (a <= t) n++;
  return n;
};
export const flightTimes = () => flights.map((f) => f.land);
export const streamTimes = () => landAt.filter((a) => a >= T.stream0);
export const holesOf = (i) => st.planes.back[i].hits.length;

// Camera: plane-local -> screen. s is the plane's scale.
function view(t) {
  const K = [
    [0, 960, 482, 1.0],
    [T.ghosts, 960, 482, 1.0],
    [T.ghosts + 1.2, 960, 470, 0.62],
    [T.denom + 1.0, 960, 470, 0.62],
    [T.pushIn + 1.2, 960 - 255 * 1.7, 482 + 55 * 1.7, 1.7],
    [T.pullBack, 960 - 255 * 1.7, 482 + 55 * 1.7, 1.7],
    [T.pullBack + 1.2, 840, 482, 0.92],
  ];
  let a = K[0];
  for (let i = 1; i < K.length; i++) {
    const b = K[i];
    if (t <= b[0]) {
      const u = a[0] === b[0] ? 1 : ease.inOut(clamp((t - a[0]) / (b[0] - a[0])));
      return { cx: lerp(a[1], b[1], u), cy: lerp(a[2], b[2], u), s: lerp(a[3], b[3], u) };
    }
    a = b;
  }
  return { cx: a[1], cy: a[2], s: a[3] };
}

function strokePlane(ctx, x, y, s, { alpha = 1, color = C.plane, lw = 2.2, glow = 10, dash = null, rot = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.lineWidth = lw / s;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  if (dash) ctx.setLineDash(dash.map((d) => d / s));
  ctx.fillStyle = 'rgba(127,216,242,0.035)';
  for (const k of ['wing', 'stab', 'fus', 'nac']) {
    if (!dash) ctx.fill(paths[k]);
    ctx.stroke(paths[k]);
  }
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = (lw * 0.7) / s;
  ctx.stroke(paths.props);
  ctx.stroke(paths.details);
  ctx.restore();
}

function dot(ctx, img, x, y, size, alpha = 1) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

// A choice tag: circle with the letter, label beside it, a thin leader to the anchor.
function drawTag(ctx, key, v, a, mode) {
  if (a <= 0) return;
  const c = CHOICES[key];
  const ax = v.cx + c.x * v.s;
  const ay = v.cy + c.y * v.s;
  const off = { A: [-70, 150], B: [150, 120], C: [110, -130] }[key];
  const tx = ax + off[0];
  const ty = ay + off[1];
  const col = mode === 'gold' ? C.gold : mode === 'white' ? C.text : 'rgba(255,248,234,0.72)';
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = a * 0.6;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(ax, ay, 4, 0, 6.283);
  ctx.fill();
  // Bigger in the vertical cut, scaled about the tag itself.
  ctx.translate(tx, ty);
  ctx.scale(st.big, st.big);
  ctx.translate(-tx, -ty);
  if (mode !== 'normal') {
    ctx.shadowColor = col;
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = mode === 'normal' ? 'rgba(6,9,18,0.85)' : col;
  ctx.beginPath();
  ctx.arc(tx, ty, 27, 0, 6.283);
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = mode === 'normal' ? col : '#0A0E18';
  ctx.font = `700 30px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(key, tx, ty + 1);
  ctx.fillStyle = col;
  ctx.font = `600 32px ${SANS}`;
  ctx.textAlign = key === 'A' ? 'right' : 'left';
  ctx.fillText(c.label, tx + (key === 'A' ? -42 : 42), ty + 1);
  ctx.restore();
}

// Each plane we watch is a small glyph with a trail, flying in from the top edge to the middle of
// the diagram; when it arrives, a ring opens there and its holes are recorded on the diagram.
function drawFlights(ctx, t, v) {
  for (const f of flights) {
    if (t < f.land - 1.1 || t > f.land + 0.7) continue;
    const e = ease.inOut(prog(t, f.land - 1.1, 1.1));
    if (t <= f.land) {
      const x = lerp(f.x0, v.cx, e);
      const y = lerp(f.y0, v.cy, e);
      const dx = v.cx - f.x0;
      const dy = v.cy - f.y0;
      const ang = Math.atan2(dy, dx) - Math.PI / 2 + Math.PI;
      // Trail.
      const e0 = Math.max(0, e - 0.22);
      const g = ctx.createLinearGradient(lerp(f.x0, v.cx, e0), lerp(f.y0, v.cy, e0), x, y);
      g.addColorStop(0, 'rgba(127,216,242,0)');
      g.addColorStop(1, 'rgba(127,216,242,0.7)');
      ctx.save();
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lerp(f.x0, v.cx, e0), lerp(f.y0, v.cy, e0));
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
      strokePlane(ctx, x, y, 0.085 * (1 - 0.35 * e), { alpha: 1 - 0.3 * e, lw: 2, glow: 14, rot: ang });
    } else {
      // Arrival ring.
      const u = prog(t, f.land, 0.7);
      ctx.save();
      ctx.globalAlpha = 0.6 * (1 - u);
      ctx.strokeStyle = C.plane;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, 20 + 160 * ease.out(u), 0, 6.283);
      ctx.stroke();
      ctx.restore();
    }
  }
  // The stream: small comets converging on the diagram, one per few landings.
  if (t >= T.stream0 - 0.6 && t <= T.stream1 + 0.4) {
    const rand = mulberry32(77);
    ctx.save();
    for (let i = PRESENT + flights.length; i < landAt.length; i += 4) {
      const a0 = landAt[i] - 0.7;
      const sx = rand() * W;
      const sy = rand() < 0.75 ? -40 : rand() * H * 0.6;
      if (t < a0 || t > landAt[i]) continue;
      const e = ease.in(prog(t, a0, 0.7));
      const x = lerp(sx, 960, e);
      const y = lerp(sy, 470, e);
      const tx = lerp(sx, 960, Math.max(0, e - 0.12));
      const ty = lerp(sy, 470, Math.max(0, e - 0.12));
      ctx.globalAlpha = 0.75 * (1 - e * 0.6);
      ctx.strokeStyle = C.plane;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = '#DDF6FF';
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHoles(ctx, t, v, a) {
  const size = 15 * Math.sqrt(v.s);
  ctx.save();
  for (const h of backHoles) {
    if (h.t > t) continue;
    const u = prog(t, h.t, 0.35);
    const x = v.cx + h.x * v.s;
    const y = v.cy + h.y * v.s;
    dot(ctx, spr.hole, x, y, size * (1 + 1.6 * (1 - ease.out(u))), a * (0.85 + 0.15 * (1 - u)));
  }
  // Lost planes' holes, in two waves; they dim again for "只看回来的".
  if (t >= T.redEngine) {
    const keep = 1 - 0.8 * ease.inOut(prog(t, T.gap + 0.2, 0.9));
    for (const h of lostHoles) {
      const first = h.r === 'engine';
      const t0 = (first ? T.redEngine : T.redOther) + h.j * 1.0;
      if (t < t0) continue;
      const u = prog(t, t0, 0.35);
      const x = v.cx + h.x * v.s;
      const y = v.cy + h.y * v.s;
      dot(ctx, spr.lost, x, y, size * (1.05 + 1.6 * (1 - ease.out(u))), a * 0.92 * keep);
    }
  }
  ctx.restore();
}

function drawGhosts(ctx, t) {
  if (t < T.ghosts + 0.2 || t > T.fall + 2.6) return;
  for (const g of ghosts) {
    const a0 = T.ghosts + 0.3 + g.k * 0.1;
    const inA = ease.out(prog(t, a0, 0.7));
    const fall = ease.in(prog(t, T.fall + g.k * 0.06, 1.6));
    const a = inA * (1 - fall);
    if (a <= 0) continue;
    const x = g.x;
    const y = g.y + fall * 300;
    const s = 0.19;
    strokePlane(ctx, x, y, s, { alpha: 0.7 * a, color: C.lost, lw: 1.6, glow: 8, dash: [7, 6], rot: fall * 0.5 * (g.k % 2 ? 1 : -1) });
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(fall * 0.5 * (g.k % 2 ? 1 : -1));
    for (const h of g.pl.hits) {
      dot(ctx, spr.lost, h.x * s, h.y * s, h.fatal ? 30 : 16, a);
      if (h.fatal) {
        // The hit that brought it down: a small ring that opens once.
        const u = prog(t, a0 + 0.4, 0.8);
        ctx.globalAlpha = a * (1 - u) * 0.9;
        ctx.strokeStyle = C.lost;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(h.x * s, h.y * s, 6 + 22 * ease.out(u), 0, 6.283);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// Stacked bars: holes per unit area, engines vs everywhere else; white = seen, red = lost.
// First everything (equal heights: "处处一样多"), then the red drains away and only what came back
// is left (the engines' bar 40% short: "只看回来的").
function drawBars(ctx, t) {
  const a = life(t, T.bars, T.memo + 0.2, 0.5, 0.5);
  if (a <= 0) return;
  const p = st.planes;
  const x0 = 1560;
  const base = 690;
  const hMax = 300;
  const k = hMax / Math.max(p.allEngine, p.allOther);
  const grow = ease.inOut(prog(t, T.bars + 0.2, 0.9));
  const redGrow = grow * (1 - ease.inOut(prog(t, T.gap + 0.2, 0.9)));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `600 26px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('每块面积上的弹孔', x0 - 10, 330);
  const cols = [
    { label: '发动机', seen: p.seenEngine, all: p.allEngine, x: x0 + 40 },
    { label: '别处', seen: p.seenOther, all: p.allOther, x: x0 + 190 },
  ];
  for (const c of cols) {
    const hs = c.seen * k * grow;
    const hl = (c.all - c.seen) * k * redGrow;
    ctx.fillStyle = 'rgba(255,241,214,0.92)';
    ctx.fillRect(c.x, base - hs, 84, hs);
    ctx.fillStyle = C.lost;
    ctx.fillRect(c.x, base - hs - hl, 84, hl);
    ctx.font = `600 28px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.fillText(c.label, c.x + 42, base + 44);
  }
  ctx.strokeStyle = 'rgba(255,248,234,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 10, base);
  ctx.lineTo(x0 + 304, base);
  ctx.stroke();
  // Ratio lines under the bars: everything first, then only what came back.
  const seenA = ease.out(prog(t, T.gap + 0.6, 0.6));
  ctx.textAlign = 'left';
  ctx.globalAlpha = a * grow;
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('全部算上', x0 - 10, base + 100);
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = C.text;
  ctx.fillText(`${(p.allEngine / p.allOther).toFixed(1)} : 1`, x0 + 160, base + 100);
  ctx.globalAlpha = a * seenA;
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('只看飞回来的', x0 - 10, base + 146);
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = C.gold;
  ctx.fillText(`${(p.seenEngine / p.seenOther).toFixed(1)} : 1`, x0 + 160, base + 146);
  // Bracket on the engines' bar: the shortfall, in gold.
  if (seenA > 0) {
    const ht = p.seenOther * k;
    const he = p.seenEngine * k;
    const bx = x0 + 40 + 84 + 10;
    ctx.globalAlpha = a * seenA;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x0 + 40, base - ht);
    ctx.lineTo(x0 + 190, base - ht);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(bx - 6, base - ht);
    ctx.lineTo(bx, base - ht);
    ctx.lineTo(bx, base - he);
    ctx.lineTo(bx - 6, base - he);
    ctx.stroke();
    // In the empty band above the engines' bar, where the red used to be.
    ctx.font = `700 30px ${SANS}`;
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`−${pct(p.engineShortfall)}`, x0 + 82, base - (ht + he) / 2);
  }
  ctx.restore();
}

// The memo, as a typed paper card. Its title is typed at TYPE_RATE characters a second.
export const MEMO_TITLE = ['A METHOD OF ESTIMATING PLANE VULNERABILITY', 'BASED ON DAMAGE OF SURVIVORS'];
export const TYPE_RATE = 24;
export const memoTypeStart = () => T.memo + 0.7;
function drawMemo(ctx, t) {
  const a = life(t, T.memo, T.memoEnd + 0.6, 0.5, 0.6);
  if (a <= 0) return;
  const rise = (1 - ease.out(prog(t, T.memo, 0.6))) * 40;
  const x = 960;
  const y = 440 + rise;
  const w = 1180;
  const h = 400;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(-0.012);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#F1E9D6');
  g.addColorStop(1, '#E2D5B8');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const INK = '#2B2418';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = 'rgba(43,36,24,0.66)';
  ctx.fillText('统计研究小组 · 哥伦比亚大学 · 纽约 · 1943', -w / 2 + 70, -h / 2 + 62);
  ctx.fillStyle = 'rgba(43,36,24,0.25)';
  ctx.fillRect(-w / 2 + 70, -h / 2 + 82, w - 140, 1.5);
  // Typed title.
  ctx.font = `400 38px ${TYPE}`;
  ctx.fillStyle = INK;
  let typed = Math.floor((t - memoTypeStart()) * TYPE_RATE);
  MEMO_TITLE.forEach((ln, k) => {
    const n = clamp(typed, 0, ln.length);
    typed -= ln.length;
    if (n > 0) ctx.fillText(ln.slice(0, n), -w / 2 + 70, -h / 2 + 150 + k * 52);
  });
  const doneAt = memoTypeStart() + (MEMO_TITLE[0].length + MEMO_TITLE[1].length) / TYPE_RATE;
  const b = ease.out(prog(t, doneAt + 0.1, 0.5));
  ctx.globalAlpha = a * b;
  ctx.font = `italic 500 34px ${SERIF}`;
  ctx.fillStyle = INK;
  ctx.fillText('Abraham Wald', -w / 2 + 70, -h / 2 + 266);
  ctx.font = `500 28px ${SONG}`;
  ctx.fillStyle = 'rgba(43,36,24,0.85)';
  ctx.fillText('直译：《一种根据幸存飞机的损伤，估计飞机易损性的方法》', -w / 2 + 70, -h / 2 + 318);
  ctx.font = `500 21px ${SANS}`;
  ctx.fillStyle = 'rgba(43,36,24,0.6)';
  ctx.fillText('共 8 份备忘录 · 1980 年由美国海军分析中心重印（CRC 432）', -w / 2 + 70, -h / 2 + 362);
  // A red "SRG" stamp, set down once the title is typed, in the card's empty lower-right corner.
  const sA = ease.out(prog(t, doneAt + 0.5, 0.18));
  if (sA > 0) {
    ctx.save();
    ctx.globalAlpha = a * sA * 0.85;
    ctx.translate(w / 2 - 170, h / 2 - 92);
    ctx.rotate(0.12);
    ctx.scale(1 + 0.3 * (1 - sA), 1 + 0.3 * (1 - sA));
    ctx.strokeStyle = '#B5402C';
    ctx.lineWidth = 4;
    ctx.strokeRect(-70, -34, 140, 68);
    ctx.font = `700 34px ${SERIF}`;
    ctx.fillStyle = '#B5402C';
    ctx.textAlign = 'center';
    ctx.fillText('SRG', 0, 12);
    ctx.restore();
  }
  ctx.restore();
  // The note on the legend, under the card, on its own dark band so the plane behind can't cut it.
  const n = ease.out(prog(t, T.memo + 3.6, 0.8));
  if (n > 0) {
    ctx.save();
    ctx.globalAlpha = a * n;
    const band = ctx.createLinearGradient(0, 676, 0, 790);
    band.addColorStop(0, 'rgba(3,5,11,0)');
    band.addColorStop(0.25, 'rgba(3,5,11,0.82)');
    band.addColorStop(0.75, 'rgba(3,5,11,0.82)');
    band.addColorStop(1, 'rgba(3,5,11,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 676, W, 114);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `400 25px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('流传的故事里，"军官主张在洞多的地方加装甲"那段对话，没有可靠记载；', 960, 724);
    ctx.fillText('网上那张红点飞机图，是 2005 年以后画的示意图。本片的飞机和数字，也是示意模拟。', 960, 762);
    ctx.restore();
  }
}

export function drawAct1(ctx, t) {
  if (t > T.memoEnd + 0.7) return;
  const v = view(t);
  // The big diagram, dimmed under the memo, gone as the people come in.
  const dim = (1 - 0.86 * ease.inOut(prog(t, T.memo - 0.2, 0.7))) * (1 - prog(t, T.memoEnd, 0.6));
  const planeA = dim;
  strokePlane(ctx, v.cx, v.cy, v.s, { alpha: planeA, lw: 2.4, glow: 14 });
  // Engines glow gold once C is picked, until the camera pulls back.
  const eg = life(t, T.pickC + 0.2, T.pullBack + 0.6, 0.5, 0.6);
  if (eg > 0) {
    ctx.save();
    ctx.globalAlpha = eg * 0.9 * dim;
    ctx.translate(v.cx, v.cy);
    ctx.scale(v.s, v.s);
    ctx.lineWidth = 3 / v.s;
    ctx.strokeStyle = C.gold;
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 22;
    ctx.stroke(paths.nac);
    ctx.restore();
  }
  // Wings glow white while A is "the obvious answer".
  const wg = life(t, T.pickA + 0.2, T.pickC + 0.4, 0.5, 0.6);
  if (wg > 0) {
    ctx.save();
    ctx.globalAlpha = wg * 0.8;
    ctx.translate(v.cx, v.cy);
    ctx.scale(v.s, v.s);
    ctx.lineWidth = 3 / v.s;
    ctx.strokeStyle = C.text;
    ctx.shadowColor = C.text;
    ctx.shadowBlur = 20;
    ctx.stroke(paths.wing);
    ctx.restore();
  }
  drawHoles(ctx, t, v, dim);
  drawFlights(ctx, t, v);
  // Choice tags: in at T.tags, hidden under the title, A white at pickA, C gold at pickC, out as
  // the ghosts arrive (the gold engines carry C from there).
  const tagOut = (1 - life(t, T.title - 0.3, T.titleEnd + 0.3, 0.3, 0.6)) * (1 - prog(t, T.ghosts, 0.5));
  ['A', 'B', 'C'].forEach((k, i) => {
    const a = ease.out(prog(t, T.tags[i], 0.4)) * tagOut;
    const mode = k === 'C' && t >= T.pickC ? 'gold' : k === 'A' && t >= T.pickA && t < T.pickC + 0.4 ? 'white' : 'normal';
    drawTag(ctx, k, v, a, mode);
  });
  drawGhosts(ctx, t);
  drawBars(ctx, t);
  // The instrument: seen planes; the denominator joins at T.denom.
  const seen = landedCount(t);
  const insA = (1 - life(t, T.title - 0.1, T.titleEnd + 0.1, 0.2, 0.5)) * (1 - prog(t, T.memo - 0.2, 0.6) * 0.7) * (1 - prog(t, T.memoEnd - 0.2, 0.5));
  ctx.save();
  ctx.translate(1856, 40);
  ctx.scale(st.big, st.big);
  ctx.translate(-1856, -40);
  drawDenominator(ctx, {
    seen: seen.toLocaleString('en-US'), seenLabel: '飞回来的',
    total: st.planes.all.length.toLocaleString('en-US'), totalLabel: '出发的',
    alpha: insA, alphaTotal: prog(t, T.denom, 1.0),
  });
  ctx.restore();
  // Leaves before the ghosts take the corners.
  drawAnchor(ctx, t, T.pickC, T.ghosts + 0.4, [[['1943']], [['纽约 · 哥伦比亚大学 · 统计研究小组']], [['亚伯拉罕·沃尔德 Abraham Wald']]]);
  // The model, stated once the lost planes are counted in.
  const mA = life(t, T.redOther + 0.4, T.memo, 0.6, 0.4);
  if (mA > 0) {
    ctx.save();
    ctx.globalAlpha = mA;
    ctx.font = `400 22px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const m = st.model;
    ctx.fillText(`示意模拟 · ${m.sorties.toLocaleString('en-US')} 架次，每架平均中 ${m.hitsPerSortie} 弹，落点随机`, 64, 846);
    ctx.fillText(`打中发动机或驾驶舱，${pct(m.downVital)} 回不来；打中别处，${pct(m.downOther)} 回不来 · 不是二战真实数据`, 64, 878);
    ctx.restore();
  }
  drawMemo(ctx, t);
  // Title card over everything, with a flash on the way in.
  drawTitleCard(ctx, t, T.title, T.titleEnd, W, H, {
    // The subtitle says up front what this has to do with the viewer (ep05: the topic everyone had
    // lived through is the one people saved); the second half pays it off.
    kicker: '幸存者偏差', title: '弹孔', latin: 'SURVIVORSHIP BIAS', subtitle: [['你刷到的成功经验，都是'], ['飞回来的', C.gold]],
    motif: (g, u) => {
      // One hole on an engine, with a ring spreading from it.
      g.save();
      const r = 30 + 380 * ease.out(u);
      g.globalAlpha *= 0.35 * (1 - u);
      g.strokeStyle = C.lost;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(960, 330, r, 0, 6.283);
      g.stroke();
      g.restore();
    },
  });
  drawFlash(ctx, t, T.title, W, H, { peak: 0.7 });
}

// The opening picture again (same position, same scale, same white holes), with one change: the
// holes of the planes that never came back are laid over it, and the engines light up gold.
export function drawCallback(ctx, t, t0, t1) {
  const a = life(t, t0, t1, 0.6, 0.6);
  if (a <= 0) return;
  const v = { cx: 960, cy: 482, s: 1 };
  ctx.save();
  ctx.globalAlpha = a;
  strokePlane(ctx, v.cx, v.cy, v.s, { alpha: 1, lw: 2.4, glow: 14 });
  const size = 15;
  for (const h of backHoles) dot(ctx, spr.hole, v.cx + h.x, v.cy + h.y, size, a * 0.9);
  for (const h of lostHoles) {
    const u = prog(t, t0 + 0.9 + h.j * 1.2, 0.35);
    if (u <= 0) continue;
    dot(ctx, spr.lost, v.cx + h.x, v.cy + h.y, size * (1.05 + 1.6 * (1 - ease.out(u))), a * 0.92);
  }
  const eg = ease.out(prog(t, t0 + 2.4, 0.6));
  if (eg > 0) {
    ctx.globalAlpha = a * eg;
    ctx.translate(v.cx, v.cy);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = C.gold;
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 26;
    ctx.stroke(paths.nac);
  }
  ctx.restore();
}

// Cover art: the diagram with every hole seen on the planes that came back.
export function drawCoverPlane(ctx, cx, cy, s) {
  strokePlane(ctx, cx, cy, s, { alpha: 1, lw: 2.4 * Math.max(1, s), glow: 14 });
  ctx.save();
  for (const h of backHoles) dot(ctx, spr.hole, cx + h.x * s, cy + h.y * s, 15 * Math.sqrt(s), 0.9);
  ctx.restore();
}
