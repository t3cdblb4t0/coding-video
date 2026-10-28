// 005 · 骂完就变好，是骂的功劳吗？（回归均值）— see 分镜.md
// 1920x1080 (16:9), 30 fps, 54 bars at 100 BPM = 129.6 s (2:10). No audio track.
// Built with the series style (engine/brand.js) and the first-5-seconds rules from episode 03 data.
import { prog, mulberry32, drawCaption } from '../../engine/kit.js';
import { drawBadge, drawActs } from '../../engine/brand.js';
import { W, H, C, SANS, makeCanvas } from './style.js';
import { T, buildCaptions } from './timeline.js';
import { cadets, coins, controlGroup } from './sim.js';
import { setupHook, drawHook, drawCoverArt } from './hook.js';
import { drawStory } from './story.js';
import { setupExperiment, drawExperiment } from './experiment.js';
import { setupWhy, drawWhy } from './why.js';
import { setupCoins, drawCoins, drawGalton } from './coins.js';
import { setupLife, drawLife, drawControl } from './life.js';
import { drawThink, drawOutro } from './think.js';

const EPISODE = 5;
const st = {};

// Wrappers (the 抖音竖版) can turn these off and draw their own, larger captions.
export const OPTS = { captions: true, chrome: true };
export const getCaptions = () => st.captions;

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
export function actAt(t) {
  const acts = [[T.hook, T.setup], [T.setup, T.life], [T.life, T.end]];
  for (let k = 0; k < acts.length; k++) {
    const [a, b] = acts[k];
    if (t < b) return [k, (t - a) / (b - a)];
  }
  return [2, 1];
}

export default {
  meta: { title: '回归均值', output: '005-回归均值.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 7e6,

  setup() {
    st.cad = cadets();
    st.coin = coins();
    st.ctrl = controlGroup(st.cad);
    st.captions = buildCaptions(st);
    st.bg = buildBackground();
    setupHook(st);
    setupExperiment(st);
    setupWhy(st);
    setupCoins(st);
    setupLife(st);
    const c = st.cad;
    console.log(
      `[scene] top ${c.top1.toFixed(1)} -> ${c.top2.toFixed(1)} (${(100 * c.topWorse).toFixed(1)}% worse)  ` +
        `bottom ${c.bot1.toFixed(1)} -> ${c.bot2.toFixed(1)} (${(100 * c.botBetter).toFixed(1)}% better)  ` +
        `coins ${st.coin.best1.toFixed(1)} -> ${st.coin.best2.toFixed(1)} cm  control +${st.ctrl.gainScolded.toFixed(1)} / +${st.ctrl.gainAlone.toFixed(1)}`,
    );
  },

  cover(ctx, { w, h }) {
    drawCoverArt(ctx, w, h);
  },

  draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.drawImage(st.bg, 0, 0);
    drawHook(ctx, t);
    drawStory(ctx, t);
    drawExperiment(ctx, t);
    drawWhy(ctx, t);
    drawCoins(ctx, t);
    drawGalton(ctx, t);
    drawLife(ctx, t);
    drawControl(ctx, t);
    drawThink(ctx, t);
    drawOutro(ctx, t);
    if (OPTS.chrome) {
      const chrome = prog(t, T.story, 0.5);
      drawBadge(ctx, EPISODE, chrome);
      const [act, u] = actAt(t);
      drawActs(ctx, act, u, chrome * (1 - prog(t, T.outro, 0.4)));
    }
    if (OPTS.captions) {
      for (const cap of st.captions) {
        drawCaption(ctx, t, cap, { x: W / 2, yZh: 980, yEn: cap.zh ? 1028 : 1000, family: SANS, zhSize: 58, enSize: cap.zh ? 32 : 36, maxWidth: 1640, dim: C.dim });
      }
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

export { st };
