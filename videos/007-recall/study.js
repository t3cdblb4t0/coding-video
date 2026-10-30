// 算 · 实验 and 算 · 打分: Roediger & Karpicke 2006 (reread four times vs read once and recall three
// times), then Dunlosky et al. 2013's ratings of ten study techniques.
import { clamp, lerp, prog, ease } from '../../engine/kit.js';
import { developText } from '../../engine/film.js';
import { W, C, SANS, MONO, card, label, life, rgba } from './style.js';
import { T } from './timeline.js';

const XL = 560;
const XR = 1360;
const TILE = 150;
const TGAP = 22;
const BASE = 880; // bar baseline
const BAR_H = 430; // 100%
const BAR_W = 210;

let st = null;
export function setupStudy(s) {
  st = s;
}

function tileRow(ctx, t, xc, yc, scale, kinds, times, { glowRead = 0, glowWrite = 0 } = {}) {
  const tw = TILE * scale;
  const gap = TGAP * scale;
  const x0 = xc - (4 * tw + 3 * gap) / 2;
  kinds.forEach((kind, k) => {
    const u = ease.out(prog(t, times[k], 0.35));
    const read = kind === '读';
    const g = read ? glowRead : glowWrite;
    const col = read ? C.ice : C.gold;
    // A highlighted tile grows a little and glows hard.
    const s = tw * (1 + 0.22 * g);
    const x = x0 + k * (tw + gap) + (tw - s) / 2;
    const y = yc - s / 2;
    ctx.save();
    // The empty slot, then the lit tile.
    card(ctx, x, y, s, s, { r: 16 * scale, fill: 'rgba(255,248,234,0.04)', stroke: 'rgba(255,248,234,0.18)', lw: 2 });
    if (u > 0) {
      ctx.globalAlpha *= u;
      card(ctx, x, y, s, s, { r: 16 * scale, fill: rgba(col, (read ? 0.16 : 0.2) + 0.3 * g), stroke: col, lw: 3, glow: 10 + 60 * g, glowColor: rgba(col, 0.9) });
      label(ctx, kind, x + s / 2, y + s / 2 + (read ? 26 : 20) * scale * (1 + 0.22 * g), { size: (read ? 76 : 58) * scale * (1 + 0.22 * g), weight: 700, color: g > 0.5 ? '#FFFFFF' : col, halo: 8 });
    }
    ctx.restore();
  });
}

function bar(ctx, xc, value, col, alpha, { ghost = null } = {}) {
  const h = BAR_H * value;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (ghost !== null) {
    // Where the other group got to: a dashed outline, the missing part tinted red.
    const gh = BAR_H * ghost;
    ctx.fillStyle = rgba(C.red, 0.2);
    ctx.fillRect(xc - BAR_W / 2, BASE - gh, BAR_W, gh - h);
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = rgba(C.red, 0.85);
    ctx.lineWidth = 3;
    ctx.strokeRect(xc - BAR_W / 2, BASE - gh, BAR_W, gh - h);
    ctx.setLineDash([]);
  }
  const g = ctx.createLinearGradient(0, BASE - h, 0, BASE);
  g.addColorStop(0, col);
  g.addColorStop(1, rgba(col, 0.35));
  ctx.shadowColor = rgba(col, 0.6);
  ctx.shadowBlur = 30;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(xc - BAR_W / 2, BASE - h, BAR_W, h, [14, 14, 0, 0]);
  ctx.fill();
  ctx.restore();
  return BASE - h;
}

