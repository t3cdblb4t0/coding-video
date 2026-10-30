// Hook: a class of 50 with random birthdays; the pairs who share one light up and connect.
// Also drawn again (smaller) in the callback section.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, makeCanvas, life, drawPerson, pill } from './style.js';
import { fmtDay } from './sim.js';
import { T } from './timeline.js';

// 50 seats, 10 columns x 5 rows. Layout is computed once.
const COLS = 10;
const ROWS = 5;
const SEAT = { w: 168, h: 132, gapX: 12, gapY: 14 };
const GRID_W = COLS * SEAT.w + (COLS - 1) * SEAT.gapX;
const GRID = { x: (W - GRID_W) / 2, y: 190 }; // 5 rows end at y=906, clear of captions (y>930)

function seatXY(i) {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  return [GRID.x + c * (SEAT.w + SEAT.gapX), GRID.y + r * (SEAT.h + SEAT.gapY)];
}

let st = null;
export function setupClassroom(state) {
  st = state;
  // Group seats by shared day so each matching group gets one colour.
  const groups = new Map();
  st.cls.pairs.forEach(([i, j]) => {
    const d = st.cls.days[i];
    if (!groups.has(d)) groups.set(d, new Set());
    groups.get(d).add(i);
    groups.get(d).add(j);
  });
  const palette = [C.amber, C.cyan, C.green, C.gold];
  st.clsGroups = [...groups.entries()].map(([day, set], k) => ({ day, seats: [...set].sort((a, b) => a - b), color: palette[k % palette.length] }));
  st.clsMatched = new Map();
  st.clsGroups.forEach((g) => g.seats.forEach((i) => st.clsMatched.set(i, g)));
}

// Draw the whole class. scale/offset let the callback shrink it. `lit` in [0,1] reveals matches.
function drawClass(ctx, t, { lit, cx = W / 2, cy = 500, scale = 1, titleFade = 0 }) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -500);
  ctx.textBaseline = 'alphabetic';
  // Connecting lines between matched seats (drawn under the cards).
  if (lit > 0) {
    for (const g of st.clsGroups) {
      for (let a = 0; a < g.seats.length; a++) {
        for (let b2 = a + 1; b2 < g.seats.length; b2++) {
          const [x0, y0] = seatXY(g.seats[a]);
          const [x1, y1] = seatXY(g.seats[b2]);
          ctx.strokeStyle = g.color;
          ctx.globalAlpha = lit * 0.7;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x0 + SEAT.w / 2, y0 + 56);
          ctx.lineTo(x1 + SEAT.w / 2, y1 + 56);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < st.cls.n; i++) {
    const [x, y] = seatXY(i);
    const g = st.clsMatched.get(i);
    const on = g && lit > 0;
    const appear = ease.out(prog(t, T.hook + 0.3 + i * 0.012, 0.3));
    if (appear <= 0) continue;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.fillStyle = on ? 'rgba(255,181,71,0.10)' : 'rgba(255,255,255,0.03)';
    ctx.strokeStyle = on ? g.color : C.line;
    ctx.lineWidth = on ? 3.5 : 1.6;
    if (on) {
      ctx.save();
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 24 * lit;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, SEAT.w, SEAT.h, 14);
    ctx.fill();
    ctx.stroke();
    if (on) ctx.restore();
    drawPerson(ctx, x + SEAT.w / 2, y + 76, 58, on ? g.color : C.slate, 1);
    ctx.fillStyle = on ? g.color : C.dim;
    ctx.font = `600 26px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(fmtDay(st.cls.days[i]), x + SEAT.w / 2, y + SEAT.h - 14);
    ctx.restore();
  }
  ctx.restore();
}

export function drawHook(ctx, t) {
  const a = life(t, 0, T.choice + 0.1, 0.01, 0.35);
  if (a <= 0) return;
  const lit = ease.out(prog(t, T.classMatch, 0.7));
  ctx.save();
  ctx.globalAlpha = a;
  drawClass(ctx, t, { lit });
  ctx.textBaseline = 'alphabetic';
  // Question across the top.
  const q = ease.out(prog(t, 0.1, 0.5));
  ctx.save();
  ctx.globalAlpha = a * q;
  ctx.textAlign = 'center';
  ctx.font = `800 72px ${SANS}`;
  ctx.fillStyle = C.text;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 20;
  drawRich(ctx, [['你们班，有没有两个人 '], ['同一天生日', C.amber], ['？']], W / 2, 150);
  ctx.restore();
  // 97% headline bursts in over the class.
  const big = ease.outBack(prog(t, T.big97, 0.5));
  if (big > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(big);
    ctx.translate(W / 2, 520);
    ctx.scale(big, big);
    ctx.fillStyle = 'rgba(7,10,18,0.82)';
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-430, -170, 860, 300, 28);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 46px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('会撞的概率', 0, -108);
    ctx.shadowColor = 'rgba(255,181,71,0.5)';
    ctx.shadowBlur = 36;
    ctx.font = `900 220px ${MONO}`;
    ctx.fillStyle = C.amber;
    ctx.fillText('97%', 0, 36);
    ctx.restore();
  }
  // Series tag.
  ctx.globalAlpha = a * q;
  ctx.textAlign = 'left';
  ctx.font = `700 30px ${SANS}`;
  ctx.letterSpacing = '6px';
  ctx.fillStyle = C.amber;
  ctx.fillText('算给你看 · 03', GRID.x + 4, 150);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

export function drawCallback(ctx, t) {
  const a = life(t, T.callback, T.why + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  drawClass(ctx, t, { lit: 1, cy: 470, scale: 0.82 });
  ctx.restore();
}

export { drawClass };
