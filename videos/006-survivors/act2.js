// 45.6-86.4 s (算 · 人): the same mistake with people. 10,000 dots, one in ten going all in (the
// simulation's own draw); ten years of coin flips drawn as all 10,000 real paths on a log scale;
// the top 100 step onto a lit stage; then the denominator, and the all-in people who lost most, in
// red, like the planes that never came back. Colours as in style.js: ice = playing safe (known,
// steady), warm white = all in (what we see), red = the ones nobody sees, gold = the denominator.
import { clamp, lerp, prog, ease, mulberry32 } from '../../engine/kit.js';
import { developText, drawDenominator } from '../../engine/film.js';
import { W, H, C, SANS, SONG, MONO, life } from './style.js';
import { T, pct, n } from './timeline.js';

let st = null;
let pp = null;
let L = null; // pre-rendered path layers
let dy = null; // per-person vertical offset, for drawing only (own seed)
let del = null; // per-person delay in the collapse, for drawing only
let slot = null; // stage position of each of the top 100
let ends = null; // all-in people and every 9th safe player: drawn as moving heads / end points
const KIND = { steady: 0, keep: 1, lose: 2, top: 3 };
let kind = null;

export const CH = { x0: 300, x1: 1300, yTop: 150, yBot: 830, lo: -3.3, hi: 3.2 };
const X = (yr) => CH.x0 + (yr / 10) * (CH.x1 - CH.x0);
const Y = (w) => CH.yBot - ((clamp(Math.log10(w), CH.lo, CH.hi) - CH.lo) / (CH.hi - CH.lo)) * (CH.yBot - CH.yTop);
const GRID = { cols: 125, rows: 80, x0: 300, y0: 250, gap: 5.6 };
const STAGE = { cx: 1585, x0: 1432, y: 250, top: 112 };
const BRACKET_X = CH.x1 + 34;

function canvasLayer() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}
function blurred(src, px) {
  const c = canvasLayer();
  const g = c.getContext('2d');
  g.filter = `blur(${px}px)`;
  g.drawImage(src, 0, 0);
  return c;
}
// One stroke per person, so overlapping paths add up: busy routes come out bright, rare ones faint.
function strokePaths(idx, { color, alpha, lw = 1.2, dash = null }) {
  const c = canvasLayer();
  const g = c.getContext('2d');
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (dash) g.setLineDash(dash);
  for (const i of idx) {
    const p = pp.all[i].path;
    g.beginPath();
    g.moveTo(X(0), Y(p[0]) + dy[i]);
    for (let y = 1; y < p.length; y++) g.lineTo(X(y), Y(p[y]) + dy[i]);
    g.stroke();
  }
  return c;
}

export function setupAct2(state) {
  st = state;
  pp = st.people;
  const N = pp.all.length;
  const r = mulberry32(17);
  dy = new Float32Array(N);
  del = new Float32Array(N);
  kind = new Uint8Array(N);
  const top = new Set(pp.top);
  const steadyIdx = [];
  const allInIdx = [];
  const keepIdx = [];
  const loseIdx = [];
  for (let i = 0; i < N; i++) {
    const a = pp.all[i];
    dy[i] = (r() - 0.5) * (a.allIn ? 7 : 4);
    del[i] = r();
    if (!a.allIn) {
      steadyIdx.push(i);
      kind[i] = KIND.steady;
    } else {
      allInIdx.push(i);
      if (a.w < 1) {
        loseIdx.push(i);
        kind[i] = KIND.lose;
      } else {
        keepIdx.push(i);
        kind[i] = top.has(i) ? KIND.top : KIND.keep;
      }
    }
  }
  // The captions say "every loser kept less than a third" and "the top 100 all went all in":
  // check both against the run instead of trusting the model.
  if (loseIdx.some((i) => pp.all[i].w >= 1 / 3)) console.warn('[act2] a losing all-in player kept a third or more');
  if (pp.topGamblers !== pp.nTop) console.warn('[act2] not every one of the top went all in');
  L = {
    steady: strokePaths(steadyIdx, { color: C.plane, alpha: 0.05 }),
    allIn: strokePaths(allInIdx, { color: C.hole, alpha: 0.16 }),
    keep: strokePaths(keepIdx, { color: C.hole, alpha: 0.16 }),
    lose: strokePaths(loseIdx, { color: C.lost, alpha: 0.2, lw: 1.3, dash: [7, 6] }),
  };
  L.steadyGlow = blurred(L.steady, 4);
  L.allInGlow = blurred(L.allIn, 4);
  slot = new Map();
  pp.top.forEach((i, k) => slot.set(i, { x: STAGE.x0 + (k % 50) * 6.2, y: STAGE.y - 7 - Math.floor(k / 50) * 7 }));
  ends = [...allInIdx, ...steadyIdx.filter((_, k) => k % 9 === 0)];
  st.act2 = { steady: steadyIdx.length, lose: loseIdx.length };
}

