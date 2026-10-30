// 1990: the magazine column, the flood of letters, and Erdős. All illustrations, not facsimiles;
// the column text is paraphrased.
import { clamp, lerp, prog, ease, mulberry32, drawRich, fmtInt } from '../../engine/kit.js';
import { W, C, SANS, MONO, SERIF, makeCanvas, life } from './style.js';
import { T } from './timeline.js';

let st = null;
const CARD = { w: 900, h: 520, pad: 70 };
const ENV = { w: 230, h: 146, pad: 30 };

function paperCard(w, h, pad, seed, tone = ['#F3EBD8', '#DCCCAA']) {
  const c = makeCanvas(w + 2 * pad, h + 2 * pad);
  const g = c.getContext('2d');
  const rand = mulberry32(seed);
  g.translate(pad, pad);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 16;
  g.fillStyle = tone[1];
  g.fillRect(0, 0, w, h);
  g.restore();
  const base = g.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
  base.addColorStop(0, tone[0]);
  base.addColorStop(1, tone[1]);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 300; i++) {
    g.fillStyle = `rgba(110,85,50,${0.02 + rand() * 0.04})`;
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
  return { c, g };
}

function buildClipping() {
  const { w, h, pad } = CARD;
  const { c, g } = paperCard(w, h, pad, 1990);
  g.fillStyle = C.ink;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.font = `600 26px ${SERIF}`;
  g.letterSpacing = '4px';
  g.fillText('SUNDAY, SEPTEMBER 9, 1990', 60, 70);
  g.letterSpacing = '0px';
  g.fillRect(60, 88, w - 120, 3);
  g.fillRect(60, 95, w - 120, 1);
  g.font = `700 64px ${SERIF}`;
  g.fillText('Should You Switch?', 60, 170);
  g.font = `italic 400 30px ${SERIF}`;
  g.fillStyle = '#4A433B';
  const q = ['Q. Three doors: a car behind one, goats behind the others.', 'I pick door 1. The host, who knows, opens door 3: a goat.', 'He offers me door 2. Should I take it?'];
  q.forEach((line, k) => g.fillText(line, 60, 230 + k * 40));
  g.fillStyle = C.ink;
  g.font = `600 34px ${SERIF}`;
  g.fillText('A. Yes, you should switch.', 60, 380);
  g.font = `400 32px ${SERIF}`;
  g.fillText('Door 1 has a 1/3 chance. Door 2 has a 2/3 chance.', 60, 428);
  return c;
}

function buildEnvelope(kind, seed) {
  const { w, h, pad } = ENV;
  const { c, g } = paperCard(w, h, pad, seed, ['#F4EEDF', '#E1D5BA']);
  g.strokeStyle = 'rgba(90,70,40,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w / 2, h * 0.55);
  g.lineTo(w, 0);
  g.stroke();
  g.fillStyle = 'rgba(70,90,140,0.55)';
  g.fillRect(w - 46, 12, 32, 38);
  g.strokeStyle = 'rgba(70,60,40,0.35)';
  g.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.moveTo(30, h - 44 + k * 12);
    g.lineTo(130 - k * 14, h - 44 + k * 12);
    g.stroke();
  }
  g.save();
  g.translate(w * 0.52, h * 0.5);
  g.rotate(-0.16);
  g.strokeStyle = 'rgba(200,40,30,0.85)';
  g.fillStyle = 'rgba(200,40,30,0.85)';
  g.lineWidth = 4;
  const label = kind === 0 ? 'WRONG!' : kind === 1 ? '你错了！' : 'Ph.D.  WRONG';
  g.font = `900 ${kind === 2 ? 26 : 34}px ${SANS}`;
  const tw = g.measureText(label).width + 26;
  g.beginPath();
  g.roundRect(-tw / 2, -28, tw, 52, 8);
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 0, 0);
  g.restore();
  return c;
}

export function setupHistory(state) {
  st = state;
  st.clip = buildClipping();
  st.envs = [buildEnvelope(0, 1), buildEnvelope(1, 2), buildEnvelope(2, 3), buildEnvelope(0, 4)];
  const rand = mulberry32(10000);
  st.letters = Array.from({ length: 46 }, (_, k) => {
    const ang = rand() * Math.PI * 2;
    return {
      kind: k % 7 === 3 ? 2 : k % 3 === 1 ? 1 : k % 4 === 0 ? 3 : 0,
      x0: 960 + Math.cos(ang) * 1500,
      y0: 540 + Math.sin(ang) * 1000,
      x1: 260 + rand() * 1400,
      y1: 230 + rand() * 560,
      r0: (rand() - 0.5) * 3,
      r1: (rand() - 0.5) * 0.7,
      s: 0.8 + rand() * 0.35,
      t: T.letters + 0.15 + k * 0.055 + rand() * 0.05,
    };
  });
}

