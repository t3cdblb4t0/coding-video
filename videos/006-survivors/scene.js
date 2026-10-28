// 第 06 期 · 弹孔（幸存者偏差）. 16:9, 30 fps, with its own sound-effects track (the user adds music).
// First deliverable: the 45.6-second sample (cold open, title, reveal), in the film grammar of
// engine/film.js. See 分镜.md.
import { prog } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust, drawChapter, drawFilmCaptions } from '../../engine/film.js';
import { W, H, life } from './style.js';
import { planes, PLANE_MODEL } from './sim.js';
import { T, buildCaptions } from './timeline.js';
import { setupAct1, drawAct1 } from './act1.js';
import { buildAudio } from './audio.js';

// The vertical cut turns off captions and the chapter mark (it draws its own) and sets big > 1 so
// the counter and the A/B/C tags stay readable once the frame is shrunk to 56%.
export const OPTS = { captions: true, chrome: true, big: 1 };
export const st = {};
export const getCaptions = () => st.captions;
export const actAt = (t) => [t < T.titleEnd ? 0 : 1, 0];

export default {
  meta: { title: '弹孔（样片）', output: '006-弹孔-样片.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.sampleEnd,
  bitrate: 9e6,
  audioPeakDb: -3,

  setup() {
    st.big = OPTS.big;
    st.planes = planes();
    st.model = PLANE_MODEL;
    st.captions = buildCaptions(st);
    st.bg = buildFilmBackground(W, H);
    st.dust = makeDust(66, 170, W, H);
    setupAct1(st);
    const p = st.planes;
    console.log(
      `[scene] back ${p.back.length} / ${p.all.length}, holes ${p.holesBack} seen + ${p.holesLost} lost; ` +
        `engines show ${(100 * p.engineShortfall).toFixed(1)}% fewer holes; ${(100 * p.engineHitLost).toFixed(1)}% of engine-hit planes lost`,
    );
  },

  async audio(octx, { duration }) {
    await buildAudio(octx, st, duration);
  },

  draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.filter = 'none';
    ctx.drawImage(st.bg, 0, 0);
    // Cool and faint, so the dust never reads as warm-white bullet holes.
    drawDust(ctx, st.dust, t, W, H, { rgb: '160,196,255', alpha: 0.34 });
    drawAct1(ctx, t);
    if (OPTS.chrome) {
      const [act] = actAt(t);
      const a = (1 - life(t, T.title - 0.1, T.titleEnd + 0.1, 0.2, 0.5)) * (1 - prog(t, T.sampleEnd - 0.6, 0.6));
      drawChapter(ctx, 6, act, a);
    }
    if (OPTS.captions) drawFilmCaptions(ctx, t, st.captions, { W });
  },
};
