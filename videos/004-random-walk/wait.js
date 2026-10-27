// "Certain to return" is not "soon": the hook walker's real journey (42.6 M steps), what that means
// in time, the spread of 1D waiting times, and the punchline: the average wait is infinite.
import { clamp, prog, ease, drawRich } from '../../engine/kit.js';
import { W, C, SANS, MONO, life, drawHouse } from './style.js';
import { T } from './timeline.js';

let st = null;
export function setupWait(state) {
  st = state;
}

const fmt = (n) => Math.round(n).toLocaleString('en-US');

export function drawWait(ctx, t) {
  const a = life(t, T.wait + 0.05, T.d3 + 0.1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  // 1. "一定会回来 ≠ 很快回来"
  const r0 = ease.out(prog(t, T.wait + 0.2, 0.5));
  ctx.globalAlpha = a * r0 * (1 - ease.in(prog(t, T.waitCount0 - 0.4, 0.4)));
  ctx.font = `900 92px ${SANS}`;
  drawRich(ctx, [['一定会回来', C.text], ['  ≠  ', C.faint], ['很快回来', C.amber]], W / 2, 520);
  // 2. Step odometer for the hook walker.
  ctx.textAlign = 'center'; // drawRich leaves textAlign at 'left'
  const oa = ease.out(prog(t, T.waitCount0 - 0.2, 0.4)) * (1 - ease.in(prog(t, T.waitInf - 0.2, 0.4)));
  if (oa > 0) {
    const u = clamp((t - T.waitCount0) / (T.waitCount1 - T.waitCount0));
    const n = u >= 1 ? st.home : st.home ** ease.out(u);
    ctx.globalAlpha = a * oa;
    drawHouse(ctx, W / 2, 230, 44, C.home, 1, u >= 1 ? 1 : 0.3);
    ctx.font = `500 38px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('开头那位醉汉，第一次回到家门口时，已经走了', W / 2, 330);
    ctx.font = `900 150px ${MONO}`;
    ctx.fillStyle = u >= 1 ? C.amber : C.text;
    if (u >= 1) {
      ctx.shadowColor = 'rgba(255,181,71,0.5)';
      ctx.shadowBlur = 34;
    }
    const numW = ctx.measureText(fmt(n)).width;
    ctx.fillText(fmt(n), W / 2, 500);
    ctx.shadowBlur = 0;
    ctx.font = `600 50px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = 'left';
    ctx.fillText('步', W / 2 + numW / 2 + 20, 500);
    ctx.textAlign = 'center';
    const sub = ease.out(prog(t, T.waitCount1 + 0.2, 0.5));
    if (sub > 0) {
      ctx.globalAlpha = a * oa * sub;
      ctx.font = `600 44px ${SANS}`;
      drawRich(ctx, [['最远离家 ', C.dim], [`${fmt(st.far)} 个路口`, C.text], ['   ·   ', C.faint], ['一秒一步 ≈ ', C.dim], ['16 个月', C.amber]], W / 2, 620);
    }
    // 3. The spread of 1D waiting times (10,000 walkers, up to 1,000,000 steps).
    const sp = ease.out(prog(t, T.waitCount1 + 0.9, 0.5));
    if (sp > 0) {
      ctx.globalAlpha = a * oa * sp;
      const w = st.wait;
      // [top, number (monospace), unit (sans: the mono font has no CJK), bottom, colour]
      const cards = [
        ['一半的人', `${w.median}`, '步内', '就到家了', C.slate],
        ['最慢的那个', fmt(w.max), '步', '才到家', C.amber],
        ['100 万步时', `${w.stillOut}`, '人', '还在外面', C.red],
      ];
      const cw = 440;
      const gap = 40;
      const x0 = W / 2 - (3 * cw + 2 * gap) / 2;
      cards.forEach(([top, big, unit, bottom, color], k) => {
        const x = x0 + k * (cw + gap);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = 'rgba(244,246,250,0.16)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, 690, cw, 200, 18);
        ctx.fill();
        ctx.stroke();
        ctx.font = `500 32px ${SANS}`;
        ctx.fillStyle = C.dim;
        ctx.fillText(top, x + cw / 2, 744);
        ctx.font = `800 58px ${MONO}`;
        const bw = ctx.measureText(big).width;
        ctx.font = `700 36px ${SANS}`;
        const uw = ctx.measureText(unit).width;
        const bx = x + cw / 2 - (bw + 10 + uw) / 2;
        ctx.textAlign = 'left';
        ctx.font = `800 58px ${MONO}`;
        ctx.fillStyle = color;
        ctx.fillText(big, bx, 818);
        ctx.font = `700 36px ${SANS}`;
        ctx.fillText(unit, bx + bw + 10, 816);
        ctx.textAlign = 'center';
        ctx.font = `500 30px ${SANS}`;
        ctx.fillStyle = C.dim;
        ctx.fillText(bottom, x + cw / 2, 866);
      });
      ctx.font = `400 24px ${SANS}`;
      ctx.fillStyle = C.faint;
      ctx.fillText('另一组实验：一维 · 1 万人 · 最多走 100 万步', W / 2, 672);
    }
  }
  // 4. Punchline: the average wait is infinite.
  const inf = ease.outBack(prog(t, T.waitInf, 0.55));
  if (inf > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp(inf);
    ctx.translate(W / 2, 520);
    ctx.scale(inf, inf);
    ctx.font = `600 54px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('平均要等多久？', 0, -150);
    ctx.font = `900 300px ${SANS}`;
    ctx.fillStyle = C.amber;
    ctx.shadowColor = 'rgba(255,181,71,0.55)';
    ctx.shadowBlur = 50;
    ctx.fillText('∞', 0, 110);
    ctx.restore();
  }
  ctx.restore();
}
