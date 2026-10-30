// 想: everyday versions (81.6–96 s) and the method (96–105.6 s).
// The three life cards are illustrations, not studies (see 分镜.md). The control-group numbers are
// from sim.controlGroup() (seed 2002), where "scolding" has no effect at all by construction.
import { clamp, lerp, prog, ease, drawRich, mulberry32 } from '../../engine/kit.js';
import { drawSimTag } from '../../engine/brand.js';
import { W, C, SANS, MONO, life, arrow, mark, numUnit } from './style.js';
import { T, gain } from './timeline.js';

let st = null;
let dots = null;
const DOTS = { cols: 50, gap: 16, cy: 590 };

export function setupLife(state) {
  st = state;
  // The worst 1,000 cadets as a 50 x 20 grid of dots; at the split each dot flies into the box of
  // the group sim.controlGroup() actually put it in (so the left box gets exactly 512).
  const inScolded = new Set(st.ctrl.scolded);
  const rows = Math.ceil(st.cad.bottom.length / DOTS.cols);
  const rand = mulberry32(5);
  dots = st.cad.bottom.map((i, k) => {
    const col = k % DOTS.cols;
    const row = Math.floor(k / DOTS.cols);
    const s = inScolded.has(i);
    return {
      row, s,
      x0: W / 2 + (col - (DOTS.cols - 1) / 2) * DOTS.gap,
      y0: DOTS.cy + (row - (rows - 1) / 2) * DOTS.gap,
      // Land in the empty band under the numbers (the gains only appear later, at T.gains).
      x1: (s ? 540 : 1380) + (rand() - 0.5) * 560,
      y1: 712 + (rand() - 0.5) * 110,
    };
  });
}

