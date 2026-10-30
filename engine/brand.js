// 「算给你看」series brand kit (from episode 04 on): corner badge, 问→算→想 progress bar,
// the "▶ 模拟 N 次" tag, and the 「算完了，想一想」 reflection card. Landscape layout (1920x1080).
import { clamp, prog, ease, drawRich, measureRich } from './kit.js';
import { SANS, MONO, SONG } from './fonts.js';

export const BRAND = {
  amber: '#FFB547', text: '#F4F6FA', dim: 'rgba(244,246,250,0.62)', faint: 'rgba(244,246,250,0.36)',
  paper0: '#F3ECDD', paper1: '#E4D8C0', ink: '#2B2620', inkDim: 'rgba(43,38,32,0.62)', seal: '#B5402C',
};

export const ACTS = ['问', '算', '想'];

// Top-left: 「算给你看 · 04」. alpha lets scenes hide it (e.g. on the cover frame it is part of the title).
export function drawBadge(ctx, episode, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND.amber;
  ctx.beginPath();
  ctx.roundRect(60, 48, 8, 34, 4);
  ctx.fill();
  ctx.font = `700 28px ${SANS}`;
  ctx.letterSpacing = '4px';
  ctx.fillStyle = BRAND.text;
  ctx.fillText('算给你看', 82, 76);
  const w = ctx.measureText('算给你看').width;
  ctx.letterSpacing = '0px';
  ctx.font = `600 26px ${MONO}`;
  ctx.fillStyle = BRAND.amber;
  ctx.fillText(String(episode).padStart(2, '0'), 82 + w + 14, 76);
  ctx.restore();
}

// Top-right: 问 — 算 — 想, current act highlighted; `u` in [0, 1] is progress within the act.
export function drawActs(ctx, act, u = 0, alpha = 1, { x0 = 1560, y = 64, gap = 120 } = {}) {
  if (alpha <= 0 || act < 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  for (let k = 0; k < ACTS.length - 1; k++) {
    const xa = x0 + k * gap + 26;
    const xb = x0 + (k + 1) * gap - 26;
    ctx.strokeStyle = 'rgba(244,246,250,0.18)';
    ctx.beginPath();
    ctx.moveTo(xa, y);
    ctx.lineTo(xb, y);
    ctx.stroke();
    const fill = k < act ? 1 : k === act ? clamp(u) : 0;
    if (fill > 0) {
      ctx.strokeStyle = BRAND.amber;
      ctx.beginPath();
      ctx.moveTo(xa, y);
      ctx.lineTo(xa + (xb - xa) * fill, y);
      ctx.stroke();
    }
  }
  ACTS.forEach((s, k) => {
    const x = x0 + k * gap;
    const on = k === act;
    const done = k < act;
    ctx.fillStyle = on ? BRAND.amber : done ? 'rgba(255,181,71,0.22)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = on || done ? BRAND.amber : 'rgba(244,246,250,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `800 24px ${SANS}`;
    ctx.fillStyle = on ? '#14110C' : done ? BRAND.amber : BRAND.faint;
    ctx.fillText(s, x, y + 1);
  });
  ctx.restore();
}

// The "▶ 模拟 10,000 次" tag that marks every big simulation. Pops in at t0, stays until t1.
export function drawSimTag(ctx, t, t0, t1, label, x, y) {
  const a = Math.min(ease.outBack(prog(t, t0, 0.4)), 1 - ease.in(prog(t, t1 - 0.3, 0.3)));
  if (a <= 0 || t < t0 || t > t1) return;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  ctx.translate(x, y);
  ctx.scale(clamp(a, 0, 1.08), clamp(a, 0, 1.08));
  ctx.font = `700 30px ${SANS}`;
  const w = ctx.measureText(label).width + 86;
  ctx.fillStyle = 'rgba(255,181,71,0.14)';
  ctx.strokeStyle = BRAND.amber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -28, w, 56, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = BRAND.amber;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 26, -11);
  ctx.lineTo(-w / 2 + 26, 11);
  ctx.lineTo(-w / 2 + 44, 0);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, -w / 2 + 58, 1);
  ctx.restore();
}