// 10,000 dots: develop in a sweep; the safe nine in ten light up, then the all-in one in ten; then
// everyone flies to the same starting point (year 0, x1 of their money).
function drawGrid(ctx, t, a) {
  if (t < T.people || t > T.grow0 + 0.3) return;
  const ox = X(0);
  const oy = Y(1);
  const kWhite = ease.out(prog(t, T.allIn, 0.4));
  const steadyB = t < T.steady ? 0.6 : t < T.allIn ? lerp(0.6, 0.95, prog(t, T.steady, 0.5)) : lerp(0.95, 0.45, prog(t, T.allIn, 0.5));
  const allInB = t < T.steady ? 0.6 : t < T.allIn ? lerp(0.6, 0.22, prog(t, T.steady, 0.5)) : lerp(0.22, 1, kWhite);
  ctx.save();
  for (const pass of [0, 1]) {
    ctx.fillStyle = pass === 1 && kWhite > 0.5 ? C.hole : C.plane;
    for (let i = 0; i < pp.all.length; i++) {
      const allIn = pp.all[i].allIn;
      if (allIn !== (pass === 1)) continue;
      const col = i % GRID.cols;
      const row = Math.floor(i / GRID.cols);
      const ap = prog(t, T.people + 0.2 + (col / GRID.cols + row / GRID.rows) * 0.6, 0.3);
      if (ap <= 0) continue;
      const u = ease.in(prog(t, T.collapse + del[i] * 0.35, 0.55));
      if (u >= 1) continue;
      const x = lerp(GRID.x0 + col * GRID.gap, ox, u);
      const y = lerp(GRID.y0 + row * GRID.gap, oy, u);
      ctx.globalAlpha = a * ap * (allIn ? allInB : steadyB) * (1 - 0.3 * u);
      const s = allIn && kWhite > 0.5 ? 3.2 : 2.6;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  // Where they all start.
  const og = ease.out(prog(t, T.collapse + 0.3, 0.4)) * (1 - prog(t, T.grow0 + 0.1, 0.3));
  if (og > 0) {
    ctx.globalAlpha = a * og;
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 26);
    g.addColorStop(0, 'rgba(255,246,228,0.95)');
    g.addColorStop(1, 'rgba(255,246,228,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, oy, 26, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

// One coin, flipped once, while the caption says what everyone will do every year.
function drawCoin(ctx, t, a) {
  const ca = life(t, T.coin - 0.1, T.steady - 0.05, 0.25, 0.4);
  if (ca <= 0) return;
  const u = prog(t, T.coin, 0.9);
  const ang = ease.out(u) * Math.PI * 4; // two full turns: lands heads up
  const x = 1340;
  const y = 470 - Math.sin(Math.PI * u) * 70;
  ctx.save();
  ctx.globalAlpha = a * ca;
  ctx.translate(x, y);
  ctx.scale(Math.max(0.06, Math.abs(Math.cos(ang))), 1);
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 24;
  ctx.fillStyle = 'rgba(246,207,126,0.16)';
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, 6.283);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, 6.283);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.font = `700 44px ${SONG}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.cos(ang) >= 0 ? '正' : '反', 0, 3);
  ctx.restore();
}

// The two rules, beside the grid: same layout, different colour.
function drawRules(ctx, t, a) {
  const m = st.peopleModel;
  const x = 1090;
  const blocks = [
    { at: T.steady, y: 420, head: [['求稳', C.plane], [` · ${n(pp.n - pp.gamblers)} 人`, C.text]], rule: `正面 ×${m.steady[0].toFixed(1)}　　反面 ×${m.steady[1].toFixed(1)}` },
    { at: T.allIn, y: 600, head: [['all in', C.hole], [` · ${n(pp.gamblers)} 人`, C.text]], rule: `正面 ×${m.allIn[0]}　　反面 ×${m.allIn[1]}` },
  ];
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  for (const b of blocks) {
    const ba = life(t, b.at, T.collapse + 0.2, 0.4, 0.5);
    if (ba <= 0) continue;
    ctx.globalAlpha = a * ba;
    ctx.font = `600 46px ${SANS}`;
    developText(ctx, b.head, x, b.y, t, b.at, { align: 'left' });
    ctx.font = `500 32px ${SANS}`;
    developText(ctx, b.rule, x, b.y + 56, t, b.at + 0.35, { align: 'left', color: C.dim });
  }
  ctx.restore();
}

function drawAxes(ctx, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  for (let k = -3; k <= 3; k++) {
    const y = Y(10 ** k);
    ctx.strokeStyle = k === 0 ? 'rgba(255,248,234,0.34)' : 'rgba(255,248,234,0.10)';
    ctx.lineWidth = k === 0 ? 1.6 : 1;
    ctx.setLineDash(k === 0 ? [] : [4, 8]);
    ctx.beginPath();
    ctx.moveTo(CH.x0, y);
    ctx.lineTo(CH.x1, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `500 20px ${MONO}`;
    ctx.fillStyle = k === 0 ? C.dim : C.faint;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${k >= 0 ? 10 ** k : (10 ** k).toFixed(-k)}`, CH.x0 - 14, y);
    if (k === 0) {
      ctx.font = `500 20px ${SANS}`;
      ctx.fillText('本金', CH.x0 - 52, y);
    }
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('本金的几倍 · 每一格差 10 倍', CH.x0 - 120, CH.yTop - 26);
  ctx.textAlign = 'center';
  ctx.font = `500 20px ${SANS}`;
  ctx.fillStyle = C.faint;
  for (let yr = 0; yr <= 10; yr += 2) ctx.fillText(yr === 10 ? '第 10 年' : String(yr), X(yr), CH.yBot + 36);
  // Legend, bottom left of the plot (empty: nobody gets that low that early).
  const m = st.peopleModel;
  const rows = [
    [C.plane, `求稳 ${n(pp.n - pp.gamblers)} 人：正面 ×${m.steady[0].toFixed(1)}，反面 ×${m.steady[1].toFixed(1)}`],
    [C.hole, `all in ${n(pp.gamblers)} 人：正面 ×${m.allIn[0]}，反面 ×${m.allIn[1]}`],
  ];
  ctx.textAlign = 'left';
  ctx.font = `500 22px ${SANS}`;
  rows.forEach(([col, s], k) => {
    const y = CH.yBot - 70 + k * 36;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CH.x0 + 24, y - 7);
    ctx.lineTo(CH.x0 + 56, y - 7);
    ctx.stroke();
    ctx.fillStyle = C.dim;
    ctx.fillText(s, CH.x0 + 68, y);
  });
  ctx.restore();
}

