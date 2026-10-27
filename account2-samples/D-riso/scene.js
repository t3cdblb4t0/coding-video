// 账号 2 · 视觉样图 D —— 孔版印刷 / Riso 版式（竖屏 1080x1920，代码渲染）
// 走"乙"路线：不装手绘，玩代码真正擅长的——实色块 + 强排版 + 双色套印 + 真·半调网点/套准标。
// 选题示例：你的一生约 960 个月（每格 = 1 个月，已过完=暖红，剩下=灰蓝）。
// 渲染：node engine/render.mjs account2-samples/D-riso --preview 0 --scale 1
import { mulberry32 } from '../../engine/kit.js';
import { SONG, SANS } from '../../engine/fonts.js';

const W = 1080;
const H = 1920;
const P = {
  paper: '#EFE6D1', ink: '#211E19',
  red: '#DB4A32', redInk: 'rgba(219,74,50,0.30)',
  blue: '#5E7E96', blueSoft: 'rgba(94,126,150,0.55)',
  dim: 'rgba(33,30,25,0.6)', faint: 'rgba(33,30,25,0.4)',
};

// 暖纸底 + 不均匀纸色斑（真纸感，不是噪点）。
function paper(ctx) {
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(42);
  for (let i = 0; i < 60; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 120 + rand() * 320;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rand() > 0.5 ? 'rgba(150,132,96,0.06)' : 'rgba(255,250,236,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

// 半调网点屏：印刷质感的来源。
function halftone(ctx, pitch = 7, radius = 1.2, alpha = 0.07) {
  ctx.save();
  ctx.fillStyle = `rgba(33,30,25,${alpha})`;
  for (let y = 0, row = 0; y < H; y += pitch, row++) {
    const off = row % 2 ? pitch / 2 : 0;
    for (let x = 0; x < W; x += pitch) {
      ctx.beginPath();
      ctx.arc(x + off, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function grain(ctx) {
  const img = ctx.getImageData(0, 0, W, H);
  const rand = mulberry32(9);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 8;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// 印刷套准十字标（四角）。
function regMark(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = 'rgba(33,30,25,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y);
  ctx.moveTo(x, y - 16); ctx.lineTo(x, y + 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export default {
  meta: { title: '样图D-印刷', output: 'D-印刷.mp4' },
  width: W,
  height: H,
  fps: 30,
  duration: 0.1,
  draw(ctx) {
    paper(ctx);
    ctx.textBaseline = 'alphabetic';

    // 四角套准标 + 裁切线：一眼"印刷品"。
    [[66, 66], [W - 66, 66], [66, H - 66], [W - 66, H - 66]].forEach(([x, y]) => regMark(ctx, x, y));

    // 眉标（左上）。
    ctx.fillStyle = P.red;
    ctx.fillRect(120, 138, 24, 24);
    ctx.textAlign = 'left';
    ctx.font = `700 28px ${SANS}`;
    ctx.fillStyle = P.ink;
    ctx.letterSpacing = '5px';
    ctx.fillText('较真 · 一生有多少', 158, 159);
    ctx.letterSpacing = '0px';
    // 眉线。
    ctx.strokeStyle = 'rgba(33,30,25,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 196);
    ctx.lineTo(960, 196);
    ctx.stroke();
    // 墨色色标条（右上，印刷味）。
    ctx.fillStyle = P.red;
    ctx.fillRect(892, 128, 34, 34);
    ctx.fillStyle = P.blue;
    ctx.fillRect(930, 128, 34, 34);

    // 大标题。
    ctx.textAlign = 'left';
    ctx.font = `700 104px ${SONG}`;
    ctx.fillStyle = P.ink;
    ctx.fillText('你的一生', 120, 318);
    ctx.font = `500 44px ${SONG}`;
    ctx.fillStyle = P.dim;
    ctx.fillText('一共 960 个月。你，用掉了多少？', 124, 382);

    // ---- 人生格子图：24 列 × 40 行 = 960 个月。
    const cols = 24;
    const rows = 40;
    const pitch = 28;
    const gx = (W - (cols - 1) * pitch) / 2;
    const gy = 425;
    const r = 7.2;
    const livedRows = 15; // 约 30 岁
    const jit = mulberry32(2026);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = gx + i * pitch;
        const y = gy + j * pitch;
        if (j < livedRows) {
          // 洇墨 + 套印错位 + 墨色深浅抖动，像真印出来的红。
          ctx.fillStyle = 'rgba(219,74,50,0.14)';
          ctx.beginPath();
          ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = P.redInk;
          ctx.beginPath();
          ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.84 + jit() * 0.16;
          ctx.fillStyle = P.red;
          ctx.beginPath();
          ctx.arc(x + (jit() - 0.5) * 1.6, y + (jit() - 0.5) * 1.6, r + (jit() - 0.5) * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = 0.4 + jit() * 0.18;
          ctx.fillStyle = P.blue;
          ctx.beginPath();
          ctx.arc(x, y, r - 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    const gRight = gx + (cols - 1) * pitch;
    const gBottom = gy + (rows - 1) * pitch;

    // 分界线 + 右侧实色标签。
    const markY = gy + livedRows * pitch - pitch / 2;
    ctx.strokeStyle = P.red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx - 30, markY);
    ctx.lineTo(gRight + 22, markY);
    ctx.stroke();
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.roundRect(gRight + 22, markY - 23, 150, 46, 7);
    ctx.fill();
    ctx.fillStyle = '#FFF6EA';
    ctx.textAlign = 'center';
    ctx.font = `700 25px ${SANS}`;
    ctx.fillText('30岁·你在这', gRight + 22 + 75, markY + 8);

    // ---- 大号数字 stat bar：红、蓝并排，呼应格子（情绪冲击）。
    const sy = gBottom + 112;
    const stat = (x, num, color, label) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = color;
      ctx.font = `700 90px ${SONG}`;
      ctx.fillText(num, x, sy);
      const nw = ctx.measureText(num).width;
      ctx.fillStyle = P.dim;
      ctx.font = `500 30px ${SANS}`;
      ctx.fillText(label[0], x + nw + 12, sy - 42);
      ctx.fillText(label[1], x + nw + 12, sy - 6);
    };
    stat(150, '360', P.red, ['个月', '已过完']);
    stat(600, '600', P.blue, ['个月', '还剩下']);

    // 页脚：来源 + 想一想。
    ctx.textAlign = 'left';
    ctx.font = `400 26px ${SANS}`;
    ctx.fillStyle = P.faint;
    ctx.fillText('每格 = 1 个月 · 人均预期寿命 80 岁 ≈ 960 个月 · 来源：国家卫健委', 150, H - 118);
    ctx.font = `700 36px ${SONG}`;
    ctx.fillStyle = P.ink;
    ctx.fillText('算完了想一想：你还剩几格？', 150, H - 66);

    halftone(ctx);
    grain(ctx);
  },
};