// Series cover, any aspect ratio. art(ctx, w, h) paints a full-bleed picture; the title block goes
// on the left (landscape) or top (portrait) over a dark gradient. title: array of rich-text lines.
export function drawCover(ctx, w, h, { episode, title, tagline, art, bg = ['#141C30', '#06080F'], badge = true }) {
  const landscape = w > h;
  const g0 = ctx.createRadialGradient(w * 0.6, h * 0.5, 40, w * 0.6, h * 0.5, Math.max(w, h) * 0.8);
  g0.addColorStop(0, bg[0]);
  g0.addColorStop(1, bg[1]);
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  art(ctx, w, h);
  ctx.restore();
  const shade = landscape ? ctx.createLinearGradient(0, 0, w * 0.75, 0) : ctx.createLinearGradient(0, 0, 0, h * 0.62);
  shade.addColorStop(0, 'rgba(6,8,15,0.94)');
  shade.addColorStop(0.55, 'rgba(6,8,15,0.75)');
  shade.addColorStop(1, 'rgba(6,8,15,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 1080;
  const x = (landscape ? 120 : 90) * unit;
  let y = (landscape ? h * 0.3 : 170 * unit);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (badge) {
    ctx.fillStyle = BRAND.amber;
    ctx.beginPath();
    ctx.roundRect(x, y - 40 * unit, 10 * unit, 46 * unit, 5 * unit);
    ctx.fill();
    ctx.font = `700 ${Math.round(40 * unit)}px ${SANS}`;
    ctx.letterSpacing = `${Math.round(6 * unit)}px`;
    ctx.fillStyle = BRAND.text;
    ctx.fillText('算给你看', x + 28 * unit, y);
    const kw = ctx.measureText('算给你看').width;
    ctx.letterSpacing = '0px';
    ctx.font = `600 ${Math.round(38 * unit)}px ${MONO}`;
    ctx.fillStyle = BRAND.amber;
    ctx.fillText(String(episode).padStart(2, '0'), x + 28 * unit + kw + 18 * unit, y);
  }
  y += 60 * unit;
  const maxW = (landscape ? w * 0.56 : w - 2 * x);
  let size = Math.round((landscape ? 118 : 124) * unit);
  ctx.font = `900 ${size}px ${SANS}`;
  const widest = Math.max(...title.map((ln) => measureRich(ctx, ln)));
  if (widest > maxW) size = Math.floor((size * maxW) / widest);
  ctx.font = `900 ${size}px ${SANS}`;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 24 * unit;
  for (const ln of title) {
    y += size * 1.16;
    drawRich(ctx, ln, x, y, { align: 'left', color: BRAND.text });
  }
  ctx.shadowBlur = 0;
  if (tagline) {
    y += 76 * unit;
    ctx.font = `600 ${Math.round(40 * unit)}px ${SANS}`;
    drawRich(ctx, tagline, x, y, { align: 'left', color: BRAND.dim });
  }
  return { x, y, unit }; // left edge and last baseline, so callers can stack more below
}

// 「算完了，想一想」: a warm paper page with serif type. lines: [{ text: rich, at: seconds }], plus an
// optional question. The card slides up at t0 and out at t1.
export function drawThinkCard(ctx, t, { t0, t1, lines, question = null, questionAt = null, episode }) {
  const inP = ease.out(prog(t, t0, 0.7));
  const outP = ease.in(prog(t, t1 - 0.4, 0.4));
  if (inP <= 0 || outP >= 1) return;
  const W = 1920;
  const cw = 1320;
  const ch = 760;
  const x = (W - cw) / 2;
  const y = 120 + (1 - inP) * 80;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, inP * 1.3) * (1 - outP);
  // Page.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  const grad = ctx.createLinearGradient(x, y, x, y + ch);
  grad.addColorStop(0, BRAND.paper0);
  grad.addColorStop(1, BRAND.paper1);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, cw, ch, 10);
  ctx.fill();
  ctx.restore();
  // Header: column title + seal with the episode number.
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND.ink;
  ctx.font = `700 46px ${SONG}`;
  ctx.fillText('算完了，想一想', x + 90, y + 120);
  ctx.fillStyle = BRAND.inkDim;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText('THINK IT OVER', x + 92, y + 162);
  ctx.save();
  ctx.translate(x + cw - 150, y + 100);
  ctx.rotate(-0.06);
  ctx.strokeStyle = BRAND.seal;
  ctx.fillStyle = BRAND.seal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-48, -48, 96, 96, 10);
  ctx.stroke();
  ctx.font = `700 30px ${SONG}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('第', 0, -18);
  ctx.font = `700 34px ${MONO}`;
  ctx.fillText(String(episode).padStart(2, '0'), 0, 20);
  ctx.restore();
  ctx.strokeStyle = 'rgba(43,38,32,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 90, y + 196);
  ctx.lineTo(x + cw - 90, y + 196);
  ctx.stroke();
  // Body lines appear one by one.
  ctx.textAlign = 'left';
  lines.forEach((ln, k) => {
    const r = ease.out(prog(t, ln.at, 0.6));
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= r;
    ctx.font = `${ln.weight ?? 500} ${ln.size ?? 48}px ${SONG}`;
    drawRich(ctx, ln.text, x + 90, y + 272 + k * 86 + (1 - r) * 10, { align: 'left', color: BRAND.ink });
    ctx.restore();
  });
  if (question && questionAt !== null) {
    const r = ease.out(prog(t, questionAt, 0.6));
    if (r > 0) {
      ctx.save();
      ctx.globalAlpha *= r;
      ctx.fillStyle = 'rgba(181,64,44,0.08)';
      ctx.beginPath();
      ctx.roundRect(x + 70, y + ch - 190, cw - 140, 130, 12);
      ctx.fill();
      // Shrink the question to fit inside the box.
      let size = 44;
      ctx.font = `700 ${size}px ${SONG}`;
      const qw = measureRich(ctx, question);
      if (qw > cw - 200) size = Math.floor((size * (cw - 200)) / qw);
      ctx.font = `700 ${size}px ${SONG}`;
      drawRich(ctx, question, x + cw / 2, y + ch - 110, { align: 'center', color: BRAND.seal });
      ctx.restore();
    }
  }
  ctx.restore();
}
