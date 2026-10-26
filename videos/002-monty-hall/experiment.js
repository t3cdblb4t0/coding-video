// The experiment (two players, same games), the 10,000-game grid, and the "why" regrouping.
import { clamp, lerp, prog, ease, drawRich, fmtInt } from '../../engine/kit.js';
import { C, SANS, MONO, life, pill } from './style.js';
import { drawDoor, stageFloor } from './doors.js';
import { T, logCount } from './timeline.js';
import { CellField } from './cells.js';

let st = null;
const DOORS = { w: 170, h: 250, top: 360, xs: [670, 875, 1080] };
const GAME = { pick: 0.2, host: 0.75, reveal: 1.3, result: 1.6, end: 2.45 };
const GRID = { x: 460, y: 230, cols: 125, pitch: 8, size: 6.5 };
const BAR = { base: 850, cols: 60, pitch: 5, size: 4, xA: 620, xB: 1000 };

export function setupExperiment(state) {
  st = state;
  const m = st.main;
  const kind = new Uint8Array(m.count);
  const A = [];
  const B = [];
  for (let i = 0; i < m.count; i++) {
    kind[i] = m.stayWin[i] ? 0 : 1;
    (m.stayWin[i] ? A : B).push(i);
  }
  st.mainCells = new CellField({
    kind, grid: GRID, colors: [C.slate, C.amber],
    bars: [
      { x: BAR.xA, base: BAR.base, cols: BAR.cols, pitch: BAR.pitch, size: BAR.size, members: A },
      { x: BAR.xB, base: BAR.base, cols: BAR.cols, pitch: BAR.pitch, size: BAR.size, members: B },
    ],
  });
  st.barTops = [BAR.base - Math.ceil(A.length / BAR.cols) * BAR.pitch, BAR.base - Math.ceil(B.length / BAR.cols) * BAR.pitch];
}

const resultT = (g) => T.games[g] + GAME.result;
function cellAppear(i) {
  if (i < 3) return resultT(i);
  return T.fill0 + ((T.fill1 - T.fill0) * Math.log((i + 1) / 3)) / Math.log(10000 / 3);
}

function gamesPlayed(t) {
  if (t < T.fill0) return T.games.filter((_, g) => t >= resultT(g)).length;
  return logCount(t, T.fill0, T.fill1, 3, st.main.count);
}

function scoreboard(ctx, x, label, color, wins, n, a) {
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
  ctx.font = `600 46px ${MONO}`;
  ctx.fillStyle = color;
  const rate = n ? wins / n : 0;
  ctx.fillText(n ? `${(100 * rate).toFixed(1)}%` : '—', x, 612);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x - 150, 640, 300, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x - 150, 640, 300 * rate, 10);
  ctx.restore();
}

function drawGames(ctx, t) {
  const a = life(t, T.exp + 0.2, T.fill0 + 0.1, 0.4, 0.45);
  if (a <= 0) return;
  const m = st.main;
  const { w, h, top, xs } = DOORS;
  let g = -1;
  for (let k = 0; k < 3; k++) if (t >= T.games[k]) g = k;
  ctx.save();
  ctx.globalAlpha = a;
  stageFloor(ctx, 600, 1320, top + h + 2);
  for (let d = 0; d < 3; d++) {
    let open = 0;
    let hl = 0;
    let content = null;
    if (g >= 0) {
      const t0 = T.games[g];
      const close = 1 - ease.in(prog(t, t0 + GAME.end, 0.15));
      content = m.car[g] === d ? 'car' : 'goat';
      if (d === m.pick[g]) {
        hl = ease.out(prog(t, t0 + GAME.pick, 0.25)) * close;
        open = ease.inOut(prog(t, t0 + GAME.reveal, 0.35)) * close;
      } else if (d === m.open[g]) open = ease.inOut(prog(t, t0 + GAME.host, 0.4)) * close;
      else open = ease.inOut(prog(t, t0 + GAME.reveal, 0.35)) * close;
    }
    drawDoor(ctx, { x: xs[d], y: top, w, h, num: d + 1, open, content, highlight: hl });
  }
  if (g >= 0) {
    const t0 = T.games[g];
    const la = life(t, t0 + GAME.pick, t0 + GAME.end + 0.12, 0.25, 0.15);
    ctx.textBaseline = 'alphabetic';
    pill(ctx, xs[m.pick[g]] + w / 2, top - 44, '第一次选', C.amber, la, 28);
    pill(ctx, xs[m.open[g]] + w / 2, top - 44, '主持人开', C.slate, life(t, t0 + GAME.host, t0 + GAME.end + 0.12, 0.25, 0.15), 28);
    const ra = life(t, t0 + GAME.result, t0 + GAME.end + 0.12, 0.2, 0.15);
    if (ra > 0) {
      const stayWins = m.stayWin[g] === 1;
      const resPill = (d, text, color, win) =>
        pill(ctx, xs[d] + w / 2, top + h + 52, win ? `${text} · 赢` : text, color, ra * (win ? 1 : 0.45), 32, win ? { fill: color, textColor: '#0B0F17' } : {});
      resPill(m.pick[g], '不换', C.slate, stayWins);
      resPill(m.other[g], '换', C.amber, !stayWins);
    }
    ctx.font = `600 36px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${g + 1} 局`, 960, 240);
  }
  ctx.restore();
}