function drawLayer(ctx, img, alpha, clipX, { lighter = false, dy0 = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, clipX, H);
  ctx.clip();
  ctx.globalAlpha = Math.min(1, alpha); // values above 1 are silently ignored by canvas
  if (lighter) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, 0, dy0);
  ctx.restore();
}

// Where person i is at year p (straight lines between years, in screen space).
function at(i, p) {
  const path = pp.all[i].path;
  const y0 = Math.min(9, Math.floor(p));
  const f = p - y0;
  return { x: X(p), y: lerp(Y(path[y0]), Y(path[y0 + 1]), f) + dy[i] };
}

function drawRun(ctx, t, a, chartA) {
  const p = 10 * clamp((t - T.grow0) / (T.grow1 - T.grow0));
  drawAxes(ctx, a * chartA * ease.out(prog(t, T.collapse + 0.3, 0.6)));
  if (t < T.grow0) return;
  const clipX = X(p) + 1;
  const red = ease.inOut(prog(t, T.redPeople, 0.8));
  const allInHi = life(t, T.denom2, T.redPeople + 0.4, 0.4, 0.4);
  const steadyHi = life(t, T.steadyGlow, T.fractions + 0.2, 0.4, 0.5);
  const A = a * chartA;
  drawLayer(ctx, L.steadyGlow, A * (0.5 + 0.9 * steadyHi), clipX, { lighter: true });
  drawLayer(ctx, L.steady, A, clipX);
  drawLayer(ctx, L.allInGlow, A * (0.35 + 0.8 * allInHi) * (1 - red), clipX, { lighter: true });
  drawLayer(ctx, L.allIn, A * (1 - red), clipX);
  drawLayer(ctx, L.keep, A * red, clipX);
  drawLayer(ctx, L.lose, A * red * (1 - 0.35 * ease.in(prog(t, T.redPeople + 0.8, 1.4))), clipX);
  // Heads while the years run; end points after. The top 100 fly to the stage; the losers turn
  // red and drop away.
  ctx.save();
  for (const i of ends) {
    const k = kind[i];
    let { x, y } = at(i, p);
    let col = k === KIND.steady ? C.plane : C.hole;
    let al = k === KIND.steady ? 0.5 : 0.95;
    let s = k === KIND.steady ? 2.2 : 3;
    if (k === KIND.top) {
      const sl = slot.get(i);
      const u = ease.inOut(prog(t, T.stage + 0.3 + del[i] * 0.4, 0.9));
      x = lerp(x + 4, sl.x, u);
      y = lerp(y, sl.y, u) - Math.sin(Math.PI * u) * 40;
      s = lerp(3, 4.2, u);
      al = 1;
      // Brighter than the chart (they are what everyone sees), dimmed with it for the fractions.
      ctx.globalAlpha = a * (0.08 + 0.92 * ((chartA - 0.08) / 0.92));
    } else {
      ctx.globalAlpha = A * al;
    }
    if (k === KIND.lose && red > 0) {
      col = C.lost;
      const f = ease.in(prog(t, T.redPeople + 0.6 + del[i] * 0.5, 1.2));
      y += 70 * f;
      ctx.globalAlpha = A * (1 - 0.75 * f);
    }
    ctx.fillStyle = col;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
}

function bracket(ctx, x, y0, y1, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 10, y0);
  ctx.lineTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.lineTo(x - 10, y1);
  ctx.stroke();
}

