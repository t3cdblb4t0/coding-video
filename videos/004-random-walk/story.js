// Pólya's walk in the park: two people wander a small park at random and keep running into each
// other (a real simulation on a bounded grid, labelled 示意). Then his name card and a recreated
// title page of the 1921 paper (not a facsimile).
import { clamp, lerp, prog, ease, mulberry32, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, SERIF, life, drawWalker } from './style.js';
import { T } from './timeline.js';

const PARK = { cols: 12, rows: 6, cell: 84, x: 0, y: 300 };
PARK.x = (W - (PARK.cols - 1) * PARK.cell) / 2;
const STEPS = 220;
// "Ran into each other" = at the same corner or at the two ends of one street (they can see each
// other). With seed 1887 this happens 12 times in 220 steps (measured; see 分镜.md).

let st = null;
export function setupStory(state) {
  st = state;
  // Two walkers on a bounded park grid; a move off the edge is replaced by staying put.
  const rand = mulberry32(1887);
  const A = [[1, 1]];
  const B = [[PARK.cols - 2, PARK.rows - 2]];
  const meets = [];
  const step = ([x, y]) => {
    const r = Math.floor(rand() * 4);
    const nx = x + (r === 0 ? 1 : r === 1 ? -1 : 0);
    const ny = y + (r === 2 ? 1 : r === 3 ? -1 : 0);
    return nx < 0 || ny < 0 || nx >= PARK.cols || ny >= PARK.rows ? [x, y] : [nx, ny];
  };
  for (let s = 1; s <= STEPS; s++) {
    A.push(step(A[s - 1]));
    B.push(step(B[s - 1]));
    if (Math.abs(A[s][0] - B[s][0]) + Math.abs(A[s][1] - B[s][1]) <= 1) meets.push(s);
  }
  st.park = { A, B, meets };
}

const px = ([x, y]) => [PARK.x + x * PARK.cell, PARK.y + y * PARK.cell];

