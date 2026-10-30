// Hook (0–4.8 s). Episode-03 data: 40.75% left within 2 s and 67.6% within 5 s, so frame 0 now
// shows the conclusion with its number, laid out like the cover; a personal question pops at 1.6 s.
// The path is the real seed-1921 walk (the same walker the "wait" section comes back to).
import { clamp, lerp, prog, ease, drawRich, measureRich } from '../../engine/kit.js';
import { drawCover } from '../../engine/brand.js';
import { W, H, C, SANS, life, drawHouse, drawWalker, drawBird } from './style.js';
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

// Night grid + the real walk drawn up to `steps`, a glowing house and a bird. Used by the hook
// (animated) and by the cover (static), for any canvas size w x h.
export function drawWalkArt(g, w, h, { steps = 340, head = false, birdPhase = 0.8, birdDrift = 0 } = {}) {
  const landscape = w > h;
  const s = h / 1080;
  // The first 520 steps span 15 cells left / 4 right and 22 down / 1 up of home. In landscape the
  // path is flipped to run upwards from a house at the bottom right, so it stays clear of the
  // title block (left) and the captions (y > 900). The grid has no compass, so this is only a view.
  const flip = landscape ? -1 : 1;
  // 16:9 gives the path 38% of the width; 4:3 has a relatively wider title block, so only 34%.
  const share = w / h > 1.5 ? 0.38 : 0.34;
  const cell = landscape ? Math.min(34 * s, (w * share - 30) / 19) : Math.min(w, h) / 30;
  const ox = landscape ? w - 30 * s - 4 * cell : w * 0.5;
  const oy = landscape ? 100 * s + 22 * cell : h * 0.72;
  g.strokeStyle = C.street;
  g.lineWidth = 2;
  g.beginPath();
  for (let x = ox % cell; x <= w; x += cell) {
    g.moveTo(x, 0);
    g.lineTo(x, h);
  }
  for (let y = oy % cell; y <= h; y += cell) {
    g.moveTo(0, y);
    g.lineTo(w, y);
  }
  g.stroke();
  const { xs, ys } = st.hookWalk;
  const n = Math.min(steps, xs.length - 1);
  g.save();
  g.strokeStyle = C.amber;
  g.lineWidth = Math.max(3, cell * 0.14);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = C.amber;
  g.shadowBlur = 14;
  g.beginPath();
  for (let k = 0; k <= n; k++) {
    const X = ox + xs[k] * cell;
    const Y = oy - flip * ys[k] * cell;
    if (k === 0) g.moveTo(X, Y);
    else g.lineTo(X, Y);
  }
  g.stroke();
  g.restore();
  drawHouse(g, ox, oy, cell * 1.3, C.home, 1, 1);
  if (head) drawWalker(g, ox + xs[n] * cell, oy - flip * ys[n] * cell, cell * 0.24, C.amber);
  const bx = (landscape ? w * 0.58 : w * 0.82) + birdDrift * cell * 3;
  const by = (landscape ? h * 0.17 : h * 0.47) - birdDrift * cell * 1.2;
  drawBird(g, bx, by, (landscape ? 34 * s : cell) * 1.8, C.violet, birdPhase, 1);
}

// The vertical wrapper shows the series badge in its own title band, so it turns this one off.
export const HOOK_OPTS = { badge: true };
export const HOOK_TITLE = [[['醉汉一定能走回家，']], [['鸟却有 '], ['66% 永远回不去', C.amber]]];
export const HOOK_TAGLINE = [['数学家 1921 年就证明了', 'rgba(244,246,250,0.62)'], ['  ·  ', 'rgba(244,246,250,0.36)'], ['真实模拟 1 万次', 'rgba(244,246,250,0.62)']];
const QUESTION_AT = 1.6;

export function drawHook(ctx, t) {
  // Fully visible from frame 0 (autoplay shows the first frame), fading out into the story.
  const a = t >= T.story + 0.05 ? 0 : 1 - ease.in(prog(t, T.story - 0.35, 0.4));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const u = clamp(t / (T.story - 0.4));
  const { x, y } = drawCover(ctx, W, H, {
    episode: 4,
    badge: HOOK_OPTS.badge,
    title: HOOK_TITLE,
    tagline: HOOK_TAGLINE,
    art: (g) => drawWalkArt(g, W, H, { steps: Math.round(lerp(230, 420, u)), head: true, birdPhase: t * 7, birdDrift: u }),
  });
  // The personal question: makes it about the viewer, and is the comment prompt.
  const q = ease.outBack(prog(t, QUESTION_AT, 0.45));
  if (q > 0) {
    const rich = [['你是', C.text], ['醉汉', C.amber], ['，还是', C.text], ['鸟', C.violet], ['？', C.text]];
    ctx.save();
    ctx.font = `800 54px ${SANS}`;
    const tw = measureRich(ctx, rich);
    const pw = tw + 70;
    const ph = 92;
    const cy = y + 118;
    ctx.translate(x + pw / 2, cy);
    ctx.scale(clamp(q, 0, 1.1), clamp(q, 0, 1.1));
    ctx.globalAlpha *= clamp(q);
    ctx.fillStyle = 'rgba(255,181,71,0.14)';
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.stroke();
    ctx.textBaseline = 'middle';
    drawRich(ctx, rich, 0, 2, { align: 'center' });
    ctx.restore();
  }
  ctx.restore();
}

export { OX, OY, CELL };