export function drawHistory(ctx, t) {
  if (t < T.hist - 0.1 || t > T.exp + 0.6) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Clipping slides in from the right; leaves to the left with the letters.
  const inP = ease.out(prog(t, T.clip, 0.6));
  const outP = ease.in(prog(t, T.erdos - 0.2, 0.5));
  if (inP > 0 && outP < 1) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, inP * 1.5) * (1 - outP);
    ctx.translate(960 + (1 - inP) * 1100 - outP * 1300, 470);
    ctx.rotate(lerp(0.08, -0.025, inP));
    ctx.drawImage(st.clip, -CARD.w / 2 - CARD.pad, -CARD.h / 2 - CARD.pad);
    // Highlight "2/3" in the answer line.
    const hl = ease.out(prog(t, T.twoThirds, 0.5));
    if (hl > 0) {
      ctx.font = `400 32px ${SERIF}`;
      const pre = ctx.measureText('Door 1 has a 1/3 chance. Door 2 has a ').width;
      const w23 = ctx.measureText('2/3').width;
      const x = -CARD.w / 2 + 60 + pre;
      const y = -CARD.h / 2 + 428;
      ctx.fillStyle = 'rgba(255,181,71,0.55)';
      ctx.fillRect(x - 4, y - 28, (w23 + 8) * hl, 38);
      ctx.fillStyle = C.ink;
      ctx.fillText('2/3', x, y);
    }
    ctx.restore();
  }
  // Letters pour in, with a running count.
  const la = 1 - ease.in(prog(t, T.erdos - 0.2, 0.5));
  if (t >= T.letters && la > 0) {
    for (const L of st.letters) {
      const p = ease.out(prog(t, L.t, 0.55));
      if (p <= 0) continue;
      ctx.save();
      ctx.globalAlpha = la * Math.min(1, p * 2);
      ctx.translate(lerp(L.x0, L.x1, p) - (1 - la) * 1300, lerp(L.y0, L.y1, p));
      ctx.rotate(lerp(L.r0, L.r1, p));
      ctx.scale(L.s, L.s);
      ctx.drawImage(st.envs[L.kind], -ENV.w / 2 - ENV.pad, -ENV.h / 2 - ENV.pad);
      ctx.restore();
    }
    const n = Math.round(10000 * ease.out(prog(t, T.letters + 0.2, 2.6)));
    ctx.save();
    ctx.globalAlpha = la * ease.out(prog(t, T.letters, 0.3));
    ctx.fillStyle = 'rgba(7,9,14,0.82)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 300, 62, 600, 120, 24);
    ctx.fill();
    ctx.font = `500 34px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = C.dim;
    ctx.fillText('读者来信', W / 2 - 110, 138);
    ctx.font = `700 76px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.amber;
    ctx.fillText(`≈${fmtInt(n)}`, W / 2 - 80, 148);
    ctx.restore();
  }
  // Erdős: name card + a terminal that starts a simulation.
  const ea = life(t, T.erdos, T.exp + 0.5, 0.45, 0.5);
  if (ea > 0) {
    const slide = (1 - ease.out(prog(t, T.erdos, 0.6))) * 120;
    ctx.save();
    ctx.globalAlpha = ea;
    ctx.textAlign = 'left';
    ctx.font = `600 84px ${SERIF}`;
    ctx.fillStyle = C.text;
    ctx.fillText('Paul Erdős', 200 - slide, 420);
    ctx.font = `500 38px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText('1913–1996 · 数学家', 204 - slide, 488);
    ctx.font = `400 30px ${SANS}`;
    ctx.fillStyle = C.faint;
    ctx.fillText('一生发表约 1500 篇论文', 204 - slide, 540);
    // Terminal.
    const tx = 980 + slide;
    const ty = 280;
    const tw = 760;
    const th = 380;
    ctx.fillStyle = '#0B1018';
    ctx.strokeStyle = 'rgba(150,170,200,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 16);
    ctx.fill();
    ctx.stroke();
    ['#E0563B', '#FFB547', '#5BC27A'].forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(tx + 30 + k * 26, ty + 28, 8, 0, Math.PI * 2);
      ctx.fill();
    });
    const lines = [
      ['$ ', C.dim, 'simulate --problem monty_hall', C.text],
      ['  ', C.dim, 'games: 10,000   strategies: stay / switch', C.slate],
      ['  ', C.dim, 'running…', C.amber],
    ];
    const typed = (t - T.erdos - 0.5) * 34;
    let used = 0;
    ctx.font = `500 28px ${MONO}`;
    lines.forEach(([p, pc, s, sc], k) => {
      const avail = Math.max(0, Math.min(s.length, Math.floor(typed - used)));
      used += s.length + 6;
      if (avail <= 0 && k > 0) return;
      const y = ty + 100 + k * 56;
      ctx.fillStyle = pc;
      ctx.fillText(p, tx + 32, y);
      ctx.fillStyle = sc;
      ctx.fillText(s.slice(0, avail), tx + 32 + ctx.measureText(p).width, y);
    });
    if (Math.floor(t * 2.5) % 2 === 0) {
      ctx.fillStyle = C.text;
      ctx.fillRect(tx + 32, ty + 100 + 3 * 56 - 24, 16, 28);
    }
    ctx.restore();
  }
  ctx.restore();
}

export { clamp };