function drawPark(ctx, t, alpha) {
  if (alpha <= 0) return;
  const { A, B, meets } = st.park;
  const n = Math.min(STEPS, Math.floor(clamp((t - T.parkMeet) / 6.8) * STEPS));
  ctx.save();
  ctx.globalAlpha *= alpha;
  // Lawn + paths.
  const w = (PARK.cols - 1) * PARK.cell;
  const h = (PARK.rows - 1) * PARK.cell;
  ctx.fillStyle = 'rgba(70,120,90,0.10)';
  ctx.beginPath();
  ctx.roundRect(PARK.x - 40, PARK.y - 40, w + 80, h + 80, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,140,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let c = 0; c < PARK.cols; c++) {
    ctx.moveTo(PARK.x + c * PARK.cell, PARK.y);
    ctx.lineTo(PARK.x + c * PARK.cell, PARK.y + h);
  }
  for (let r = 0; r < PARK.rows; r++) {
    ctx.moveTo(PARK.x, PARK.y + r * PARK.cell);
    ctx.lineTo(PARK.x + w, PARK.y + r * PARK.cell);
  }
  ctx.stroke();
  // Trails.
  const trail = (P, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const k0 = Math.max(0, n - 30);
    for (let k = k0; k < n; k++) {
      ctx.globalAlpha = alpha * (0.1 + 0.6 * ((k - k0) / 30));
      const [x0, y0] = px(P[k]);
      const [x1, y1] = px(P[k + 1]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
  };
  trail(A, C.amber);
  trail(B, C.cyan);
  const [ax, ay] = px(A[n]);
  const [bx, by] = px(B[n]);
  drawWalker(ctx, ax, ay, 9, C.amber);
  drawWalker(ctx, bx, by, 9, C.cyan);
  // Meeting pulses + counter.
  const met = meets.filter((s) => s <= n);
  for (const s of met) {
    const age = (n - s) / (STEPS / 6.8);
    if (age > 0.6) continue;
    const [mx0, my0] = px(A[s]);
    const [mx1, my1] = px(B[s]);
    const mx = (mx0 + mx1) / 2;
    const my = (my0 + my1) / 2;
    ctx.save();
    ctx.globalAlpha = alpha * (1 - age / 0.6);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mx, my, 20 + age * 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `700 46px ${SANS}`;
  drawRich(ctx, [['又碰上了：', C.dim], [`${met.length}`, C.gold], [' 次', C.dim]], W / 2, 220);
  ctx.font = `400 24px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'right';
  ctx.fillText('示意：两人各自随机走，走到相邻路口就算碰上', PARK.x + w + 40, PARK.y + h + 76);
  ctx.restore();
}

function drawPolya(ctx, t, alpha) {
  if (alpha <= 0) return;
  const slide = 1 - ease.out(prog(t, T.polyaCard, 0.6));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textBaseline = 'alphabetic';
  // Name card, left.
  ctx.textAlign = 'left';
  ctx.font = `600 92px ${SERIF}`;
  ctx.fillStyle = C.text;
  ctx.fillText('George Pólya', 170 - slide * 120, 430);
  ctx.font = `700 46px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.fillText('波利亚', 174 - slide * 120, 506);
  ctx.font = `500 34px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('1887–1985 · 匈牙利裔数学家', 174 - slide * 120, 566);
  ctx.fillText('当时在苏黎世联邦理工学院', 174 - slide * 120, 616);
  // Title page, right (a recreation, not a facsimile).
  const x = 1060 + slide * 160;
  const y = 250;
  const w = 700;
  const h = 520;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.025);
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#F2EBDC');
  g.addColorStop(1, '#DED1B5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // A shadow with blur 0 but a non-zero offset still draws, so reset all of it.
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.fillStyle = '#2B2620';
  ctx.textAlign = 'center';
  ctx.font = `500 26px ${SERIF}`;
  ctx.fillText('MATHEMATISCHE ANNALEN · 84 · 1921', w / 2, 70);
  ctx.fillRect(70, 88, w - 140, 2);
  ctx.font = `600 38px ${SERIF}`;
  ['Über eine Aufgabe der', 'Wahrscheinlichkeitsrechnung', 'betreffend die Irrfahrt', 'im Straßennetz.'].forEach((s, k) => ctx.fillText(s, w / 2, 170 + k * 52));
  ctx.font = `italic 400 30px ${SERIF}`;
  ctx.fillText('Von G. Pólya in Zürich.', w / 2, 420);
  ctx.font = `400 24px ${SERIF}`;
  ctx.fillStyle = 'rgba(43,38,32,0.6)';
  ctx.fillText('S. 149–160', w / 2, 476);
  // Highlight "Irrfahrt im Straßennetz" with a translation tag.
  const hl = ease.out(prog(t, T.polyaCard + 1.6, 0.5));
  if (hl > 0) {
    ctx.fillStyle = `rgba(255,181,71,${0.35 * hl})`;
    ctx.fillRect(w / 2 - 210, 274, 420 * hl, 64);
    ctx.fillRect(w / 2 - 150, 326, 300 * hl, 64);
  }
  ctx.restore();
  const tag = ease.outBack(prog(t, T.polyaCard + 2.0, 0.4));
  if (tag > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(tag);
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${SANS}`;
    ctx.fillStyle = C.amber;
    ctx.fillText('Irrfahrt im Straßennetz = 街道网中的随机漫步', x + w / 2, y + h + 70);
    ctx.restore();
  }
  ctx.restore();
}

export function drawStory(ctx, t) {
  const a = life(t, T.story + 0.05, T.rules + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const parkA = 1 - ease.in(prog(t, T.polyaCard - 0.3, 0.5));
  drawPark(ctx, t, parkA);
  drawPolya(ctx, t, ease.out(prog(t, T.polyaCard, 0.5)));
  ctx.restore();
}
