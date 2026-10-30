// 001 · 随手扔针，竟能算出 π？ — long cut (see 分镜.md).
// 1080x1920, 30 fps, 55 bars at 100 BPM = 132 s. Every number on screen comes from sim.js.
import { prog, mulberry32, drawCaption } from '../../engine/kit.js';
import { W, H, C, SANS, makeCanvas } from './style.js';
import { T, buildCaptions } from './timeline.js';
import { simulate, simulateNoodles, simulateCircles, estimate, SEED, SEEDS, TOTAL } from './sim.js';
import { setupField, drawField, drawPanel, drawChart, COLS, ROWS, HOOK_STATIC, hookDropTimes } from './field.js';
import { setupStory, drawHookTitle, drawHistory, drawQuestion, drawMystery, drawReveal, drawTwist, drawOutro } from './story.js';
import { setupProof, drawProof, PANELS } from './proof.js';
import { buildAudio } from './audio.js';

const st = {};

// Background gradient with a little static noise baked in: it breaks up banding in the dark
// gradient without the bitrate cost of per-frame grain.
function buildBackground() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, 760, 60, W / 2, 900, 1250);
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
  const vig = g.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.45, H * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
  return c;
}

export default {
  meta: { title: '扔针算 π（长版）', output: '001-扔针算圆周率.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 5e6, // ~86 MB for 137 s: under GitHub's 100 MB per-file limit

  setup() {
    st.sim = simulate({ cols: COLS, rows: ROWS });
    st.hook = simulate({ count: HOOK_STATIC + hookDropTimes.length, seed: SEEDS.hook, cols: COLS, rows: ROWS });
    const pcols = PANELS.L.w / PANELS.S;
    st.short = simulate({ count: 1000, seed: SEEDS.short, cols: pcols, rows: 10, len: 1 });
    st.long = simulate({ count: 1000, seed: SEEDS.long, cols: pcols, rows: 10, len: 2 });
    st.noodles = simulateNoodles({ count: 1000, seed: SEEDS.noodle, cols: pcols, rows: 10, len: 2 });
    // Keep dropped circles off the intro circle's "直径 / 线距" labels and away from the right edge.
    st.circleSim = simulateCircles({ count: 30, seed: SEEDS.circle, cols: 7.2, rows: 5, avoid: [{ x0: 2.2, x1: 5.4, y0: 1.0, y1: 2.25 }] });
    st.shortAvg = st.short.cum[1000] / 1000;
    st.longAvg = st.long.cum[1000] / 1000;
    st.noodleAvg = st.noodles.cum[1000] / 1000;
    st.testCross = st.sim.cum[1000];
    st.piFinal = estimate(st.sim, TOTAL);
    st.errPct = ((Math.abs(st.piFinal - Math.PI) / Math.PI) * 100).toFixed(2);
    st.captions = buildCaptions(st);
    st.bg = buildBackground();
    setupField(st);
    setupStory(st);
    setupProof(st);
    console.log(
      `[scene] seed ${SEED}: ${TOTAL} needles, ${st.sim.cum[TOTAL]} crossings, pi ~ ${st.piFinal.toFixed(5)} (${st.errPct}%); ` +
        `test 1000 -> ${st.testCross}; avg len1 ${st.shortAvg.toFixed(3)}, len2 ${st.longAvg.toFixed(3)}, noodle ${st.noodleAvg.toFixed(3)}`,
    );
  },

  draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.drawImage(st.bg, 0, 0);
    drawField(ctx, t);
    drawHistory(ctx, t);
    drawProof(ctx, t);
    drawChart(ctx, t);
    drawHookTitle(ctx, t);
    drawQuestion(ctx, t);
    drawMystery(ctx, t);
    drawPanel(ctx, t);
    drawReveal(ctx, t);
    drawTwist(ctx, t);
    drawOutro(ctx, t);
    for (const cap of st.captions) drawCaption(ctx, t, cap, { x: W / 2, yZh: 1356, yEn: 1406, family: SANS, dim: C.dim });
    const fade = prog(t, T.end - 0.6, 0.6);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  },

  audio(octx) {
    return buildAudio(octx, st);
  },
};
