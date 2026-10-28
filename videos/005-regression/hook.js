// Hook (0–4.8 s) and cover. Frame 0 is the cover layout: the conclusion with its number on the
// left, the real slope chart on the right (best and worst 10% of 10,000 cadets: flight 1 -> 2,
// both groups drifting towards the middle with nobody praised or scolded). The personal question
// pops at 1.6 s.
import { clamp, lerp, prog, ease, drawRich, measureRich, mulberry32 } from '../../engine/kit.js';
import { drawCover } from '../../engine/brand.js';
import { W, H, C, SANS, MONO } from './style.js';
import { T, pct } from './timeline.js';

let st = null;
export function setupHook(state) {
  st = state;
  // 60 cadets from each group, chosen by a fixed seed, for the drawn lines.
  const rand = mulberry32(7);
  const sample = (idx) => {
    const a = idx.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 60);
  };
  st.hookTop = sample(st.cad.top);
  st.hookBot = sample(st.cad.bottom);
}

export const HOOK_OPTS = { badge: true };
export const hookTitle = () => [[['骂完就变好？']], [['不骂，'], [`${pct(st.cad.botBetter)} 也会变好`, C.amber]]];
export const HOOK_TAGLINE = [['诺贝尔奖得主讲过的错觉', 'rgba(244,246,250,0.62)'], ['  ·  ', 'rgba(244,246,250,0.36)'], ['真实模拟 1 万人', 'rgba(244,246,250,0.62)']];

// Slope chart in a box (x, y, w, h): left axis = flight 1, right axis = flight 2. `u` in [0, 1]
// animates the lines from flight 1 towards flight 2.
export function drawSlope(g, x, y, w, h, u = 1, { labels = true, scale = 1 } = {}) {
  const c = st.cad;
  const lo = 20;
  const hi = 100;
  const py = (v) => y + h - ((clamp(v, lo, hi) - lo) / (hi - lo)) * h;
  const xa = x + w * 0.16;
  const xb = x + w * 0.84;
  g.save();
  g.strokeStyle = 'rgba(244,246,250,0.22)';
  g.lineWidth = 2 * scale;
  g.beginPath();
  g.moveTo(xa, y);
  g.lineTo(xa, y + h);
  g.moveTo(xb, y);
  g.lineTo(xb, y + h);
  g.stroke();
  g.setLineDash([8 * scale, 8 * scale]);
  g.strokeStyle = 'rgba(244,246,250,0.28)';
  g.beginPath();
  g.moveTo(xa, py(60));
  g.lineTo(xb, py(60));
  g.stroke();
  g.setLineDash([]);
  const draw = (idx, color) => {
    g.strokeStyle = color;
    g.globalAlpha = 0.32;
    g.lineWidth = 2 * scale;
    g.beginPath();
    for (const i of idx) {
      const y1 = py(c.s1[i]);
      const y2 = py(lerp(c.s1[i], c.s2[i], u));
      g.moveTo(xa, y1);
      g.lineTo(lerp(xa, xb, u), y2);
    }
    g.stroke();
    g.globalAlpha = 1;
  };
  draw(st.hookTop, C.amber);
  draw(st.hookBot, C.cyan);
  // Group means.
  const meanLine = (m1, m2, color) => {
    g.strokeStyle = color;
    g.lineWidth = 7 * scale;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(xa, py(m1));
    g.lineTo(lerp(xa, xb, u), py(lerp(m1, m2, u)));
    g.stroke();
    g.fillStyle = color;
    for (const [px, v] of [[xa, m1], [lerp(xa, xb, u), lerp(m1, m2, u)]]) {
      g.beginPath();
      g.arc(px, py(v), 10 * scale, 0, Math.PI * 2);
      g.fill();
    }
  };
  meanLine(c.top1, c.top2, C.amber);
  meanLine(c.bot1, c.bot2, C.cyan);
  if (labels) {
    g.textBaseline = 'alphabetic';
    g.textAlign = 'center';
    g.font = `600 ${Math.round(34 * scale)}px ${SANS}`;
    g.fillStyle = C.dim;
    g.fillText('第一次', xa, y + h + 50 * scale);
    g.fillText('第二次', xb, y + h + 50 * scale);
    g.font = `700 ${Math.round(40 * scale)}px ${MONO}`;
    g.textAlign = 'right';
    g.fillStyle = C.amber;
    g.fillText(c.top1.toFixed(1), xa - 22 * scale, py(c.top1) + 14 * scale);
    g.fillStyle = C.cyan;
    g.fillText(c.bot1.toFixed(1), xa - 22 * scale, py(c.bot1) + 14 * scale);
    if (u >= 1) {
      g.textAlign = 'left';
      g.fillStyle = C.amber;
      g.fillText(c.top2.toFixed(1), xb + 22 * scale, py(c.top2) + 14 * scale);
      g.fillStyle = C.cyan;
      g.fillText(c.bot2.toFixed(1), xb + 22 * scale, py(c.bot2) + 14 * scale);
    }
  }
  g.restore();
}

// Landscape: the headline column ends near x = 120 + 0.56w, so the chart (and the 80.9 / 39.0
// labels left of its first axis) starts after it, a little low so 39.0 sits below the headline
// and tagline. 4:3 is narrower: smaller labels and a narrower chart.
function coverArt(g, w, h, u) {
  const s = Math.min(w, h) / 1080;
  if (w / h > 1.5) drawSlope(g, w * 0.645, h * 0.19, w * 0.3, h * 0.58, u, { scale: s });
  else if (w > h) drawSlope(g, w * 0.655, h * 0.22, w * 0.28, h * 0.6, u, { scale: s * 0.85 });
  else drawSlope(g, w * 0.12, h * 0.48, w * 0.76, h * 0.38, u, { scale: s });
}

export function drawCoverArt(ctx, w, h) {
  drawCover(ctx, w, h, { episode: 5, title: hookTitle(), tagline: HOOK_TAGLINE, art: (g) => coverArt(g, w, h, 1) });
}

export function drawHook(ctx, t) {
  const a = t >= T.story + 0.05 ? 0 : 1 - ease.in(prog(t, T.story - 0.35, 0.4));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // Lines run from flight 1 to flight 2 over the hook; frame 0 already shows most of the drift.
  const u = 0.55 + 0.45 * ease.inOut(clamp(t / 2.6));
  const { x, y } = drawCover(ctx, W, H, { episode: 5, badge: HOOK_OPTS.badge, title: hookTitle(), tagline: HOOK_TAGLINE, art: (g) => coverArt(g, W, H, u) });
  const q = ease.outBack(prog(t, T.question, 0.45));
  if (q > 0) {
    const rich = [['你信「', C.text], ['严师出高徒', C.amber], ['」吗？', C.text]];
    ctx.save();
    ctx.font = `800 54px ${SANS}`;
    const tw = measureRich(ctx, rich);
    const pw = tw + 70;
    const ph = 92;
    ctx.translate(x + pw / 2, y + 118);
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
