// 账号 2 · 视觉样图 C —— 绘本插画（竖屏 1080x1920，代码渲染，非 AI 生图）
// 选题示例：人的一生，睡掉 26 年。温暖、治愈、好截图，和冷科技风完全相反。
// 单帧静图。渲染：node engine/render.mjs account2-samples/C-huiben --preview 0 --scale 1
import { mulberry32 } from '../../engine/kit.js';
import { SANS } from '../../engine/fonts.js';

const W = 1080;
const H = 1920;
const P = {
  sky0: '#F4E9D0', sky1: '#E9C9A0', // 暖奶油天
  night: '#38406E', nightDk: '#2A2F56', // 下半夜色
  moon: '#FBEFC8', star: 'rgba(255,255,255,0.9)',
  skin: '#F3CDA6', hair: '#4A3A5A', blanket: '#E8936B', blanketDk: '#D97E57',
  pillow: '#FBF3E2', bed: '#A9704E', bedDk: '#8C5B3E', text: '#FBF3E2', textDim: 'rgba(251,243,226,0.72)',
  accent: '#FFC56B',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export default {
  meta: { title: '样图C-绘本', output: 'C-绘本.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: 0.1,
  draw(ctx) {
    // 天空：上暖下夜。
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.sky0);
    g.addColorStop(0.34, P.sky1);
    g.addColorStop(0.52, P.night);
    g.addColorStop(1, P.nightDk);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 星星（只画在夜空部分）。
    const rand = mulberry32(5);
    ctx.fillStyle = P.star;
    for (let i = 0; i < 46; i++) {
      const x = rand() * W;
      const y = H * 0.52 + rand() * H * 0.34;
      const r = rand() * 2.4 + 0.8;
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 月亮。
    ctx.save();
    ctx.shadowColor = 'rgba(255,230,170,0.6)';
    ctx.shadowBlur = 60;
    ctx.fillStyle = P.moon;
    ctx.beginPath();
    ctx.arc(W * 0.76, H * 0.22, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 标题（大、友好、粗黑体）。
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#4A3A2A';
    ctx.font = `800 64px ${SANS}`;
    ctx.fillText('人的一生', W / 2, 190);
    ctx.font = `500 40px ${SANS}`;
    ctx.fillStyle = 'rgba(74,58,42,0.75)';
    ctx.fillText('有多少时间，是在睡觉？', W / 2, 252);

    // 大数字。
    ctx.fillStyle = P.accent;
    ctx.save();
    ctx.shadowColor = 'rgba(255,197,107,0.5)';
    ctx.shadowBlur = 30;
    ctx.font = `900 200px ${SANS}`;
    ctx.fillText('26', W / 2, H * 0.47);
    ctx.restore();
    ctx.fillStyle = '#4A3A2A';
    ctx.font = `800 70px ${SANS}`;
    ctx.fillText('年', W / 2 + 180, H * 0.47);

    // 地面 / 房间地板。
    ctx.fillStyle = P.nightDk;
    roundRect(ctx, 0, H * 0.78, W, H * 0.22, 0);

    // 床（画面底部，一个小人在睡）。
    const bx = W / 2;
    const by = H * 0.86;
    const bw = 620;
    // 床身
    ctx.fillStyle = P.bedDk;
    roundRect(ctx, bx - bw / 2, by, bw, 220, 30);
    // 床头板
    ctx.fillStyle = P.bed;
    roundRect(ctx, bx - bw / 2, by - 70, 90, 150, 24);
    // 枕头
    ctx.fillStyle = P.pillow;
    roundRect(ctx, bx - bw / 2 + 60, by + 20, 150, 90, 24);
    // 被子
    ctx.fillStyle = P.blanket;
    roundRect(ctx, bx - bw / 2 + 150, by + 30, bw - 170, 150, 30);
    ctx.fillStyle = P.blanketDk;
    roundRect(ctx, bx - bw / 2 + 150, by + 30, bw - 170, 36, 18);
    // 头
    ctx.fillStyle = P.skin;
    ctx.beginPath();
    ctx.arc(bx - bw / 2 + 150, by + 66, 54, 0, Math.PI * 2);
    ctx.fill();
    // 头发
    ctx.fillStyle = P.hair;
    ctx.beginPath();
    ctx.arc(bx - bw / 2 + 150, by + 50, 54, Math.PI * 1.05, Math.PI * 2.1);
    ctx.fill();
    // 闭眼（一条弧）。
    ctx.strokeStyle = '#8A5A3A';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(bx - bw / 2 + 168, by + 74, 12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Z z z
    ctx.fillStyle = P.text;
    ctx.textAlign = 'left';
    ctx.font = `800 40px ${SANS}`;
    ctx.fillText('Z', bx - bw / 2 + 210, by - 10);
    ctx.font = `800 56px ${SANS}`;
    ctx.fillText('Z', bx - bw / 2 + 250, by - 50);
    ctx.font = `800 76px ${SANS}`;
    ctx.fillText('Z', bx - bw / 2 + 300, by - 100);

    // 来源小字（反营销号）。
    ctx.textAlign = 'center';
    ctx.fillStyle = P.textDim;
    ctx.font = `400 28px ${SANS}`;
    ctx.fillText('每天睡 8 小时 × 78 岁 ≈ 26 年 · 口径：成人日均睡眠', W / 2, H * 0.755);
  },
};
