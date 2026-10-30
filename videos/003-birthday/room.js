// One room: people enter one at a time and mark their birthday on a 365-day calendar.
// The 18th person lands on March 22, already taken by the 16th: the first collision.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, mix } from './style.js';
import { dayToMD, fmtDay } from './sim.js';
import { T } from './timeline.js';

const CS = 42; // cell size
const PITCH = 48;
const LABEL = 92;
const GRID_W = LABEL + 31 * PITCH;
const CX0 = (W - GRID_W) / 2;
const CY0 = 250;
const ROW_PITCH = 50;

function cellXY(day) {
  const [m, d] = dayToMD(day);
  return [CX0 + LABEL + (d - 1) * PITCH, CY0 + (m - 1) * ROW_PITCH];
}

// Person i (0-based) enters at this time; the 18 are spread from enter0 to collide.
function enterTime(i) {
  return lerp(T.enter0, T.collide, i / 17);
}

export function drawRoom(ctx, t) {
  const a = life(t, T.room + 0.05, T.rooms + 0.15, 0.35, 0.3);
  if (a <= 0) return;
  const days = st.rooms.featured;
  // How many have entered.
  let entered = 0;
  for (let i = 0; i < 18; i++) if (t >= enterTime(i)) entered = i + 1;
  const collideA = 15; // person 16 (March 22)
  const collideB = 17; // person 18 (March 22)
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Month grid.
  for (let m = 1; m <= 12; m++) {
    const y = CY0 + (m - 1) * ROW_PITCH;
    ctx.fillStyle = C.faint;
    ctx.font = `600 26px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${m}月`, CX0 + LABEL - 18, y + CS / 2 + 9);
    const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    for (let d = 0; d < dim; d++) {
      const x = CX0 + LABEL + d * PITCH;
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.beginPath();
      ctx.roundRect(x, y, CS, CS, 7);
      ctx.fill();
    }
  }
  // Filled cells.
  const collideOn = ease.out(prog(t, T.collide, 0.4));
  for (let i = 0; i < entered; i++) {
    const [x, y] = cellXY(days[i]);
    const pop = ease.outBack(prog(t, enterTime(i), 0.22));
    const isHit = i === collideA || i === collideB;
    const color = isHit && collideOn > 0 ? mix(C.slate, C.amber, collideOn) : C.slate;
    ctx.save();
    ctx.globalAlpha = a * clamp(pop);
    if (isHit && collideOn > 0) {
      ctx.shadowColor = C.amber;
      ctx.shadowBlur = 22 * collideOn;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, CS, CS, 7);
    ctx.fill();
    ctx.restore();
  }
  // Headcount, top-left.
  ctx.textAlign = 'left';
  ctx.font = `500 34px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('第', CX0, 180);
  ctx.font = `900 76px ${MONO}`;
  ctx.fillStyle = collideOn > 0 ? C.amber : C.text;
  const nx = CX0 + 64;
  ctx.fillText(String(entered), nx, 196);
  const numW = ctx.measureText(String(entered)).width;
  ctx.font = `500 34px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('人进来了', nx + numW + 20, 180);
  // Collision callout.
  if (collideOn > 0) {
    const [xa, ya] = cellXY(days[collideA]);
    ctx.save();
    ctx.globalAlpha = a * collideOn;
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(xa - 6, ya - 6, CS + 12, CS + 12, 9);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `800 44px ${SANS}`;
    ctx.fillStyle = C.amber;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 16;
    drawRich(ctx, [['撞了！都是 '], [fmtDay(days[collideA]), C.amber]], W / 2, 900);
    ctx.restore();
  }
  ctx.restore();
}

let st = null;
export function setupRoom(state) {
  st = state;
}
