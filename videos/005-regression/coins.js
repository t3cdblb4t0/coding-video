// 算: Kahneman's chalk target (62.4–74.4 s) and Galton (74.4–81.6 s). 30 people toss two coins
// each at a chalk target behind their backs (sim.coins(), seed 27): no skill, only luck.
import { clamp, lerp, prog, ease, drawRich } from '../../engine/kit.js';
import { drawSimTag } from '../../engine/brand.js';
import { W, C, SANS, MONO, SERIF, life, numUnit } from './style.js';
import { T } from './timeline.js';

const TGT = { x: 620, y: 560, cm: 2.4 }; // px per cm: 125 cm -> 300 px

let st = null;
export function setupCoins(state) {
  st = state;
}

function chalkTarget(ctx, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(120,96,70,0.12)';
  ctx.beginPath();
  ctx.arc(TGT.x, TGT.y, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.chalk;
  ctx.lineCap = 'round';
  for (const [r, w] of [[25, 6], [50, 4], [100, 4]]) {
    ctx.lineWidth = w;
    ctx.globalAlpha = a * (r === 25 ? 0.95 : 0.7);
    ctx.beginPath();
    ctx.arc(TGT.x, TGT.y, r * TGT.cm, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = a;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillStyle = 'rgba(240,240,232,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('50 厘米', TGT.x + 50 * TGT.cm + 8, TGT.y - 8);
  ctx.fillText('1 米', TGT.x + 100 * TGT.cm + 8, TGT.y - 8);
  ctx.restore();
}

function coin(ctx, x, y, color, s = 1) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawCoins(ctx, t) {
  const a = life(t, T.coins + 0.05, T.galton + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  const k = st.coin;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  chalkTarget(ctx, 1);
  drawSimTag(ctx, t, T.toss1 - 0.5, T.coinResult + 0.4, '30 人 · 背对靶子 · 各扔两枚', TGT.x, 150);
  const toss = (t0, pts, isSecond) => {
    pts.forEach(([dx, dy], i) => {
      const at = t0 + i * 0.05;
      const p = ease.out(prog(t, at, 0.35));
      if (p <= 0) return;
      const x = TGT.x + dx * TGT.cm;
      const y = TGT.y + dy * TGT.cm;
      const best = k.best.includes(i);
      const color = t >= T.coinMark ? (best ? C.amber : 'rgba(200,190,170,0.55)') : '#D8C9A6';
      ctx.save();
      ctx.globalAlpha *= p * (isSecond ? 1 : t >= T.toss2 ? (best ? 0.45 : 0.18) : 1);
      coin(ctx, lerp(TGT.x - 500, x, p), lerp(TGT.y + 420, y, p) - Math.sin(p * Math.PI) * 120, isSecond ? (best ? C.amber : 'rgba(200,190,170,0.55)') : color, isSecond ? 1 : 1);
      ctx.restore();
    });
  };
  toss(T.toss1, k.p1, false);
  // Link each best-10 first coin to its second coin.
  const link = ease.out(prog(t, T.toss2 + 1.4, 0.6));
  if (link > 0) {
    ctx.save();
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 7]);
    ctx.globalAlpha = a * link * 0.8;
    ctx.beginPath();
    for (const i of k.best) {
      const [x1, y1] = k.p1[i];
      const [x2, y2] = k.p2[i];
      ctx.moveTo(TGT.x + x1 * TGT.cm, TGT.y + y1 * TGT.cm);
      ctx.lineTo(TGT.x + x2 * TGT.cm, TGT.y + y2 * TGT.cm);
    }
    ctx.stroke();
    ctx.restore();
  }
  toss(T.toss2, k.p2, true);
  // Results on the right.
  const RX = 1130;
  const res = (y, title, m1, m2, color, at, note) => {
    const r = ease.out(prog(t, at, 0.5));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.textAlign = 'left';
    ctx.font = `700 44px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(title, RX, y);
    const numFont = `800 72px ${MONO}`;
    const unitFont = `600 36px ${SANS}`;
    let x = RX;
    x += numUnit(ctx, String(Math.round(m1)), '厘米', x, y + 100, { numFont, unitFont, numColor: C.text, unitColor: C.dim });
    ctx.font = `800 60px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText('  →  ', x, y + 96);
    x += ctx.measureText('  →  ').width;
    numUnit(ctx, String(Math.round(m2)), '厘米', x, y + 100, { numFont, unitFont, numColor: color, unitColor: C.dim });
    ctx.font = `500 32px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(note, RX, y + 156);
    ctx.restore();
  };
  ctx.font = `600 36px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'left';
  ctx.globalAlpha = a * ease.out(prog(t, T.coinMark, 0.4));
  ctx.fillText('离靶心的平均距离', RX, 300);
  ctx.globalAlpha = a;
  res(380, '第一次最近的 10 人', k.best1, k.best2, C.amber, T.coinMark + 1.4, `第二次：${k.bestWorse} 人变远`);
  res(640, '第一次最远的 10 人', k.worst1, k.worst2, C.slate, T.coinResult, `第二次：${k.worstBetter} 人变近`);
  ctx.restore();
}

export function drawGalton(ctx, t) {
  const a = life(t, T.galton + 0.05, T.life + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  const slide = (1 - ease.out(prog(t, T.galton, 0.6))) * 100;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  // Name card and the big word.
  ctx.textAlign = 'center';
  ctx.font = `900 130px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.shadowColor = 'rgba(255,181,71,0.45)';
  ctx.shadowBlur = 30;
  ctx.fillText('回归均值', W / 2, 250);
  ctx.shadowBlur = 0;
  ctx.font = `500 38px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('Regression to the mean', W / 2, 312);
  ctx.textAlign = 'left';
  ctx.font = `600 72px ${SERIF}`;
  ctx.fillStyle = C.text;
  ctx.fillText('Francis Galton', 200 - slide, 520);
  ctx.font = `700 46px ${SANS}`;
  ctx.fillStyle = C.amber;
  ctx.fillText('弗朗西斯·高尔顿', 204 - slide, 590);
  ctx.font = `500 36px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('1886 年 · 研究父母和孩子的身高', 204 - slide, 650);
  ctx.fillText('205 对父母，928 个成年子女', 204 - slide, 700);
  // Height silhouettes: tall parents, tall-but-less-tall child.
  const kids = ease.out(prog(t, T.galtonKids, 0.6));
  const ground = 800;
  const person = (x, h, color, al) => {
    if (al <= 0) return;
    ctx.save();
    ctx.globalAlpha *= al;
    ctx.fillStyle = color;
    const r = h * 0.11;
    ctx.beginPath();
    ctx.arc(x, ground - h + r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x - h * 0.13, ground - h + 2.3 * r, h * 0.26, h - 2.3 * r, h * 0.08);
    ctx.fill();
    ctx.restore();
  };
  const avgY = ground - 330;
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = 'rgba(244,246,250,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1050, avgY);
  ctx.lineTo(1780, avgY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `500 30px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.textAlign = 'right';
  ctx.fillText('平均身高', 1780, avgY - 14);
  ctx.restore();
  person(1150, 440, C.slate, 1);
  person(1290, 420, C.slate, 1);
  person(1560, lerp(330, 385, kids), C.amber, kids);
  ctx.textAlign = 'center';
  ctx.font = `600 34px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText('特别高的父母', 1220, ground + 50);
  ctx.globalAlpha = a * kids;
  ctx.fillStyle = C.amber;
  ctx.fillText('孩子：也高，但没那么高', 1560, ground + 50);
  ctx.restore();
}
