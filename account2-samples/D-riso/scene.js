// 账号 2 · 视觉样图 D —— 印刷 / Riso 版式（竖屏 1080x1920，代码渲染）
// 走"乙"路线：不装手绘，玩代码真正擅长的——实色块 + 强排版 + 真·半调网点颗粒 + 数据母题。
// 选题示例：你的一生只有约 960 个月（每格 = 1 个月，已过完的用跳色）。
// 渲染：node engine/render.mjs account2-samples/D-riso --preview 0 --scale 1
import { mulberry32 } from '../../engine/kit.js';
import { SONG, SANS } from '../../engine/fonts.js';

const W = 1080;
const H = 1920;
const P = {
  paper: '#EFE7D3', paperDk: '#E4D9BE',
  ink: '#23201B', inkSoft: 'rgba(35,32,27,0.26)',
  spot: '#DB4A32', spotDk: '#C33D28',
  dim: 'rgba(35,32,27,0.6)', faint: 'rgba(35,32,27,0.4)',
};

// 暖纸底 + 大块不均匀的纸色斑（代替假噪点，才像真纸）。
function paper(ctx) {
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(42);
  for (let i = 0; i < 46; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 120 + rand() * 300;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.5;
    g.addColorStop(0, dark ? 'rgba(150,135,100,0.05)' : 'rgba(255,250,235,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

// 半调网点：全画面一层很细的墨点屏，印刷质感的来源。
function halftone(ctx, pitch = 7, radius = 1.15, alpha = 0.06) {
  ctx.save();
  ctx.fillStyle = `rgba(35,32,27,${alpha})`;
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
    const n = (rand() - 0.5) * 7;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
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

    // 顶部眉标（跳色小方块 + 栏目名），左上。
    ctx.fillStyle = P.spot;
    ctx.fillRect(120, 136, 24, 24);
    ctx.textAlign = 'left';
    ctx.font = `700 28px ${SANS}`;
    ctx.fillStyle = P.ink;
    ctx.letterSpacing = '5px';
    ctx.fillText('较真 · 一生有多少', 158, 157);
    ctx.letterSpacing = '0px';

    // 落款方章挪到右上，和眉标平衡（避开底部）。
    ctx.strokeStyle = P.spot;
    ctx.lineWidth = 4;
    ctx.strokeRect(W - 212, 118, 92, 92);
    ctx.fillStyle = P.spot;
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${SONG}`;
    ctx.fillText('较', W - 166, 154);
    ctx.fillText('真', W - 166, 194);

    // 大标题（宋体，编辑部感）。
    ctx.textAlign = 'left';
    ctx.font = `700 96px ${SONG}`;
    ctx.fillStyle = P.ink;
    ctx.fillText('你的一生', 120, 300);
    ctx.font = `500 46px ${SONG}`;
    ctx.fillStyle = P.dim;
    ctx.fillText('其实只有这么多个月', 124, 366);

    // ---- 人生格子图：24 列 × 40 行 = 960 个月（人均寿命 80 岁）。
    const cols = 24;
    const rows = 40;
    const pitch = 30;
    const gx = (W - (cols - 1) * pitch) / 2;
    const gy = 440;
    const r = 7.5;
    const livedRows = 15; // 约 30 岁：15 行 × 24 = 360 个月
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = gx + i * pitch;
        const y = gy + j * pitch;
        if (j < livedRows) {
          // 套印错位：先印一层偏移的淡跳色，再印实色点 —— riso 的味道。
          ctx.fillStyle = 'rgba(219,74,50,0.32)';
          ctx.beginPath();
          ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = P.spot;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = P.inkSoft;
          ctx.beginPath();
          ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const gRight = gx + (cols - 1) * pitch;
    const gBottom = gy + (rows - 1) * pitch;

    // "你在这里" 分界：横线 + 右侧实色标签（落在右边距，不压点）。
    const markY = gy + livedRows * pitch - pitch / 2;
    ctx.strokeStyle = P.spot;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx - 30, markY);
    ctx.lineTo(gRight + 24, markY);
    ctx.stroke();
    ctx.fillStyle = P.spot;
    ctx.beginPath();
    ctx.roundRect(gRight + 24, markY - 24, 150, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#FFF8EC';
    ctx.textAlign = 'center';
    ctx.font = `700 26px ${SANS}`;
    ctx.fillText('30岁·你在这', gRight + 24 + 75, markY + 9);

    // 图例（格子下方，留足空白）。
    const ly = gBottom + 70;
    ctx.fillStyle = P.spot;
    ctx.beginPath();
    ctx.arc(gx + 8, ly, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.dim;
    ctx.font = `500 30px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText('已过完 · 约 360 个月', gx + 32, ly + 10);
    ctx.fillStyle = P.inkSoft;
    ctx.beginPath();
    ctx.arc(gx + 470, ly, r - 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.dim;
    ctx.fillText('还剩 · 约 600 个月', gx + 470 + 24, ly + 10);

    // 页脚：来源 + 一句"想一想"。
    ctx.font = `400 27px ${SANS}`;
    ctx.fillStyle = P.faint;
    ctx.fillText('每格 = 1 个月 · 人均预期寿命 80 岁 ≈ 960 个月 · 来源：国家卫健委', 120, H - 150);
    ctx.font = `700 38px ${SONG}`;
    ctx.fillStyle = P.ink;
    ctx.fillText('算完了想一想：你还剩几格？', 120, H - 92);

    halftone(ctx);
    grain(ctx);
  },
};