// A tiny 3-point line: extreme low (or high), then back towards normal.
function sparkline(ctx, x, y, w, h, pts, color, u) {
  ctx.save();
  ctx.strokeStyle = 'rgba(244,246,250,0.25)';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const n = pts.length - 1;
  const upto = u * n;
  for (let k = 0; k <= Math.floor(upto); k++) {
    const X = x + (k / n) * w;
    const Y = y + h / 2 - pts[k] * (h / 2);
    if (k === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  const frac = upto - Math.floor(upto);
  if (frac > 0 && Math.floor(upto) < n) {
    const k = Math.floor(upto);
    ctx.lineTo(x + ((k + frac) / n) * w, y + h / 2 - lerp(pts[k], pts[k + 1], frac) * (h / 2));
  }
  ctx.stroke();
  ctx.fillStyle = color;
  for (let k = 0; k <= Math.min(n, Math.floor(upto)); k++) {
    ctx.beginPath();
    ctx.arc(x + (k / n) * w, y + h / 2 - pts[k] * (h / 2), 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// head: the extreme moment; then: what happened after; what: the tempting conclusion. The tag on
// the extreme point names the "cause" people credit. Low extremes dip, high extremes peak.
const CARDS = [
  { head: '考砸了', then: '挨骂 → 下次考好了', what: '是骂起作用了？', pts: [0, -0.85, -0.1], color: C.cyan, tag: '挨骂' },
  { head: '病得最重时', then: '吃偏方 → 好了', what: '是偏方起作用了？', pts: [0, -0.9, -0.15], color: C.cyan, tag: '吃偏方' },
  { head: '状态最好时', then: '上封面 → 变差了', what: '是封面带来霉运？', pts: [0, 0.9, 0.2], color: C.amber, tag: '上封面' },
];

export function drawLife(ctx, t) {
  const a = life(t, T.life + 0.05, T.control + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `800 64px ${SANS}`;
  drawRich(ctx, [['它在生活里，'], ['天天骗我们', C.amber]], W / 2, 170, { align: 'center' });
  const cw = 540;
  const gap = 50;
  const x0 = (W - (3 * cw + 2 * gap)) / 2;
  CARDS.forEach((cd, k) => {
    const at = T.cards[k];
    // The three empty cards and their heads come in right after the title (on the beat), so the
    // 3 s before the first story is not a blank screen; each card fills in with its caption.
    const fr = ease.out(prog(t, T.life + 0.6 + k * 0.3, 0.5));
    if (fr <= 0) return;
    const r = ease.out(prog(t, at, 0.5));
    const x = x0 + k * (cw + gap);
    const y = 240 + (1 - fr) * 30;
    ctx.save();
    ctx.globalAlpha *= fr;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.strokeStyle = 'rgba(244,246,250,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, 600, 24);
    ctx.fill();
    ctx.stroke();
    ctx.font = `800 44px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.save();
    ctx.globalAlpha *= 0.5 + 0.5 * r; // dim until its turn
    ctx.fillText(cd.head, x + cw / 2, y + 74);
    ctx.restore();
    if (r <= 0) {
      ctx.restore();
      return;
    }
    ctx.globalAlpha *= r;
    // Sparkline band y+150..y+330 keeps clear of the head (y+74) and the text below (y+420).
    sparkline(ctx, x + 70, y + 150, cw - 140, 180, cd.pts, cd.color, ease.inOut(prog(t, at + 0.3, 1.2)));
    // Tag on the extreme point, on the side away from the line.
    const tg = ease.out(prog(t, at + 0.9, 0.4));
    if (tg > 0) {
      ctx.save();
      ctx.globalAlpha *= tg;
      const px = x + cw / 2;
      const py = y + 150 + 90 - cd.pts[1] * 90;
      ctx.font = `700 36px ${SANS}`;
      ctx.fillStyle = cd.color;
      // Below the point for both: a peak's label above it would collide with the card's head.
      ctx.fillText(cd.tag, px, py + 60);
      ctx.restore();
    }
    ctx.font = `600 36px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(cd.then, x + cw / 2, y + 450);
    ctx.font = `800 42px ${SANS}`;
    ctx.fillStyle = cd.color;
    ctx.fillText(cd.what, x + cw / 2, y + 530);
    ctx.restore();
  });
  // The summary line is in the caption ("共同点：极端之后，总会往回走"), so no in-picture duplicate.
  ctx.restore();
}

export function drawControl(ctx, t) {
  const a = life(t, T.control + 0.05, T.think + 0.1, 0.4, 0.4);
  if (a <= 0) return;
  const g = st.ctrl;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `800 60px ${SANS}`;
  drawRich(ctx, [['到底是骂的功劳，还是回归？']], W / 2, 170, { align: 'center' });
  ctx.textAlign = 'center'; // drawRich leaves it 'left'; the boxes below are centred on x
  drawSimTag(ctx, t, T.split - 0.6, T.think, `最差的 ${(g.scolded.length + g.alone.length).toLocaleString('en-US')} 人 · 随机分两组`, W / 2, 250);
  const box = (x, title, sub, m1, m2, color, at) => {
    const r = ease.out(prog(t, at, 0.5));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 340, 320, 680, 540, 26);
    ctx.fill();
    ctx.stroke();
    ctx.font = `800 60px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(title, x, 410);
    ctx.font = `500 34px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(sub, x, 466);
    // Before -> after, as two labelled numbers.
    const u = ease.inOut(prog(t, T.gains - 0.6, 1.0));
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.fillText('第一次', x - 170, 540);
    ctx.fillText('第二次', x + 170, 540);
    ctx.font = `800 64px ${MONO}`;
    ctx.fillStyle = C.text;
    ctx.fillText(m1.toFixed(1), x - 170, 612);
    // "?" until the second flight counts up, so the box never reads "39.1 -> 39.1" (no change).
    if (u > 0) ctx.fillText(lerp(m1, m2, u).toFixed(1), x + 170, 612);
    else {
      ctx.fillStyle = C.faint;
      ctx.fillText('?', x + 170, 612);
    }
    // Arrow drawn as a shape in the gap between the two numbers.
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 40, 590);
    ctx.lineTo(x + 26, 590);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 44, 590);
    ctx.lineTo(x + 20, 576);
    ctx.lineTo(x + 20, 604);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const pop = ease.outBack(prog(t, T.gains, 0.45));
    if (pop > 0) {
      ctx.save();
      ctx.globalAlpha *= clamp(pop);
      ctx.translate(x, 740);
      ctx.scale(pop, pop);
      ctx.font = `900 110px ${MONO}`;
      ctx.fillStyle = color;
      ctx.fillText(`+${gain(m1, m2)}`, 0, 0);
      ctx.restore();
      ctx.font = `600 34px ${SANS}`;
      ctx.fillStyle = C.dim;
      ctx.fillText('平均进步（分）', x, 810);
    }
    ctx.restore();
  };
  box(540, '挨骂组', `${g.scolded.length} 人`, g.scolded1, g.scolded2, C.cyan, T.split);
  box(1380, '不管组', `${g.alone.length} 人 · 谁也不理`, g.alone1, g.alone2, C.slate, T.split + 0.5);
  // Before the split: the 1,000 dots, labelled; at the split they fly into their boxes and fade.
  const lab = ease.out(prog(t, T.control + 0.9, 0.4)) * (1 - prog(t, T.split - 0.3, 0.3));
  if (lab > 0) {
    ctx.save();
    ctx.globalAlpha *= lab;
    ctx.font = `700 44px ${SANS}`;
    drawRich(ctx, [['第一次飞得最差的 10%', C.cyan], ['：1,000 人', C.text]], W / 2, 400, { align: 'center' });
    ctx.font = `500 34px ${SANS}`;
    drawRich(ctx, [[`第一次平均 ${st.cad.bot1.toFixed(1)} 分`, C.dim]], W / 2, 810, { align: 'center' });
    ctx.restore();
    ctx.textAlign = 'center';
  }
  const mv = ease.inOut(prog(t, T.split, 0.8));
  const fade = 1 - prog(t, T.split + 0.5, 0.5);
  if (fade > 0 && t >= T.control + 0.6) {
    ctx.save();
    for (const d of dots) {
      const da = ease.out(prog(t, T.control + 0.6 + d.row * 0.02, 0.3)) * fade;
      if (da <= 0) continue;
      const x = lerp(d.x0, d.x1, mv);
      const y = lerp(d.y0, d.y1, mv);
      ctx.globalAlpha = a * da;
      ctx.fillStyle = d.s || mv < 0.25 ? C.cyan : C.slate;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // "≈" in the gap between the two boxes (x 900..1020), level with the gains.
  const v = ease.outBack(prog(t, T.gains + 1.0, 0.45));
  if (v > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(v);
    ctx.font = `900 110px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText('≈', W / 2, 760);
    ctx.restore();
  }
  ctx.globalAlpha = a * ease.out(prog(t, T.split + 1.0, 0.5));
  ctx.font = `400 26px ${SANS}`;
  ctx.fillStyle = C.faint;
  ctx.fillText('模拟里，"骂"被设定为没有任何作用', W / 2, 900);
  ctx.restore();
}

export { arrow, mark, numUnit, MONO };