function drawGroups(ctx, t, a, chartA) {
  const m = st.peopleModel;
  // The all-in people who lost: from x(1/3) of their money down.
  const la = ease.out(prog(t, T.redPeople + 0.5, 0.5));
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = a * chartA * la;
    bracket(ctx, BRACKET_X, Y(1 / 3) + 6, CH.yBot, C.lost);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `600 44px ${MONO}`;
    ctx.fillStyle = C.lost;
    ctx.fillText(n(st.act2.lose), BRACKET_X + 24, 676);
    const w = ctx.measureText(n(st.act2.lose)).width;
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText('人', BRACKET_X + 34 + w, 676);
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText(`all in 的 ${pct(pp.gamblerBelowStart)}`, BRACKET_X + 24, 716);
    ctx.fillText('只剩不到三分之一', BRACKET_X + 24, 752);
    ctx.restore();
  }
  // The safe players: between x1 and x1.1^10.
  const sa = ease.out(prog(t, T.steadyGlow + 0.3, 0.5));
  if (sa > 0) {
    ctx.save();
    ctx.globalAlpha = a * chartA * sa;
    bracket(ctx, BRACKET_X, Y(m.steady[0] ** m.years) - 4, Y(1) + 4, C.plane);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `500 26px ${SANS}`;
    ctx.fillStyle = C.plane;
    ctx.fillText(`求稳 ${n(pp.n - pp.gamblers)} 人 · 没有一个亏钱`, BRACKET_X + 24, (Y(m.steady[0] ** m.years) + Y(1)) / 2);
    ctx.restore();
  }
}

