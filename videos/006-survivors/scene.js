// 第 06 期 · 弹孔（幸存者偏差）. 16:9, 30 fps, 2:14, with its own sound-effects track (the user adds
// music). Film grammar from engine/film.js; see 分镜.md for the storyboard, facts and seeds.
//   问 0-14.4: planes come home with holes; where would you put the armour? Title at 9.6.
//   算 14.4-86.4: the planes that never came back; Wald's memo; the same mistake with 10,000 people.
//   想 86.4-134.4: an old fridge, growth tips in your feed, the method, 想一想, back to the plane.
import { prog } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust, drawChapter, drawFilmCaptions } from '../../engine/film.js';
import { W, H, C, SANS, SONG, life } from './style.js';
import { planes, people, PLANE_MODEL, PEOPLE_MODEL } from './sim.js';
import { T, buildCaptions } from './timeline.js';
import { setupAct1, drawAct1, drawCoverPlane } from './act1.js';
import { setupAct2, drawAct2 } from './act2.js';
import { setupAct3, drawAct3 } from './act3.js';
import { buildAudio } from './audio.js';

export const OPTS = { captions: true, chrome: true, big: 1 };
export const st = {};
export const getCaptions = () => st.captions;
export const actAt = (t) => [t < T.titleEnd ? 0 : t < T.life ? 1 : 2, 0];

export default {
  meta: { title: '弹孔', output: '006-弹孔.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 9e6,
  audioPeakDb: -3,

  setup() {
    st.big = OPTS.big;
    st.planes = planes();
    st.model = PLANE_MODEL;
    st.people = people();
    st.peopleModel = PEOPLE_MODEL;
    st.captions = buildCaptions(st);
    st.bg = buildFilmBackground(W, H);
    st.dust = makeDust(66, 170, W, H);
    setupAct1(st);
    setupAct2(st);
    setupAct3(st);
    const p = st.planes;
    const g = st.people;
    console.log(
      `[scene] back ${p.back.length} / ${p.all.length}, holes ${p.holesBack} seen + ${p.holesLost} lost; ` +
        `engines show ${(100 * p.engineShortfall).toFixed(1)}% fewer holes; ${(100 * p.engineHitLost).toFixed(1)}% of engine-hit planes lost; ` +
        `people: top ${g.topGamblers}/${g.nTop} all in, ${(100 * g.gamblerBelowStart).toFixed(1)}% of ${g.gamblers} all-in lost (kept < 1/3), ` +
        `${(100 * g.gamblersInTop).toFixed(1)}% of all-in reached the top, all-in mean x${g.gamblerMean.toFixed(2)}, median x${g.gamblerMedian.toFixed(3)}`,
    );
  },

  async audio(octx, { duration }) {
    await buildAudio(octx, st, duration);
  },

  // Covers ask, they don't answer (the user's own ep05 cover, "严师出高徒 / 是错觉吗", is the one that
  // ran with the best numbers so far): the plane with the holes that came home, and the question.
  cover(ctx, { w, h }) {
    ctx.drawImage(buildFilmBackground(w, h, { cy: 0.5 }), 0, 0);
    const landscape = w > h;
    const u = Math.min(w, h) / 1080;
    if (landscape) drawCoverPlane(ctx, w * 0.69, h * 0.53, (w / h > 1.5 ? 0.6 : 0.47) * (h / 1080));
    else drawCoverPlane(ctx, w * 0.5, h * 0.69, 0.85 * (w / 1080));
    const x = landscape ? 110 * u : 90 * u;
    const y0 = landscape ? h * 0.3 : 230 * u;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = `600 ${Math.round(30 * u)}px ${SANS}`;
    ctx.letterSpacing = `${Math.round(6 * u)}px`;
    ctx.fillStyle = 'rgba(255,248,234,0.7)';
    ctx.fillText('算给你看 06 · 幸存者偏差', x, y0);
    ctx.letterSpacing = '0px';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24 * u;
    const big = landscape ? (w / h > 1.5 ? 116 : 96) : 128;
    ctx.font = `700 ${Math.round(big * 0.66 * u)}px ${SONG}`;
    ctx.fillStyle = C.text;
    ctx.fillText('弹孔最多的地方，', x, y0 + big * 0.95 * u);
    ctx.font = `700 ${Math.round(big * u)}px ${SONG}`;
    const l1 = '该加';
    ctx.fillText(l1, x, y0 + big * 2.1 * u);
    const w1 = ctx.measureText(l1).width;
    ctx.fillStyle = C.gold;
    ctx.fillText('装甲', x + w1, y0 + big * 2.1 * u);
    const w2 = ctx.measureText('装甲').width;
    ctx.fillStyle = C.text;
    ctx.fillText('吗？', x + w1 + w2, y0 + big * 2.1 * u);
    ctx.shadowBlur = 0;
    ctx.font = `500 ${Math.round(36 * u)}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,248,234,0.7)';
    ctx.fillText('A 机翼 · B 机身 · C 发动机', x, y0 + big * 2.1 * u + 76 * u);
    ctx.restore();
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
    drawAct2(ctx, t);
    drawAct3(ctx, t);
    const fade = prog(t, T.end - 0.8, 0.8);
    if (OPTS.chrome) {
      const [act] = actAt(t);
      const a = (1 - life(t, T.title - 0.1, T.titleEnd + 0.1, 0.2, 0.5)) * (1 - fade);
      drawChapter(ctx, 6, act, a);
    }
    if (OPTS.captions) drawFilmCaptions(ctx, t, st.captions, { W });
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};

