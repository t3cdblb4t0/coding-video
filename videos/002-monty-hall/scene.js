// 002 · 三门问题：换，还是不换？ (see 分镜.md)
// 1920x1080 (16:9), 30 fps, 55 bars at 100 BPM = 132 s. No audio track: the user adds music later.
import { prog, mulberry32, drawCaption } from '../../engine/kit.js';
import { W, H, C, SANS, makeCanvas } from './style.js';
import { T, buildCaptions } from './timeline.js';
import { playKnowingHost, playRandomHost, hundredDoors } from './sim.js';
import { drawHook, drawRules } from './story.js';
import { setupHistory, drawHistory } from './history.js';
import { setupExperiment, drawExperiment } from './experiment.js';
import { drawWorlds } from './worlds.js';
import { setupHundred, drawHundred, drawKey } from './hundred.js';
import { setupTwist, drawTwist } from './twist.js';
import { drawOutro } from './story.js';

const st = {};

function buildBackground() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, W * 0.62);
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
  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
  return c;
}

export default {
  meta: { title: '三门问题', output: '002-三门问题.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 6e6,

  setup() {
    st.main = playKnowingHost();
    st.random = playRandomHost();
    st.hundred = hundredDoors();
    const m = st.main;
    st.switchRate = (m.count - m.cumStay[m.count]) / m.count;
    const r = st.random;
    const [s, w] = [r.cum[0][r.count], r.cum[1][r.count]];
    st.rStay = s / (s + w);
    st.rSwitch = w / (s + w);
    st.keep = st.hundred.keep + 1;
    st.captions = buildCaptions(st);
    st.bg = buildBackground();
    setupHistory(st);
    setupExperiment(st);
    setupHundred(st);
    setupTwist(st);
    console.log(
      `[scene] knowing host: switch ${(100 * st.switchRate).toFixed(2)}% of ${m.count}; ` +
        `random host: stay ${(100 * st.rStay).toFixed(1)}% / switch ${(100 * st.rSwitch).toFixed(1)}% (void ${r.cum[2][r.count]}); ` +
        `100 doors: car ${st.hundred.car + 1}, kept ${st.keep}`,
    );
  },

  draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.drawImage(st.bg, 0, 0);
    drawRules(ctx, t);
    drawHook(ctx, t);
    drawHistory(ctx, t);
    drawExperiment(ctx, t);
    drawWorlds(ctx, t);
    drawHundred(ctx, t);
    drawKey(ctx, t);
    drawTwist(ctx, t);
    drawOutro(ctx, t);
    for (const cap of st.captions) {
      drawCaption(ctx, t, cap, { x: W / 2, yZh: 968, yEn: 1016, family: SANS, zhSize: 60, enSize: 32, maxWidth: 1560, dim: C.dim });
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