// A speech bubble; its tail points down and to the left, at what is talking.
function bubble(ctx, x, y, text, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = `700 54px ${SANS}`;
  const w = ctx.measureText(text).width + 72;
  const h = 108;
  ctx.fillStyle = 'rgba(255,248,234,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 48);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 70, y + h / 2 - 4);
  ctx.lineTo(x - w / 2 + 20, y + h / 2 + 34);
  ctx.lineTo(x - w / 2 + 110, y + h / 2 - 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1B2236';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y + 19);
  ctx.restore();
}

export function drawExperiment(ctx, t) {
  if (t < T.exp || t > T.expEnd + 0.4) return;
  const rk = st.rk;
  const a = life(t, T.exp + 0.1, T.expEnd + 0.4, 0.5, 0.6);
  const sh = ease.inOut(prog(t, T.shrink, 0.8)); // 0: big tiles in the middle, 1: tiles up top
  ctx.save();
  ctx.globalAlpha = a;
  // The paper reference, top centre, from the first caption.
  const refA = life(t, T.exp + 0.2, T.groups + 0.2, 0.5, 0.5);
  if (refA > 0) {
    ctx.save();
    ctx.globalAlpha *= refA;
    card(ctx, W / 2 - 640, 300, 1280, 400, { fill: 'rgba(255,243,220,0.94)', stroke: null, r: 16 });
    label(ctx, 'Test-Enhanced Learning', W / 2, 452, { size: 92, weight: 600, family: '"EB Garamond"', color: '#1B2236', halo: 0 });
    label(ctx, 'Roediger & Karpicke · Psychological Science · 2006', W / 2, 548, { size: 44, weight: 500, family: '"EB Garamond"', color: 'rgba(27,34,54,0.72)', halo: 0 });
    label(ctx, '美国 · 华盛顿大学（圣路易斯）', W / 2, 628, { size: 42, weight: 600, color: 'rgba(27,34,54,0.62)', halo: 0 });
    ctx.restore();
  }
  // Groups.
  const gA = ease.out(prog(t, T.groups, 0.6));
  if (gA > 0) {
    ctx.save();
    ctx.globalAlpha *= gA;
    const yl = lerp(300, 190, sh);
    const ys = lerp(366, 250, sh);
    label(ctx, '重读组', XL, yl, { size: lerp(68, 56, sh), weight: 800, color: C.ice });
    label(ctx, '自测组', XR, yl, { size: lerp(68, 56, sh), weight: 800, color: C.gold });
    label(ctx, '读 4 轮', XL, ys, { size: 40, weight: 500, color: C.dim });
    label(ctx, '读 1 轮 + 默写 3 轮', XR, ys, { size: 40, weight: 500, color: C.dim });
    const yc = lerp(530, 322, sh);
    const sc = lerp(1, 0.5, sh);
    const fam = prog(t, T.familiar, 0.5) * (1 - prog(t, T.retrieve, 0.5));
    const ret = prog(t, T.retrieve, 0.5);
    tileRow(ctx, t, XL, yc, sc, ['读', '读', '读', '读'], T.tilesL, { glowRead: fam });
    tileRow(ctx, t, XR, yc, sc, ['读', '默写', '默写', '默写'], T.tilesR, { glowWrite: ret });
    ctx.restore();
  }
  // Results.
  const bA = ease.out(prog(t, T.bars5, 0.5));
  if (bA > 0) {
    const grow = ease.out(prog(t, T.bars5, 1.0));
    const flip = ease.inOut(prog(t, T.flip, 1.1));
    const vL = lerp(rk.fiveMin.reread, rk.week.reread, flip) * grow;
    const vR = lerp(rk.fiveMin.test, rk.week.test, flip) * grow;
    const lessA = life(t, T.less, T.expEnd + 0.4, 0.5, 0.5);
    ctx.save();
    ctx.globalAlpha *= bA;
    // Baseline.
    ctx.fillStyle = 'rgba(255,248,234,0.25)';
    ctx.fillRect(XL - 300, BASE, XR - XL + 600, 3);
    const topL = bar(ctx, XL, vL, C.ice, 1, { ghost: lessA > 0 ? rk.week.test : null });
    const topR = bar(ctx, XR, vR, C.gold, 1);
    const pctL = Math.round(100 * vL);
    const pctR = Math.round(100 * vR);
    const winL = flip < 0.5;
    // Once the missing third is drawn, the reread number moves up to sit on top of it.
    const yL = lerp(topL, BASE - BAR_H * rk.week.test, ease.inOut(lessA)) - 26;
    label(ctx, `${pctL}%`, XL, yL, { size: winL ? 120 : 104, weight: 700, family: MONO, color: winL ? C.ice : rgba(C.ice, 0.75) });
    label(ctx, `${pctR}%`, XR, topR - 26, { size: winL ? 104 : 128, weight: 700, family: MONO, color: winL ? rgba(C.gold, 0.8) : C.gold, halo: winL ? 12 : 26 });
    if (lessA > 0) {
      ctx.save();
      ctx.globalAlpha *= lessA;
      label(ctx, '少 1/3', XL - BAR_W / 2 - 28, BASE - (BAR_H * (rk.week.reread + rk.week.test)) / 2 + 20, { size: 56, weight: 800, color: C.red, align: 'right' });
      ctx.restore();
    }
    // The delay tag between the bars: "5 分钟后" turns into "一周后".
    const tagW = 300;
    const yT = 640;
    const sw = prog(t, T.week, 0.5);
    ctx.save();
    ctx.globalAlpha *= 1 - sw;
    card(ctx, W / 2 - tagW / 2, yT - 62, tagW, 96, { r: 48, fill: 'rgba(255,248,234,0.1)', stroke: 'rgba(255,248,234,0.4)' });
    label(ctx, '5 分钟后', W / 2, yT + 2, { size: 48, weight: 700 });
    ctx.restore();
    if (sw > 0) {
      ctx.save();
      ctx.globalAlpha *= sw;
      card(ctx, W / 2 - tagW / 2, yT - 62, tagW, 96, { r: 48, fill: rgba(C.gold, 0.2), stroke: C.gold, glow: 16 });
      label(ctx, '一周后', W / 2, yT + 2, { size: 52, weight: 800, color: C.gold });
      ctx.restore();
    }
    // How many times each group read the passage.
    const rA = ease.out(prog(t, T.reads, 0.5));
    if (rA > 0) {
      ctx.save();
      ctx.globalAlpha *= rA;
      const n1 = lerp(0, rk.reads.reread, ease.out(prog(t, T.reads, 1.2)));
      const n2 = lerp(0, rk.reads.test, ease.out(prog(t, T.reads, 1.2)));
      label(ctx, `共读 ${n1.toFixed(1)} 遍`, XL, 432, { size: 48, weight: 700, color: C.ice });
      label(ctx, `共读 ${n2.toFixed(1)} 遍`, XR, 432, { size: 48, weight: 700, color: C.gold });
      ctx.restore();
    }
    ctx.restore();
    // "I've got it": the rereaders' confidence.
    bubble(ctx, XL + 330, 150, '我都记住了！', life(t, T.confident + 0.2, T.familiar + 0.2, 0.4, 0.4));
  }
  ctx.restore();
}

// Dunlosky et al. 2013: ten techniques in three columns.
export function drawGrades(ctx, t) {
  if (t < T.grades - 0.2 || t > T.gradesEnd + 0.4) return;
  const d = st.dunlosky;
  const a = life(t, T.grades, T.gradesEnd + 0.4, 0.5, 0.6);
  const cols = [
    { x: 400, head: '高效', color: C.gold, items: d.high, k: 'high' },
    { x: 960, head: '中等', color: C.text, items: d.moderate, k: 'mod' },
    { x: 1520, head: '低效', color: C.red, items: d.low, k: 'low' },
  ];
  const PW = 440;
  const PH = 92;
  const PG = 20;
  const Y0 = 290;
  ctx.save();
  ctx.globalAlpha = a;
  let n = 0;
  const hi = prog(t, T.high, 0.5);
  const lo = prog(t, T.low, 0.5);
  for (const col of cols) {
    const ha = ease.out(prog(t, T.grades + 0.3, 0.5));
    ctx.save();
    ctx.globalAlpha *= ha;
    label(ctx, col.head, col.x, 240, { size: 60, weight: 800, color: col.color, spacing: 8 });
    ctx.restore();
    col.items.forEach((name, k) => {
      const at = T.grades + 0.6 + 0.22 * n++;
      const u = ease.out(prog(t, at, 0.4));
      if (u <= 0) return;
      const y = Y0 + k * (PH + PG);
      const isHigh = col.k === 'high';
      const isLowKey = col.k === 'low' && (name === '划重点' || name === '反复读');
      ctx.save();
      ctx.globalAlpha *= u * (col.k === 'mod' ? 1 - 0.45 * Math.max(hi, lo) : col.k === 'low' && !isLowKey ? 1 - 0.45 * lo : 1);
      let fill = 'rgba(255,248,234,0.07)';
      let stroke = 'rgba(255,248,234,0.3)';
      let txt = C.text;
      let glow = 0;
      if (isHigh) {
        fill = rgba(C.gold, 0.12 + 0.12 * hi);
        stroke = C.gold;
        txt = C.gold;
        glow = 26 * hi;
      }
      if (isLowKey) {
        fill = rgba(C.red, 0.06 + 0.14 * lo);
        stroke = lo > 0 ? rgba(C.red, 0.4 + 0.6 * lo) : stroke;
        txt = lo > 0.5 ? C.red : C.text;
        glow = 18 * lo;
      }
      card(ctx, col.x - PW / 2, y + (1 - u) * 16, PW, PH, { r: 46, fill, stroke, glow, lw: 3 });
      label(ctx, name, col.x, y + (1 - u) * 16 + 63, { size: 50, weight: 700, color: txt });
      ctx.restore();
    });
  }
  label(ctx, 'Dunlosky 等 · 2013 · 评了 10 种常见学法', 1860, 900, { size: 30, weight: 500, color: C.faint, align: 'right' });
  ctx.restore();
}
