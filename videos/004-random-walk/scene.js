// 004 · 喝醉的人能走回家，喝醉的鸟却可能永远迷路（随机游走）— see 分镜.md
// 1920x1080 (16:9), 30 fps, 42 bars at 100 BPM = 100.8 s (1:41). No audio track.
// First episode with the fixed series style: badge, 问→算→想 progress, ▶ sim tags, 想一想 card.
import { prog, mulberry32, drawCaption } from '../../engine/kit.js';
import { drawBadge, drawActs, drawCover } from '../../engine/brand.js';
import { drawHouse, drawBird } from './style.js';
import { W, H, C, SANS, makeCanvas } from './style.js';
import { T, buildCaptions } from './timeline.js';
import { walkHome, walkUntilHome, walkers, waitingTimes, SEEDS } from './sim.js';
import { setupHook, drawHook } from './hook.js';
import { setupStory, drawStory } from './story.js';
import { drawRules } from './rules.js';
import { setupDims, drawDims } from './dims.js';
import { setupWait, drawWait } from './wait.js';
import { drawWhy } from './why.js';
import { drawThink, drawOutro } from './think.js';

const EPISODE = 4;
const st = {};

function buildBackground() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H * 0.5, W * 0.62);
  grad.addColorStop(0, C.bg0);
  grad.addColorStop(1, C.bg1);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const rand = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 5;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Which act (0 问 / 1 算 / 2 想) and how far through it, for the progress bar.
function actAt(t) {
  const acts = [[T.hook, T.d1], [T.d1, T.think], [T.think, T.end]];
  for (let k = 0; k < acts.length; k++) {
    const [a, b] = acts[k];
    if (t < b) return [k, (t - a) / (b - a)];
  }
  return [2, 1];
}

export default {
  meta: { title: '随机游走', output: '004-随机游走.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 7e6,

  setup() {
    st.hookWalk = walkHome(SEEDS.hook, 400);
    const journey = walkUntilHome(SEEDS.hook); // ~42.6 M steps, about a second
    st.home = journey.home;
    st.far = journey.far;
    // Counted runs (no tracing) — these give every percentage on screen.
    st.s1 = walkers({ dim: 1, seed: SEEDS.d1 });
    st.s2 = walkers({ dim: 2, seed: SEEDS.d2 });
    st.s3 = walkers({ dim: 3, seed: SEEDS.d3 });
    // Sample paths for drawing only.
    st.p1 = walkers({ dim: 1, seed: SEEDS.trace1, count: 40, steps: 600, trace: 40, traceSteps: 600 });
    st.p2 = walkers({ dim: 2, seed: SEEDS.trace2, count: 14, steps: 1500, trace: 14, traceSteps: 1500 });
    st.p3 = walkers({ dim: 3, seed: SEEDS.trace3, count: 12, steps: 1500, trace: 12, traceSteps: 1500 });
    st.r1 = st.s1.rate(10000);
    st.r2 = st.s2.rate(10000);
    st.r3 = st.s3.rate(10000);
    st.wait = waitingTimes(walkers({ dim: 1, seed: SEEDS.wait, steps: 1_000_000 }));
    st.captions = buildCaptions(st);
    st.bg = buildBackground();
    setupHook(st);
    setupStory(st);
    setupDims(st);
    setupWait(st);
    console.log(
      `[scene] 1D ${(100 * st.r1).toFixed(1)}%  2D ${(100 * st.r2).toFixed(1)}%  3D ${(100 * st.r3).toFixed(1)}%  ` +
        `hook walker home at ${st.home} (far ${st.far})  1D wait median ${st.wait.median} max ${st.wait.max} still out ${st.wait.stillOut}`,
    );
  },

  // Cover image (any aspect): the real hook walk on a night grid, plus a lost bird.
  cover(ctx, { w, h }) {
    const landscape = w > h;
    drawCover(ctx, w, h, {
      episode: EPISODE,
      title: [[['喝醉的人能回家，']], [['鸟却可能'], ['永远迷路', C.amber]]],
      tagline: [['真实模拟 1 万次', 'rgba(244,246,250,0.62)'], ['  ·  ', 'rgba(244,246,250,0.36)'], ['算完了，想一想', C.amber]],
      art: (g) => {
        const cell = Math.min(w, h) / 30;
        const ox = landscape ? w * 0.72 : w * 0.5;
        const oy = landscape ? h * 0.56 : h * 0.72;
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
        g.strokeStyle = C.amber;
        g.lineWidth = Math.max(3, cell * 0.14);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.shadowColor = C.amber;
        g.shadowBlur = 14;
        g.beginPath();
        for (let k = 0; k <= 340; k++) {
          const X = ox + xs[k] * cell;
          const Y = oy - ys[k] * cell;
          if (k === 0) g.moveTo(X, Y);
          else g.lineTo(X, Y);
        }
        g.stroke();
        g.shadowBlur = 0;
        drawHouse(g, ox, oy, cell * 1.3, C.home, 1, 1);
        drawBird(g, landscape ? w * 0.86 : w * 0.82, landscape ? h * 0.2 : h * 0.47, cell * 1.8, C.violet, 0.8, 1);
      },
    });
  },

  draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.drawImage(st.bg, 0, 0);
    drawHook(ctx, t);
    drawStory(ctx, t);
    drawRules(ctx, t);
    drawDims(ctx, t);
    drawWait(ctx, t);
    drawWhy(ctx, t);
    drawThink(ctx, t);
    drawOutro(ctx, t);
    // Series chrome: badge + 问→算→想 progress (hidden on the very first beat so the hook is clean).
    const chrome = prog(t, 0.6, 0.5);
    drawBadge(ctx, EPISODE, chrome);
    const [act, u] = actAt(t);
    drawActs(ctx, act, u, chrome * (1 - prog(t, T.outro, 0.4)));
    for (const cap of st.captions) {
      drawCaption(ctx, t, cap, { x: W / 2, yZh: 980, yEn: cap.zh ? 1028 : 1000, family: SANS, zhSize: 58, enSize: cap.zh ? 32 : 36, maxWidth: 1640, dim: C.dim });
    }
    const fade = prog(t, T.end - 0.6, 0.6);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  },
};
