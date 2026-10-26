// Twist: the host doesn't know where the car is and opens a door at random. Games where he
// reveals the car are void; among the rest, staying and switching come out about even.
import { clamp, prog, ease, drawRich, fmtInt } from '../../engine/kit.js';
import { C, SANS, MONO, life, pill } from './style.js';
import { drawDoor, stageFloor } from './doors.js';
import { STAGE } from './story.js';
import { T, logCount } from './timeline.js';
import { CellField } from './cells.js';

let st = null;
const GRID = { x: 510, y: 250, cols: 75, pitch: 12, size: 10 };
const BAR = { base: 850, cols: 30, pitch: 8, size: 7, xA: 680, xB: 1000 };

export function setupTwist(state) {
  st = state;
  const r = st.random;
  const A = [];
  const Bwin = [];
  const Bvoid = [];
  for (let i = 0; i < r.count; i++) {
    if (r.firstRight[i]) A.push(i);
    else if (r.outcome[i] === 1) Bwin.push(i);
    else Bvoid.push(i);
  }
  st.twistCells = new CellField({
    kind: r.outcome, grid: GRID, colors: [C.slate, C.amber, C.voidCell], seed: 11,
    bars: [
      { x: BAR.xA, base: BAR.base, cols: BAR.cols, pitch: BAR.pitch, size: BAR.size, members: A },
      { x: BAR.xB, base: BAR.base, cols: BAR.cols, pitch: BAR.pitch, size: BAR.size, members: [...Bwin, ...Bvoid] },
    ],
  });
  st.tCounts = { A: A.length, win: Bwin.length, void: Bvoid.length };
  const rows = (n) => Math.ceil(n / BAR.cols) * BAR.pitch;
  st.tTops = { A: BAR.base - rows(A.length), win: BAR.base - rows(Bwin.length), B: BAR.base - rows(Bwin.length + Bvoid.length) };
}

function cellAppear(i) {
  return T.tFill0 + ((T.tFill1 - T.tFill0) * Math.log(i + 1)) / Math.log(st.random.count);
}

function side(ctx, x, label, color, wins, valid, a, glow) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.textAlign = 'center';
  ctx.font = `800 60px ${SANS}`;
  ctx.fillStyle = color;
  ctx.fillText(label, x, 400);
  ctx.font = `500 30px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('赢了', x, 458);
  ctx.font = `700 72px ${MONO}`;
  ctx.fillStyle = C.text;
  ctx.fillText(fmtInt(wins), x, 540);
  if (glow > 0) {
    ctx.shadowColor = `rgba(255,200,107,${0.8 * glow})`;
    ctx.shadowBlur = 30 * glow;
  }
  ctx.font = `600 ${Math.round(46 + 14 * glow)}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.fillText(valid ? `${((100 * wins) / valid).toFixed(1)}%` : '—', x, 620);
  ctx.shadowBlur = 0;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.fillText('（只算开出羊的局）', x, 672);
  ctx.restore();
}