export function drawExperiment(ctx, t) {
  if (t < T.exp || t > T.worlds + 0.5) return;
  const m = st.main;
  const n = gamesPlayed(t);
  const stay = m.cumStay[n];
  const out = 1 - prog(t, T.worlds - 0.1, 0.45);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Scoreboards on both sides (until the regrouping).
  const sa = ease.out(prog(t, T.exp + 0.3, 0.4)) * (1 - prog(t, T.sort, 0.5));
  scoreboard(ctx, 250, '不换', C.slate, stay, n, sa);
  scoreboard(ctx, 1670, '每次都换', C.amber, n - stay, n, sa);
  drawGames(ctx, t);
  // Grid of games.
  const ga = ease.out(prog(t, T.fill0 - 0.3, 0.4)) * out;
  if (ga > 0) {
    const morph = prog(t, T.sort, 1.7);
    st.mainCells.draw(ctx, { count: n, morph, t, appear: cellAppear, alpha: ga });
    const ca = ga * (1 - prog(t, T.sort, 0.4));
    ctx.save();
    ctx.globalAlpha = ca;
    // "已玩 10,000 局 · 每个小格 = 一局", measured piece by piece so it stays centred.
    const parts = [
      [`500 34px ${SANS}`, '已玩 ', C.dim],
      [`700 48px ${MONO}`, fmtInt(n), C.text],
      [`500 34px ${SANS}`, ' 局', C.dim],
      [`400 28px ${SANS}`, '   ·   每个小格 = 一局', C.faint],
    ];
    let total = 0;
    for (const [f, s] of parts) {
      ctx.font = f;
      total += ctx.measureText(s).width;
    }
    let x = 960 - total / 2;
    ctx.textAlign = 'left';
    for (const [f, s, c] of parts) {
      ctx.font = f;
      ctx.fillStyle = c;
      ctx.fillText(s, x, 196);
      x += ctx.measureText(s).width;
    }
    ctx.restore();
  }
  // Regrouped into two bars: first pick right (staying wins) vs first pick wrong (switching wins).
  const la = ease.out(prog(t, T.sort + 1.3, 0.5)) * out;
  if (la > 0) {
    const pulseB = 0.5 + 0.5 * Math.sin((t - T.sort) * 5);
    const hiB = life(t, 61.3, T.worlds, 0.3, 0.3);
    ctx.save();
    ctx.globalAlpha = la;
    ctx.textAlign = 'center';
    const cA = BAR.xA + (BAR.cols * BAR.pitch) / 2;
    const cB = BAR.xB + (BAR.cols * BAR.pitch) / 2;
    ctx.font = `700 40px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText('第一次就选中车', cA, st.barTops[0] - 74);
    ctx.fillText('第一次选错', cB, st.barTops[1] - 74);
    ctx.font = `600 34px ${SANS}`;
    ctx.fillStyle = C.slate;
    ctx.fillText(`不换赢 · ${(100 * stay / n).toFixed(1)}%`, cA, st.barTops[0] - 26);
    ctx.save();
    if (hiB > 0) {
      ctx.shadowColor = `rgba(255,181,71,${hiB * (0.5 + 0.4 * pulseB)})`;
      ctx.shadowBlur = 24;
    }
    ctx.fillStyle = C.amber;
    ctx.fillText(`换就赢 · ${(100 * (n - stay) / n).toFixed(1)}%`, cB, st.barTops[1] - 26);
    ctx.restore();
    ctx.font = `700 96px ${MONO}`;
    drawRich(ctx, [['1', C.slate], [' : ', C.dim], ['2', C.amber]], 1560, 640);
    ctx.font = `400 28px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.textAlign = 'center'; // drawRich leaves textAlign at 'left'
    ctx.fillText('柱子高度之比', 1560, 700);
    ctx.restore();
  }
  ctx.restore();
}

export { clamp, lerp };
