// "Every case": you pick door 1; the car is behind door 1, 2 or 3 (equally likely).
import { prog, ease, drawRich } from '../../engine/kit.js';
import { C, SANS, life, pill, mark } from './style.js';
import { drawDoor, drawCar } from './doors.js';
import { T } from './timeline.js';

const D = { w: 120, h: 170, xs: [560, 720, 880] };
const ROWS = [230, 450, 670]; // row centres
const COL = { stay: 1270, sw: 1560 };
// Per world (car behind door c): which doors the host opens (world 1: he may open either).
const WORLDS = [
  { car: 0, opens: [1, 2], other: null, label: '2 或 3' },
  { car: 1, opens: [2], other: 1, label: '3' },
  { car: 2, opens: [1], other: 2, label: '2' },
];

export function drawWorlds(ctx, t) {
  const a = life(t, T.worlds + 0.1, T.hundred + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Column headers.
  ctx.textAlign = 'center';
  ctx.font = `800 46px ${SANS}`;
  ctx.fillStyle = C.slate;
  ctx.fillText('不换', COL.stay, 108);
  ctx.fillStyle = C.amber;
  ctx.fillText('换', COL.sw, 108);
  ctx.font = `500 30px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.fillText('你选的', D.xs[0] + D.w / 2, 108);
  WORLDS.forEach((wd, r) => {
    const t0 = T.rows[r];
    const ra = ease.out(prog(t, T.worlds + 0.4 + r * 0.25, 0.4));
    if (ra <= 0) return;
    const y = ROWS[r];
    const top = y - D.h / 2;
    const host = ease.inOut(prog(t, t0 + 0.4, 0.5));
    const reveal = ease.inOut(prog(t, t0 + 1.4, 0.5));
    const focus = t >= t0 - 0.1 && t < t0 + 3.5 ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha *= ra * (t < t0 ? 0.8 : focus + (1 - focus) * (t >= T.worldsSum ? 1 : 0));
    // Row label with a small car icon.
    ctx.textAlign = 'right';
    ctx.font = `700 42px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText(`车在 ${wd.car + 1} 号`, 470, y + 2);
    ctx.font = `500 28px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.fillText('可能性 1/3', 470, y + 46);
    for (let d = 0; d < 3; d++) {
      const opened = wd.opens.includes(d);
      const open = opened ? host : reveal;
      drawDoor(ctx, {
        x: D.xs[d], y: top, w: D.w, h: D.h, num: d + 1, open, content: wd.car === d ? 'car' : 'goat',
        highlight: d === 0 ? 0.85 : 0,
      });
    }
    if (host > 0) {
      const xs = wd.opens.map((d) => D.xs[d] + D.w / 2);
      const cx = xs.reduce((s, x) => s + x, 0) / xs.length;
      pill(ctx, cx, top - 26, `主持人开 ${wd.label}`, C.slate, host, 24);
    }
    // Results: tick for the winner, cross for the loser.
    const res = ease.out(prog(t, t0 + 2.0, 0.45));
    if (res > 0) {
      const stayWins = wd.car === 0;
      mark(ctx, COL.stay, y, 74, stayWins, stayWins ? C.slate : 'rgba(244,246,250,0.28)', res);
      mark(ctx, COL.sw, y, 74, !stayWins, !stayWins ? C.amber : 'rgba(244,246,250,0.28)', res);
    }
    ctx.restore();
  });
  // Tally at the bottom.
  const s = ease.outBack(prog(t, T.worldsSum, 0.45));
  if (s > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, s);
    ctx.font = `800 52px ${SANS}`;
    ctx.textAlign = 'center';
    drawRich(ctx, [['赢 ', C.dim], ['1', C.slate], [' 种', C.dim]], COL.stay, 868);
    ctx.shadowColor = 'rgba(255,181,71,0.6)';
    ctx.shadowBlur = 24;
    drawRich(ctx, [['赢 ', C.dim], ['2', C.amber], [' 种', C.dim]], COL.sw, 868);
    ctx.restore();
  }
  ctx.restore();
}

export { drawCar };