function drawStage(ctx, t, a) {
  const s = life(t, T.stage, T.life + 0.1, 0.6, 0.6);
  if (s <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * s;
  // Spotlight and floor.
  const g = ctx.createLinearGradient(0, STAGE.top, 0, STAGE.y);
  g.addColorStop(0, 'rgba(255,246,228,0)');
  g.addColorStop(1, 'rgba(255,246,228,0.17)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(STAGE.cx - 26, STAGE.top);
  ctx.lineTo(STAGE.cx + 26, STAGE.top);
  ctx.lineTo(STAGE.cx + 196, STAGE.y);
  ctx.lineTo(STAGE.cx - 196, STAGE.y);
  ctx.closePath();
  ctx.fill();
  const fg = ctx.createRadialGradient(STAGE.cx, STAGE.y, 10, STAGE.cx, STAGE.y, 220);
  fg.addColorStop(0, 'rgba(255,246,228,0.3)');
  fg.addColorStop(1, 'rgba(255,246,228,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(STAGE.cx, STAGE.y, 220, 26, 0, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,234,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STAGE.cx - 184, STAGE.y);
  ctx.lineTo(STAGE.cx + 184, STAGE.y);
  ctx.stroke();
  // Labels under the stage; they step back once the denominator is shown.
  const back = 1 - 0.45 * ease.inOut(prog(t, T.denom2, 0.6));
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = a * s * back;
  ctx.font = `600 30px ${SANS}`;
  developText(ctx, `最成功的 ${pp.nTop} 人`, STAGE.cx, 294, t, T.stage + 0.5);
  if (t >= T.allTop) {
    ctx.font = `600 28px ${SANS}`;
    developText(ctx, [['全是 all in · ', C.gold], [`${pp.topGamblers} / ${pp.nTop}`, C.gold]], STAGE.cx, 338, t, T.allTop);
  }
  if (t >= T.quote) {
    ctx.font = `700 54px ${SONG}`;
    developText(ctx, '「要敢赌！」', STAGE.cx, 418, t, T.quote, { per: 0.4, gap: 0.09, glow: 18, glowColor: 'rgba(255,241,214,0.6)' });
  }
  ctx.restore();
}

// Two panels, identical layout: of the people on stage, how many went all in; of the people who
// went all in, how many made it to the stage.
function drawFractions(ctx, t, a) {
  const f = life(t, T.fractions + 0.2, T.life + 0.1, 0.5, 0.6);
  if (f <= 0) return;
  const panels = [
    { cx: 600, head1: `上台的 ${pp.nTop} 人里，`, head2: [['all in', C.hole], [' 的占']], frac: pp.topGamblers / pp.nTop, color: C.text, at: T.fractions + 0.2 },
    { cx: 1320, head1: `all in 的 ${n(pp.gamblers)} 人里，`, head2: '上了台的占', frac: pp.gamblersInTop, color: C.gold, at: T.fractions + 1.5 },
  ];
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  for (const P of panels) {
    const pa = ease.out(prog(t, P.at, 0.5));
    if (pa <= 0) continue;
    ctx.globalAlpha = a * f * pa;
    ctx.font = `500 32px ${SANS}`;
    developText(ctx, P.head1, P.cx, 330, t, P.at, { color: C.dim });
    ctx.font = `600 38px ${SANS}`;
    developText(ctx, P.head2, P.cx, 388, t, P.at + 0.25);
    const u = ease.out(prog(t, P.at + 0.5, 0.9));
    ctx.save();
    ctx.font = `600 150px ${MONO}`;
    ctx.fillStyle = P.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = P.color;
    ctx.shadowBlur = 26;
    ctx.fillText(`${Math.round(100 * P.frac * u)}%`, P.cx, 570);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,248,234,0.12)';
    ctx.fillRect(P.cx - 210, 616, 420, 16);
    ctx.fillStyle = P.color;
    ctx.fillRect(P.cx - 210, 616, 420 * P.frac * u, 16);
  }
  ctx.restore();
}

// Top-right instrument for this act: the year while the coins are flipped, then "上台的 100",
// then "/ all in 的 990".
function drawInstrument(ctx, t, a) {
  const run = life(t, T.collapse + 0.2, T.stage, 0.4, 0.3);
  if (run > 0) {
    const p = 10 * clamp((t - T.grow0) / (T.grow1 - T.grow0));
    drawDenominator(ctx, { seen: String(Math.floor(p + 1e-6)), seenLabel: '第几年', total: '10', totalLabel: '一共', alpha: a * run, alphaTotal: 1 });
  }
  const pa = life(t, T.stage + 0.3, T.life + 0.1, 0.4, 0.6);
  if (pa > 0) {
    drawDenominator(ctx, {
      seen: String(pp.nTop), seenLabel: '上台的', total: n(pp.gamblers), totalLabel: 'all in 的',
      alpha: a * pa, alphaTotal: prog(t, T.denom2, 1.0),
    });
  }
}

export function drawAct2(ctx, t) {
  const a = life(t, T.people, T.life + 0.1, 0.5, 0.6);
  if (a <= 0) return;
  // Behind the fractions everything else almost goes (one subject at a time).
  const chartA = 1 - 0.92 * ease.inOut(prog(t, T.fractions, 0.6));
  drawGrid(ctx, t, a);
  drawCoin(ctx, t, a);
  drawRules(ctx, t, a);
  drawRun(ctx, t, a, chartA);
  drawGroups(ctx, t, a, chartA);
  drawStage(ctx, t, a * chartA);
  drawFractions(ctx, t, a);
  drawInstrument(ctx, t, a);
}

// For the sound: when each year's coins land.
export const yearTimes = () => Array.from({ length: 10 }, (_, k) => T.grow0 + ((k + 1) / 10) * (T.grow1 - T.grow0));