export function drawTwist(ctx, t) {
  if (t < T.twist || t > T.outro + 0.5) return;
  const out = 1 - prog(t, T.outro - 0.4, 0.4);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // 1. The ignorant host: a roulette between doors 2 and 3, then he opens the car.
  const ia = life(t, T.twist + 0.1, T.tFill0, 0.35, 0.4);
  if (ia > 0) {
    const { w, h, top, xs } = STAGE;
    ctx.save();
    ctx.globalAlpha = ia;
    stageFloor(ctx, 380, 1540, top + h + 2);
    let spin = -1;
    if (t >= T.tRoulette && t < T.tOpen) {
      // Decelerating roulette between doors 2 and 3; it ends on door 3, which then opens.
      const u = (t - T.tRoulette) / (T.tOpen - T.tRoulette);
      spin = 1 + ((Math.floor(Math.sqrt(u) * 9) + 1) % 2);
    }
    const open3 = ease.inOut(prog(t, T.tOpen, 0.6));
    for (let d = 0; d < 3; d++) {
      const hl = d === 0 ? 1 : d === spin ? 0.9 : d === 2 && t >= T.tOpen ? 0.5 : 0;
      drawDoor(ctx, { x: xs[d], y: top, w, h, num: d + 1, open: d === 2 ? open3 : 0, content: d === 2 ? 'car' : null, highlight: hl });
    }
    pill(ctx, xs[0] + w / 2, top - 50, '你选的', C.amber, 1, 32);
    pill(ctx, 960, 170, '主持人：我也不知道车在哪', C.slate, ease.out(prog(t, T.twist + 0.3, 0.4)), 34);
    const stamp = ease.outBack(prog(t, T.tOpen + 0.55, 0.3));
    if (stamp > 0) {
      ctx.save();
      ctx.translate(xs[2] + w / 2, top + h / 2);
      ctx.rotate(-0.2);
      ctx.scale(1.6 - 0.6 * stamp, 1.6 - 0.6 * stamp);
      ctx.globalAlpha *= clamp(stamp);
      ctx.strokeStyle = C.red;
      ctx.fillStyle = C.red;
      ctx.lineWidth = 6;
      ctx.font = `900 64px ${SANS}`;
      const tw = ctx.measureText('作废').width + 40;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -48, tw, 92, 12);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('作废', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.font = `600 34px ${SANS}`;
      ctx.fillStyle = C.red;
      ctx.globalAlpha *= clamp(stamp);
      ctx.fillText('开出了车，这局不算', xs[2] + w + 40, top + h / 2 + 12);
    }
    ctx.restore();
  }
  // 2. 3,000 games, then regrouped.
  const r = st.random;
  const n = logCount(t, T.tFill0, T.tFill1, 1, r.count);
  const s = r.cum[0][n];
  const w = r.cum[1][n];
  const v = r.cum[2][n];
  const ga = ease.out(prog(t, T.tFill0 - 0.3, 0.4)) * out;
  if (ga > 0) {
    const morph = prog(t, T.tSort, 1.6);
    const voidDim = 1 - 0.65 * ease.inOut(prog(t, 110.7, 0.5));
    const drop = ease.in(prog(t, T.tDrop, 1.3));
    st.twistCells.draw(ctx, { count: n, morph, t, appear: cellAppear, alpha: ga, dim: { 2: morph > 0 ? 1 : voidDim }, drop: { 2: drop } });
    const sa = ga * (1 - prog(t, T.tSort, 0.5));
    const glow = life(t, 110.7, T.tSort, 0.4, 0.3);
    side(ctx, 250, '不换', C.slate, s, s + w, sa, glow);
    side(ctx, 1670, '换', C.amber, w, s + w, sa, glow);
    if (sa > 0) {
      ctx.save();
      ctx.globalAlpha = sa;
      ctx.font = `600 36px ${SANS}`;
      ctx.textAlign = 'center';
      drawRich(ctx, [['已玩 ', C.dim], [fmtInt(n), C.text], [' 局，作废 ', C.dim], [fmtInt(v), C.red], [' 局（开出了车）', C.dim]], 960, 200);
      ctx.restore();
    }
    // Bar labels.
    const la = ease.out(prog(t, T.tSort + 1.2, 0.5)) * out;
    if (la > 0) {
      const cA = BAR.xA + (BAR.cols * BAR.pitch) / 2;
      const cB = BAR.xB + (BAR.cols * BAR.pitch) / 2;
      const right = BAR.xB + BAR.cols * BAR.pitch + 34;
      const topB = drop > 0.6 ? st.tTops.win : st.tTops.B;
      ctx.save();
      ctx.globalAlpha = la;
      ctx.textAlign = 'center';
      ctx.font = `700 40px ${SANS}`;
      ctx.fillStyle = C.text;
      ctx.fillText('第一次就选中车', cA, st.tTops.A - 74);
      ctx.fillText('第一次选错', cB, topB - 74);
      ctx.font = `600 34px ${SANS}`;
      ctx.fillStyle = C.slate;
      ctx.fillText(`不换赢 ${fmtInt(st.tCounts.A)}`, cA, st.tTops.A - 26);
      ctx.textAlign = 'left';
      ctx.fillStyle = C.amber;
      ctx.fillText(`换赢 ${fmtInt(st.tCounts.win)}`, right, BAR.base - 110);
      ctx.globalAlpha = la * (1 - drop);
      ctx.fillStyle = C.red;
      ctx.fillText(`开出了车 · 作废 ${fmtInt(st.tCounts.void)}`, right, st.tTops.B + 120);
      ctx.restore();
    }
    const eq = ease.outBack(prog(t, T.tDrop + 1.3, 0.45)) * out;
    if (eq > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(eq);
      ctx.textAlign = 'center';
      ctx.font = `700 96px ${MONO}`;
      drawRich(ctx, [['1', C.slate], [' : ', C.dim], ['1', C.amber]], 1610, 640);
      ctx.font = `400 28px ${SANS}`;
      ctx.fillStyle = C.faint;
      ctx.textAlign = 'center'; // drawRich leaves textAlign at 'left'
      ctx.fillText('柱子差不多一样高', 1610, 700);
      ctx.restore();
    }
    // Summary of the two versions of the game.
    const sum = ease.out(prog(t, T.tSum, 0.45)) * out;
    if (sum > 0) {
      ctx.save();
      ctx.globalAlpha = sum;
      pill(ctx, 640, 150, '主持人知道车在哪：换赢 2/3', C.amber, 1, 34, { fill: 'rgba(255,181,71,0.14)' });
      pill(ctx, 1290, 150, '主持人随手开：一半一半', C.slate, 1, 34);
      ctx.restore();
    }
  }
  ctx.restore();
}
