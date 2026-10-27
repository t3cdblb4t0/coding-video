// Why: each extra dimension adds two more directions, and the chance of stumbling back home thins
// out. Three columns with the measured average visits home, then Kakutani's line in serif.
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, SONG, life, drawHouse, drawBird } from './style.js';
import { T } from './timeline.js';

// Average visits home within 10,000 steps (2,000 walkers each, seeds 101/102/103; see 分镜.md).
const COLS = [
  { name: '一条线', dirs: 2, visits: '77', verdict: '一定回家', ok: true, color: C.amber },
  { name: '一张网', dirs: 4, visits: '2.7', verdict: '一定回家，但可能很久', ok: true, color: C.amber },
  { name: '一个空间', dirs: 6, visits: '0.54', verdict: '66% 再也回不去', ok: false, color: C.violet },
];

function icon(ctx, k, cx, cy, s) {
  ctx.save();
  ctx.strokeStyle = COLS[k].color;
  ctx.fillStyle = COLS[k].color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  if (k === 0) {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.stroke();
  } else if (k === 1) {
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(cx + (i * s) / 2, cy - s * 0.75);
      ctx.lineTo(cx + (i * s) / 2, cy + s * 0.75);
      ctx.moveTo(cx - s, cy + (i * s) / 2.7);
      ctx.lineTo(cx + s, cy + (i * s) / 2.7);
    }
    ctx.globalAlpha *= 0.7;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    const d = s * 0.42;
    const f = [[-s * 0.6, -s * 0.35], [s * 0.6, -s * 0.35], [s * 0.6, s * 0.75], [-s * 0.6, s * 0.75]];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    f.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y)));
    ctx.closePath();
    f.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x + d, cy + y - d) : ctx.moveTo(cx + x + d, cy + y - d)));
    ctx.lineTo(cx + f[0][0] + d, cy + f[0][1] - d);
    f.forEach(([x, y]) => {
      ctx.moveTo(cx + x, cy + y);
      ctx.lineTo(cx + x + d, cy + y - d);
    });
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWhy(ctx, t) {
  const a = life(t, T.why + 0.05, T.think + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  // Columns are fully gone before the quote starts, so the two never overlap.
  const colsOut = ease.in(prog(t, T.quote - 0.6, 0.45));
  const cw = 480;
  const gap = 60;
  const x0 = W / 2 - (3 * cw + 2 * gap) / 2;
  COLS.forEach((c, k) => {
    const r = ease.out(prog(t, T.whyCols + k * 0.35, 0.5));
    if (r <= 0) return;
    const x = x0 + k * (cw + gap);
    const y = 200 + (1 - r) * 30 - colsOut * 60;
    ctx.save();
    ctx.globalAlpha = a * r * (1 - colsOut);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = k === 2 ? 'rgba(183,156,255,0.5)' : 'rgba(255,181,71,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, 640, 22);
    ctx.fill();
    ctx.stroke();
    icon(ctx, k, x + cw / 2, y + 100, 90);
    ctx.font = `800 52px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText(c.name, x + cw / 2, y + 250);
    ctx.font = `500 32px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(`每步 ${c.dirs} 个方向`, x + cw / 2, y + 300);
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText('1 万步里平均回家', x + cw / 2, y + 380);
    ctx.font = `900 110px ${MONO}`;
    ctx.fillStyle = c.color;
    ctx.fillText(c.visits, x + cw / 2, y + 500);
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('次', x + cw / 2, y + 545);
    const vr = ease.out(prog(t, T.whyCols + 2.6 + k * 0.4, 0.4));
    if (vr > 0) {
      ctx.globalAlpha = a * vr * (1 - colsOut);
      ctx.font = `700 34px ${SANS}`;
      ctx.fillStyle = c.ok ? C.amber : C.red;
      ctx.fillText(c.verdict, x + cw / 2, y + 610);
    }
    ctx.restore();
  });
  // Kakutani's line, as a quotation in serif type with a house and a bird.
  const q = ease.out(prog(t, T.quote, 0.7));
  if (q > 0) {
    ctx.save();
    ctx.globalAlpha = a * q;
    ctx.font = `700 74px ${SONG}`;
    ctx.fillStyle = C.text;
    ctx.fillText('喝醉的人终会回家，', W / 2, 430 + (1 - q) * 20);
    const q2 = ease.out(prog(t, T.quote + 0.9, 0.7));
    ctx.globalAlpha = a * q2;
    ctx.fillStyle = C.violet;
    ctx.fillText('喝醉的鸟可能永远迷路。', W / 2, 560 + (1 - q2) * 20);
    const q3 = ease.out(prog(t, T.quote + 1.7, 0.6));
    ctx.globalAlpha = a * q3;
    ctx.font = `500 38px ${SONG}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('—— 角谷静夫（数学家）', W / 2 + 260, 680);
    drawHouse(ctx, W / 2 - 420, 400, 44, C.home, q, 0.6);
    drawBird(ctx, W / 2 + 470, 520, 46, C.violet, t * 6, q2);
    ctx.restore();
  }
  ctx.restore();
}
