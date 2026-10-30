// 问: Kahneman and the flight instructor (4.8–19.2 s), then the gut feeling (19.2–24 s).
// The instructor's words are paraphrased from Kahneman's own telling (see 分镜.md).
import { clamp, lerp, prog, ease, drawRich, measureRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, SERIF, SONG, life, mark, arrow } from './style.js';
import { T } from './timeline.js';

const INK = '#2B2620';
const INK_DIM = 'rgba(43,38,32,0.62)';
const SEAL = '#B5402C';

// Top-view plane silhouette pointing along +x, centred at (0, 0) after translate/rotate.
function plane(g, x, y, s, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s / 100, s / 100);
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(0, 0, 50, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(8, -6);
  g.lineTo(-12, -46);
  g.lineTo(-24, -46);
  g.lineTo(-10, -6);
  g.moveTo(8, 6);
  g.lineTo(-12, 46);
  g.lineTo(-24, 46);
  g.lineTo(-10, 6);
  g.moveTo(-36, -4);
  g.lineTo(-48, -20);
  g.lineTo(-54, -20);
  g.lineTo(-46, -3);
  g.moveTo(-36, 4);
  g.lineTo(-48, 20);
  g.lineTo(-54, 20);
  g.lineTo(-46, 3);
  g.fill();
  g.restore();
}

function drawKahneman(ctx, t) {
  const a = life(t, T.kahneman - 0.2, T.quote + 0.2, 0.4, 0.4);
  if (a <= 0) return;
  const slide = (1 - ease.out(prog(t, T.kahneman, 0.6))) * 100;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `600 96px ${SERIF}`;
  ctx.fillStyle = C.text;
  ctx.fillText('Daniel Kahneman', 160 - slide, 400);
  ctx.font = `700 52px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.fillText('丹尼尔·卡尼曼', 166 - slide, 480);
  ctx.font = `500 40px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('1934–2024 · 心理学家', 166 - slide, 548);
  ctx.fillText('2002 年诺贝尔经济学奖', 166 - slide, 604);
  ctx.fillText('《思考，快与慢》作者', 166 - slide, 660);
  // An aerobatic loop on the right: the plane flies a dashed figure-eight.
  const cx = 1420 + slide;
  const cy = 520;
  ctx.save();
  ctx.setLineDash([14, 14]);
  ctx.strokeStyle = 'rgba(244,246,250,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k <= 200; k++) {
    const th = (k / 200) * Math.PI * 2;
    const x = cx + 300 * Math.sin(th);
    const y = cy + 170 * Math.sin(th) * Math.cos(th);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  const th = (t - T.kahneman) * 1.1;
  const px = cx + 300 * Math.sin(th);
  const py = cy + 170 * Math.sin(th) * Math.cos(th);
  const dx = 300 * Math.cos(th);
  const dy = 170 * Math.cos(2 * th);
  plane(ctx, px, py, 90, Math.atan2(dy, dx), C.amber);
  ctx.font = `500 32px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'center';
  ctx.fillText('以色列空军 · 飞行训练', cx, cy + 270);
  ctx.restore();
}

function drawQuote(ctx, t) {
  const a = life(t, T.quote - 0.1, T.turn + 0.1, 0.5, 0.35);
  if (a <= 0) return;
  const w = 1320;
  const h = 560;
  const x = (W - w) / 2;
  const y = 190 + (1 - ease.out(prog(t, T.quote - 0.1, 0.6))) * 60;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#F3ECDD');
  g.addColorStop(1, '#E4D8C0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `600 38px ${SANS}`;
  ctx.fillStyle = INK_DIM;
  ctx.fillText('一位资深飞行教官反驳卡尼曼：', x + 110, y + 92);
  ctx.strokeStyle = 'rgba(43,38,32,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 110, y + 122);
  ctx.lineTo(x + w - 110, y + 122);
  ctx.stroke();
  // A large decorative quote mark in the left margin, clear of the text.
  ctx.font = `700 150px ${SONG}`;
  ctx.fillStyle = 'rgba(181,64,44,0.22)';
  ctx.fillText('“', x + 18, y + 270);
  const line = (rich, at, yy) => {
    const r = ease.out(prog(t, at, 0.6));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.font = `700 64px ${SONG}`;
    drawRich(ctx, rich, x + 110, yy + (1 - r) * 10, { align: 'left', color: INK });
    ctx.restore();
  };
  line([['我夸过的学员，下次通常飞得'], ['更差', SEAL], ['；']], T.quote + 0.3, y + 226);
  line([['我骂过的，下次通常飞得'], ['更好', '#8A5A00'], ['。']], T.quote2, y + 326);
  line([['所以别跟我说，夸比骂管用。']], T.quote2 + 1.6, y + 426);
  ctx.font = `500 30px ${SANS}`;
  ctx.fillStyle = INK_DIM;
  ctx.textAlign = 'right';
  ctx.fillText('—— 据卡尼曼本人的讲述（意译）', x + w - 70, y + h - 40);
  ctx.restore();
}

function drawTurn(ctx, t) {
  const a = life(t, T.turn - 0.1, T.gut + 0.1, 0.35, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  const row = (y, ok, label, value, color, at) => {
    const r = ease.out(prog(t, at, 0.45));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(360, y - 85, 1200, 170, 26);
    ctx.fill();
    ctx.stroke();
    mark(ctx, 470, y, 96, ok, color, ease.out(prog(t, at + 0.2, 0.5)));
    ctx.textAlign = 'left';
    ctx.font = `600 52px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(label, 580, y + 18);
    const lw = ctx.measureText(label).width;
    ctx.font = `900 76px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(value, 580 + lw + 40, y + 24);
    ctx.restore();
  };
  row(380, true, '他看到的现象', '是真的', C.amber, T.turn);
  row(620, false, '他得出的结论', '错了', C.red, T.turn + 0.7);
  ctx.restore();
}

function drawGut(ctx, t) {
  const a = life(t, T.gut + 0.05, T.setup + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const card = (x, title, dir, verdict, color, at) => {
    const r = ease.out(prog(t, at, 0.45));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(244,246,250,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 260, 220, 520, 600, 26);
    ctx.fill();
    ctx.stroke();
    ctx.font = `800 64px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText(title, x, 320);
    arrow(ctx, x, 520, 230 * ease.out(prog(t, at + 0.2, 0.5)) + 1, dir, color, 34);
    ctx.font = `800 64px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(verdict, x, 760);
    ctx.restore();
  };
  card(560, '被夸之后', 1, '下次变差', C.amber, T.gutBars);
  card(1360, '被骂之后', -1, '下次变好', C.cyan, T.gutBars + 0.4);
  const q = ease.outBack(prog(t, T.gutBars + 1.2, 0.45));
  if (q > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(q);
    ctx.translate(960, 540);
    ctx.scale(q, q);
    ctx.font = `900 150px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('？', 0, 50);
    ctx.restore();
  }
  ctx.restore();
}

export function drawStory(ctx, t) {
  if (t < T.story - 0.1 || t > T.setup + 0.2) return;
  drawKahneman(ctx, t);
  drawQuote(ctx, t);
  drawTurn(ctx, t);
  drawGut(ctx, t);
}

export { lerp, measureRich, MONO };
