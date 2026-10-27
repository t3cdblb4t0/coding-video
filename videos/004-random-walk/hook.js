// Hook: a night-time street grid; a drunk leaves home and turns at random at every corner.
// The path is the real seed-1921 walk (the same walker the "wait" section comes back to).
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, life, drawHouse, drawWalker } from './style.js';
import { T } from './timeline.js';

const CELL = 34;
const OX = 960;
const OY = 590;
const REGION = { x0: 80, x1: 1840, y0: 250, y1: 920 };
const STEPS_SHOWN = 340; // steps drawn over the hook

let st = null;
export function setupHook(state) {
  st = state;
}

export function drawStreets(ctx, alpha, ox = OX, oy = OY, cell = CELL, region = REGION) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = C.street;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = ox - Math.floor((ox - region.x0) / cell) * cell; x <= region.x1; x += cell) {
    ctx.moveTo(x, region.y0);
    ctx.lineTo(x, region.y1);
  }
  for (let y = oy - Math.floor((oy - region.y0) / cell) * cell; y <= region.y1; y += cell) {
    ctx.moveTo(region.x0, y);
    ctx.lineTo(region.x1, y);
  }
  ctx.stroke();
  // Fade the edges into the night.
  const fade = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(6,8,15,1)');
    g.addColorStop(1, 'rgba(6,8,15,0)');
    return g;
  };
  ctx.fillStyle = fade(region.x0, 0, region.x0 + 160, 0);
  ctx.fillRect(region.x0 - 2, region.y0, 162, region.y1 - region.y0);
  ctx.fillStyle = fade(region.x1, 0, region.x1 - 160, 0);
  ctx.fillRect(region.x1 - 160, region.y0, 162, region.y1 - region.y0);
  ctx.fillStyle = fade(0, region.y0, 0, region.y0 + 90);
  ctx.fillRect(region.x0, region.y0 - 2, region.x1 - region.x0, 92);
  ctx.fillStyle = fade(0, region.y1, 0, region.y1 - 90);
  ctx.fillRect(region.x0, region.y1 - 90, region.x1 - region.x0, 92);
  ctx.restore();
}

// Draw the first `n` steps of a 2D path as a fading trail; returns the head position.
export function drawTrail(ctx, xs, ys, n, { ox = OX, oy = OY, cell = CELL, color = C.amber, width = 4, tail = 220 } = {}) {
  const k0 = Math.max(0, n - tail);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  for (let k = k0; k < n; k++) {
    ctx.globalAlpha = 0.15 + 0.85 * ((k - k0) / Math.max(1, n - k0));
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(ox + xs[k] * cell, oy - ys[k] * cell);
    ctx.lineTo(ox + xs[k + 1] * cell, oy - ys[k + 1] * cell);
    ctx.stroke();
  }
  ctx.restore();
  return [ox + xs[n] * cell, oy - ys[n] * cell];
}

export function drawHook(ctx, t) {
  // Fully visible from frame 0 (autoplay shows the first frame), fading out into the story.
  const a = t >= T.story + 0.05 ? 0 : 1 - ease.in(prog(t, T.story - 0.35, 0.4));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  drawStreets(ctx, 1);
  drawHouse(ctx, OX, OY - 2, 30, C.home, 1, 0.8);
  const n = Math.min(STEPS_SHOWN, Math.floor(clamp((t - 0.3) / 4.2) * STEPS_SHOWN));
  ctx.save();
  ctx.beginPath();
  ctx.rect(REGION.x0, REGION.y0, REGION.x1 - REGION.x0, REGION.y1 - REGION.y0 - 20);
  ctx.clip();
  if (n > 0) {
    const [hx, hy] = drawTrail(ctx, st.hookWalk.xs, st.hookWalk.ys, n);
    drawWalker(ctx, hx, hy, 7, C.amber);
  } else drawWalker(ctx, OX, OY, 7, C.amber);
  ctx.restore();
  // Title.
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 24;
  ctx.globalAlpha = a;
  ctx.font = `900 96px ${SANS}`;
  drawRich(ctx, [['喝醉的人，能自己'], ['走回家', C.amber], ['吗？']], W / 2, 210);
  ctx.restore();
}

export { OX, OY, CELL };
