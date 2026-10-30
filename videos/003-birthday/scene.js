// 003 · 你们班，有没有两个人同一天生日？（生日问题）— see 分镜.md
// 1920x1080 (16:9), 30 fps, 32 bars at 100 BPM = 76.8 s (~1:17). No audio track.
import { prog, mulberry32, drawCaption } from '../../engine/kit.js';
import { drawCover } from '../../engine/brand.js';
import { W, H, C, SANS, makeCanvas, drawPerson } from './style.js';
import { T, BEAT, buildCaptions } from './timeline.js';
import { classroom, rooms, exact, sameAsYou } from './sim.js';
import { setupClassroom, drawHook, drawCallback } from './classroom.js';
import { drawChoice } from './choice.js';
import { setupRoom, drawRoom } from './room.js';
import { setupRooms, drawRooms } from './rooms.js';
import { setupWhy, drawWhy } from './why.js';
import { setupTwist, drawTwist } from './twist.js';
import { drawWorld } from './world.js';
import { drawOutro } from './outro.js';

const st = {};

function buildBackground() {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * 0.4, 60, W / 2, H * 0.5, W * 0.62);
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
  meta: { title: '生日问题', output: '003-生日问题.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: T.end,
  bitrate: 6e6,

  setup() {
    st.cls = classroom();
    st.rooms = rooms();
    st.exact = exact;
    st.sameAsYou = sameAsYou;
    let cross = 1;
    while (st.rooms.rate(cross) < 0.5) cross++;
    st.cross50 = cross;
    st.p50 = st.rooms.rate(50);
    st.p57 = st.rooms.rate(57);
    st.captions = buildCaptions(st);
    st.bg = buildBackground();
    setupClassroom(st);
    setupRoom(st);
    setupRooms(st);
    setupWhy(st);
    setupTwist(st);
    console.log(
      `[scene] class pairs ${st.cls.pairs.length}; rooms cross 50% at N=${st.cross50}; ` +
        `P(23)=${(100 * st.rooms.rate(23)).toFixed(1)}% P(50)=${(100 * st.p50).toFixed(1)}% P(57)=${(100 * st.p57).toFixed(1)}%`,
    );
  },

  // Cover image (any aspect): the real 50-seat class from the hook, with its matches lit.
  cover(ctx, { w, h }) {
    const landscape = w > h;
    drawCover(ctx, w, h, {
      episode: 3,
      title: [[['你们班，有没有']], [['两个人'], ['同一天生日', C.amber], ['？']]],
      tagline: [['50 人的班，概率 ', 'rgba(244,246,250,0.62)'], ['97%', C.amber], ['  ·  真实模拟 1 万次', 'rgba(244,246,250,0.36)']],
      bg: [C.bg0, C.bg1],
      art: (g) => {
        const area = landscape ? { x: w * 0.5, y: h * 0.16, w: w * 0.46, h: h * 0.72 } : { x: w * 0.06, y: h * 0.5, w: w * 0.88, h: h * 0.44 };
        const pw = area.w / 10;
        const ph = area.h / 5;
        const centre = (i) => [area.x + (i % 10) * pw + pw / 2, area.y + Math.floor(i / 10) * ph + ph / 2];
        const lit = new Map();
        st.clsGroups.forEach((grp) => grp.seats.forEach((i) => lit.set(i, grp.color)));
        g.lineWidth = Math.max(3, pw * 0.04);
        st.clsGroups.forEach((grp) => {
          g.strokeStyle = grp.color;
          g.globalAlpha = 0.75;
          g.beginPath();
          for (let k = 1; k < grp.seats.length; k++) {
            const [x0, y0] = centre(grp.seats[k - 1]);
            const [x1, y1] = centre(grp.seats[k]);
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
          }
          g.stroke();
        });
        g.globalAlpha = 1;
        for (let i = 0; i < 50; i++) {
          const [x, y] = centre(i);
          const color = lit.get(i);
          if (color) {
            g.save();
            g.shadowColor = color;
            g.shadowBlur = pw * 0.35;
          }
          drawPerson(g, x, y + ph * 0.3, ph * 0.58, color ?? 'rgba(142,162,192,0.45)', 1);
          if (color) g.restore();
        }
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
    drawChoice(ctx, t);
    drawRoom(ctx, t);
    drawRooms(ctx, t);
    drawCallback(ctx, t);
    drawWhy(ctx, t);
    drawTwist(ctx, t);
    drawWorld(ctx, t);
    drawOutro(ctx, t);
    for (const cap of st.captions) {
      drawCaption(ctx, t, cap, { x: W / 2, yZh: 980, yEn: 1028, family: SANS, zhSize: 60, enSize: 32, maxWidth: 1600, dim: C.dim });
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
