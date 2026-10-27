// 账号 2 · 视觉样图 B —— 水墨国风（竖屏 1080x1920，代码渲染，非 AI 生图）
// 选题示例：你这一生，大约活多少天。目的是让人一眼看不出"这是代码视频"，而是"这画真好看"。
// 单帧静图：draw() 只在 t=0 画一次。渲染：node engine/render.mjs account2-samples/B-shuimo --preview 0 --scale 1
import { clamp, mulberry32, drawRich } from '../../engine/kit.js';
import { SONG, SANS } from '../../engine/fonts.js';

const W = 1080;
const H = 1920;
const P = {
  paper0: '#ECE3CC', paper1: '#E0D3B2', edge: '#CDBC95',
  ink: '#1B1915', ink2: 'rgba(27,25,21,0.55)', inkSoft: 'rgba(27,25,21,0.14)',
  seal: '#B23A2A', faint: 'rgba(27,25,21,0.42)',
};

// 一条从左到右、两头收尖的水墨山脊轮廓。
function ridge(ctx, baseY, amp, seed, color) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, H);
  ctx.lineTo(-40, baseY);
  let prev = baseY;
  for (let x = -40; x <= W + 40; x += 60) {
    const y = baseY - amp * (0.4 + 0.6 * rand()) * Math.sin((x / W) * Math.PI);
    ctx.quadraticCurveTo(x - 30, prev, x, y);
    prev = y;
  }
  ctx.lineTo(W + 40, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paper(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, P.paper0);
  g.addColorStop(1, P.paper1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 四角压暗，像宣纸。
  const v = ctx.createRadialGradient(W / 2, H * 0.44, 200, W / 2, H * 0.5, H * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, P.edge);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function grain(ctx) {
  const img = ctx.getImageData(0, 0, W, H);
  const rand = mulberry32(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export default {
  meta: { title: '样图B-水墨', output: 'B-水墨.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: 0.1,
  draw(ctx) {
    paper(ctx);

    // 淡墨圆月：外圈一层很淡的墨晕，内里一轮比纸更亮的月盘。
    const mx = W * 0.74;
    const my = H * 0.235;
    const wash = ctx.createRadialGradient(mx, my, 60, mx, my, 185);
    wash.addColorStop(0, 'rgba(27,25,21,0.10)');
    wash.addColorStop(0.55, 'rgba(27,25,21,0.05)');
    wash.addColorStop(1, 'rgba(27,25,21,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(mx - 200, my - 200, 400, 400);
    const disc = ctx.createRadialGradient(mx - 20, my - 20, 10, mx, my, 120);
    disc.addColorStop(0, 'rgba(250,245,230,0.95)');
    disc.addColorStop(0.75, 'rgba(244,237,214,0.82)');
    disc.addColorStop(1, 'rgba(240,232,205,0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(mx, my, 120, 0, Math.PI * 2);
    ctx.fill();

    // 远山—近山，三层，越近越浓。
    ridge(ctx, H * 0.78, 150, 11, P.inkSoft);
    ridge(ctx, H * 0.85, 190, 23, P.ink2);
    ridge(ctx, H * 0.93, 150, 31, P.ink);

    // 一叶孤舟 + 渔人（极简几笔）。
    const bx = W * 0.3;
    const by = H * 0.74;
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 46, by);
    ctx.quadraticCurveTo(bx, by + 20, bx + 46, by);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + 6, by - 2);
    ctx.lineTo(bx + 2, by - 40);
    ctx.stroke(); // 人/竿
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.arc(bx + 2, by - 48, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 标题（宋体，竖排感的横题）。
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = P.ink;
    ctx.font = `700 76px ${SONG}`;
    ctx.fillText('你这一生', W / 2, 300);
    ctx.font = `500 46px ${SONG}`;
    ctx.fillStyle = P.ink2;
    ctx.fillText('到底有多少天？', W / 2, 372);

    // 大数字（焦点）。
    ctx.fillStyle = P.ink;
    ctx.font = `700 210px ${SONG}`;
    ctx.fillText('29,200', W / 2, 620);
    ctx.font = `500 60px ${SONG}`;
    ctx.fillText('天', W / 2, 700);

    // 来源小字（反营销号的关键：标清楚怎么算的）。
    ctx.font = `400 28px ${SANS}`;
    ctx.fillStyle = P.faint;
    ctx.fillText('按人均预期寿命 80 岁估算 · 来源：国家卫健委', W / 2, 760);

    // 落款印章。
    ctx.save();
    ctx.translate(W / 2 - 150, H - 150);
    ctx.fillStyle = P.seal;
    ctx.strokeStyle = P.seal;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-52, -52, 104, 104, 10);
    ctx.stroke();
    ctx.font = `700 40px ${SONG}`;
    ctx.fillStyle = P.seal;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('较', 0, -22);
    ctx.fillText('真', 0, 24);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `500 40px ${SONG}`;
    ctx.fillStyle = P.ink2;
    ctx.fillText('算完了，想一想：', W / 2 - 70, H - 160);
    ctx.font = `400 34px ${SONG}`;
    ctx.fillText('你已经用掉了几分之几？', W / 2 - 70, H - 108);

    grain(ctx);
  },
};
