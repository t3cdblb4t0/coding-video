// 第 07 期 · 背了就忘（自测 + 间隔复习）. 16:9, 30 fps, 2:12, with its own effects track (the user
// adds music). The first episode that teaches a method (user, 10-30: "我们不一定要做科普，也可以教
// 观众一些东西，核心是创造价值"). See 分镜.md for the storyboard, facts and seeds.
//   问 0-14.4: remember 8 words in 5 seconds; "I'll test you at the end". Title at 9.6.
//   算 14.4-94.8: Roediger & Karpicke 2006; Dunlosky et al. 2013; 1,000 words x 3 schedules in FSRS.
//   想 94.8-132: three steps, 想一想, the test on the 8 words, the end card.
import { prog, mulberry32 } from '../../engine/kit.js';
import { buildFilmBackground, makeDust, drawDust, drawChapter, drawFilmCaptions, drawTitleCard } from '../../engine/film.js';
import { drawCover } from '../../engine/brand.js';
import { W, H, C, SANS, SONG, life } from './style.js';
import { runMemory, RK2006, DUNLOSKY2013, N_WORDS, TEST_DAY } from './sim.js';
import { T, buildCaptions } from './timeline.js';
import { setupWords, drawOpening, drawRecall, WORDS } from './words.js';
import { setupStudy, drawExperiment, drawGrades } from './study.js';
import { setupSpacing, drawSpacing } from './spacing.js';
import { drawMethod, drawThink, drawOutro } from './method.js';
import { buildAudio } from './audio.js';

export const OPTS = { captions: true, chrome: true };
export const st = {};
export const getCaptions = () => st.captions;
export const actAt = (t) => (t < T.titleEnd ? 0 : t < T.method ? 1 : 2);

export default {
  meta: { title: '背了就忘', output: '007-背了就忘.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 9e6,
  audioPeakDb: -3,

  setup() {
    st.memory = runMemory();
    st.rk = RK2006;
    st.dunlosky = DUNLOSKY2013;
    st.nWords = N_WORDS;
    st.testDay = TEST_DAY;
    st.captions = buildCaptions(st);
    st.bg = buildFilmBackground(W, H);
    st.dust = makeDust(77, 150, W, H);
    const nParts = setupWords();
    setupStudy(st);
    setupSpacing(st);
    console.log(
      `[scene] ${nParts} word cells; ` +
        st.memory.map((m) => `${m.key} ${m.name} kept ${m.kept}/${N_WORDS} on day ${TEST_DAY}, lapses ${m.lapses}`).join('; '),
    );
  },

  async audio(octx, { duration }) {
    await buildAudio(octx, st, duration);
  },

  // Covers ask, they don't answer: a saying everyone knows, and a question mark (the formula of the
  // user's own ep05 cover, "严师出高徒 / 是错觉吗"). The art: six of the word cards, fading in
  // reading order as if being forgotten, the fifth breaking into cells, the last one a gold "?".
  cover(ctx, { w, h }) {
    const wide = w / h > 1.5;
    const landscape = w > h;
    drawCover(ctx, w, h, {
      episode: 7,
      title: [[['读书百遍，']], [['记得住', C.gold], ['吗？']]],
      tagline: '心理学实验 + 记忆模型，算给你看',
      art: (g, ww, hh) => {
        g.drawImage(buildFilmBackground(ww, hh, { cy: 0.5, seed: 9 }), 0, 0);
        const u = Math.min(ww, hh) / 1080;
        const [cols, rows] = wide || !landscape ? [3, 2] : [2, 3];
        const cw = (landscape ? (wide ? 250 : 270) : 300) * u;
        const ch = cw * 0.58;
        const gap = 26 * u;
        const gw = cols * cw + (cols - 1) * gap;
        const gh = rows * ch + (rows - 1) * gap;
        const x0 = landscape ? ww - gw - (wide ? 120 : 70) * u : (ww - gw) / 2;
        const y0 = landscape ? (hh - gh) / 2 + 20 * u : hh * 0.6;
        const alphas = [1, 0.82, 0.6, 0.4, 0.24, 1];
        const rand = mulberry32(17);
        for (let k = 0; k < 6; k++) {
          const x = x0 + (k % cols) * (cw + gap);
          const y = y0 + Math.floor(k / cols) * (ch + gap);
          const last = k === 5;
          g.save();
          g.globalAlpha = last ? 1 : alphas[k];
          g.fillStyle = last ? 'rgba(246,207,126,0.12)' : 'rgba(127,216,242,0.08)';
          g.strokeStyle = last ? 'rgba(246,207,126,0.8)' : 'rgba(127,216,242,0.6)';
          g.lineWidth = 3 * u;
          g.beginPath();
          g.roundRect(x, y, cw, ch, 18 * u);
          g.fill();
          g.stroke();
          g.font = `700 ${Math.round(cw * 0.33)}px ${SANS}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = last ? C.gold : '#FFF8EA';
          g.shadowColor = last ? 'rgba(246,207,126,0.8)' : 'rgba(127,216,242,0.55)';
          g.shadowBlur = 18 * u;
          g.fillText(last ? '？' : WORDS[k], x + cw / 2, y + ch / 2 + 4 * u);
          if (k === 4) {
            // Breaking up: cells drifting off to the upper right.
            g.shadowBlur = 0;
            g.fillStyle = '#FFF8EA';
            for (let i = 0; i < 70; i++) {
              const dx = rand() * cw * 0.9;
              const dy = -rand() * ch * 0.9;
              g.globalAlpha = 0.25 + 0.5 * rand();
              const s = (2 + 3 * rand()) * u;
              g.fillRect(x + cw * 0.3 + dx, y + ch * 0.55 + dy, s, s);
            }
          }
          g.restore();
        }
      },
    });
  },

  draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.filter = 'none';
    ctx.drawImage(st.bg, 0, 0);
    drawDust(ctx, st.dust, t, W, H, { rgb: '160,196,255', alpha: 0.3 });
    drawOpening(ctx, t);
    drawTitleCard(ctx, t, T.title, T.titleEnd, W, H, {
      title: '背了就忘',
      latin: 'RETRIEVAL  ·  SPACING',
      subtitle: [['两个被实验'], ['验证过', C.gold], ['的背法']],
      kicker: '学习方法',
    });
    drawExperiment(ctx, t);
    drawGrades(ctx, t);
    drawSpacing(ctx, t);
    drawMethod(ctx, t);
    drawThink(ctx, t);
    drawRecall(ctx, t);
    drawOutro(ctx, t);
    const fade = prog(t, T.end - 0.8, 0.8);
    if (OPTS.chrome) {
      const a = (1 - life(t, T.title - 0.1, T.titleEnd + 0.1, 0.2, 0.5)) * (1 - fade) * (t < T.outro ? 1 : 1 - prog(t, T.outro, 0.5));
      if (a > 0) {
        ctx.save();
        ctx.scale(1.3, 1.3);
        drawChapter(ctx, 7, actAt(t), a, { x: 50, y: 62 });
        ctx.restore();
      }
    }
    if (OPTS.captions) drawFilmCaptions(ctx, t, st.captions, { W, zhY: 1004, zhSize: 66 });
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};
