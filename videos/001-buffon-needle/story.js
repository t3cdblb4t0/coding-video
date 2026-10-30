// Text-led moments: hook title, the 1777 card, the question, the mystery, reveal, twist, outro.
import { clamp, lerp, prog, ease, mulberry32, drawRich, drawStagger } from '../../engine/kit.js';
import { W, C, SANS, OLD, MONO, makeCanvas, life } from './style.js';
import { T, BEAT } from './timeline.js';

const deg = (d) => (d * Math.PI) / 180;
let st = null;

// ---------------------------------------------------------------- 18th-century card
const CARD = { w: 800, h: 980, pad: 90 };
const FIG = { x: 120, y: 420, w: 560, h: 340, seams: [505, 590, 675] };

function paper(g, w, h, rand, tone = ['#F2E8D2', '#D6C29A']) {
  const edge = [];
  const seg = 40;
  for (let i = 0; i <= seg; i++) edge.push([(w * i) / seg, (rand() - 0.5) * 6]);
  for (let i = 1; i <= seg; i++) edge.push([w + (rand() - 0.5) * 6, (h * i) / seg]);
  for (let i = seg - 1; i >= 0; i--) edge.push([(w * i) / seg, h + (rand() - 0.5) * 6]);
  for (let i = seg - 1; i > 0; i--) edge.push([(rand() - 0.5) * 6, (h * i) / seg]);
  const outline = new Path2D();
  edge.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)));
  outline.closePath();
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.7)';
  g.shadowBlur = 60;
  g.shadowOffsetY = 24;
  g.fillStyle = tone[1];
  g.fill(outline);
  g.restore();
  g.save();
  g.clip(outline);
  const base = g.createRadialGradient(w / 2, h * 0.42, 80, w / 2, h / 2, h * 0.75);
  base.addColorStop(0, tone[0]);
  base.addColorStop(1, tone[1]);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    const l = 4 + rand() * 18;
    g.strokeStyle = `rgba(110,80,40,${0.03 + rand() * 0.05})`;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 10 + rand() * 50;
    const fox = g.createRadialGradient(x, y, 0, x, y, r);
    fox.addColorStop(0, 'rgba(150,100,50,0.10)');
    fox.addColorStop(1, 'rgba(150,100,50,0)');
    g.fillStyle = fox;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (const [x0, y0, x1, y1] of [[0, 0, 0, 70], [0, h, 0, h - 70], [0, 0, 70, 0], [w, 0, w - 70, 0]]) {
    const lg = g.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, 'rgba(95,60,25,0.38)');
    lg.addColorStop(1, 'rgba(95,60,25,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
  }
  g.restore();
}

function buildBuffonCard() {
  const { w, h, pad } = CARD;
  const c = makeCanvas(w + 2 * pad, h + 2 * pad);
  const g = c.getContext('2d');
  const rand = mulberry32(1707);
  g.translate(pad, pad);
  paper(g, w, h, rand);
  g.fillStyle = C.ink;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `52px ${OLD}`;
  g.letterSpacing = '18px';
  g.fillText('ESSAI', w / 2 + 9, 132);
  g.letterSpacing = '4px';
  g.font = `66px ${OLD}`;
  g.fillText("D'ARITHMÉTIQUE", w / 2 + 2, 210);
  g.font = `56px ${OLD}`;
  g.letterSpacing = '10px';
  g.fillText('MORALE.', w / 2 + 5, 276);
  g.letterSpacing = '0px';
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(w / 2 - 170, 312);
  g.lineTo(w / 2 - 14, 312);
  g.moveTo(w / 2 + 14, 312);
  g.lineTo(w / 2 + 170, 312);
  g.stroke();
  g.beginPath();
  g.moveTo(w / 2, 304);
  g.lineTo(w / 2 + 8, 312);
  g.lineTo(w / 2, 320);
  g.lineTo(w / 2 - 8, 312);
  g.closePath();
  g.fill();
  g.font = `italic 34px ${OLD}`;
  g.fillText('par M. le Comte de Buffon', w / 2, 368);
  // A floor of parallel planks. (A stylised recreation, not a facsimile of the 1777 printing.)
  g.lineWidth = 2.2;
  g.strokeRect(FIG.x, FIG.y, FIG.w, FIG.h);
  const planks = [FIG.y, ...FIG.seams, FIG.y + FIG.h];
  for (let p = 0; p < planks.length - 1; p++) {
    for (let k = 0; k < 5; k++) {
      const yy = planks[p] + 12 + ((planks[p + 1] - planks[p] - 24) * k) / 4;
      const ph = rand() * 6;
      g.strokeStyle = 'rgba(59,46,33,0.22)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = FIG.x + 6; x <= FIG.x + FIG.w - 6; x += 8) {
        const y = yy + Math.sin(x * 0.02 + ph) * 3 + Math.sin(x * 0.07 + ph * 2) * 1.2;
        if (x === FIG.x + 6) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.strokeStyle = C.ink;
  g.lineWidth = 2.6;
  for (const y of FIG.seams) {
    g.beginPath();
    g.moveTo(FIG.x, y);
    g.lineTo(FIG.x + FIG.w, y);
    g.stroke();
  }
  g.font = `40px ${OLD}`;
  g.letterSpacing = '6px';
  g.fillText('M. DCC. LXXVII.', w / 2 + 3, 905);
  g.letterSpacing = '0px';
  return c;
}

// Lazzarini's tally, as a plain notebook page (numbers only; not a facsimile of his paper).
const NOTE = { w: 720, h: 620, pad: 90 };
function buildLazzariniCard() {
  const { w, h, pad } = NOTE;
  const c = makeCanvas(w + 2 * pad, h + 2 * pad);
  const g = c.getContext('2d');
  const rand = mulberry32(1901);
  g.translate(pad, pad);
  paper(g, w, h, rand, ['#EFE9DA', '#D3C7A8']);
  g.save();
  g.strokeStyle = 'rgba(70,90,140,0.22)';
  g.lineWidth = 1.2;
  for (let y = 150; y < h - 30; y += 52) {
    g.beginPath();
    g.moveTo(40, y);
    g.lineTo(w - 40, y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(180,68,44,0.35)';
  g.beginPath();
  g.moveTo(96, 20);
  g.lineTo(96, h - 20);
  g.stroke();
  g.restore();
  g.fillStyle = C.ink;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'center';
  g.font = `italic 46px ${OLD}`;
  g.fillText('M. Lazzarini, 1901', w / 2, 100);
  g.textAlign = 'left';
  // IM Fell has no "≈" or "π" glyphs, so the symbols use the sans face (as a hand-written mark).
  const line = (label, value, y) => {
    g.font = `52px ${SANS}`;
    g.fillText(label, 140, y);
    const w = g.measureText(label).width;
    g.font = `56px ${OLD}`;
    g.fillText(value, 140 + w, y);
  };
  line('N = ', '3408', 244);
  line('C = ', '1808', 348);
  line('π ≈ ', '3,1415929', 452);
  return c;
}

export function setupStory(state) {
  st = state;
  st.card = buildBuffonCard();
  st.note = buildLazzariniCard();
}

// ---------------------------------------------------------------- hook
function seriesTag(ctx, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 34px ${SANS}`;
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'center';
  ctx.fillStyle = C.amber;
  ctx.fillText('算给你看 · 01', W / 2 + 3, 300);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

export function drawHookTitle(ctx, t) {
  const a = 1 - ease.in(prog(t, T.hist - 0.15, 0.35));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const glow = ctx.createRadialGradient(W / 2, 800, 40, W / 2, 800, 560);
  glow.addColorStop(0, 'rgba(7,9,14,0.88)');
  glow.addColorStop(1, 'rgba(7,9,14,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 380, W, 860);
  const z = 1 + t * 0.012;
  ctx.translate(W / 2, 800);
  ctx.scale(z, z);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 24;
  ctx.font = `900 136px ${SANS}`;
  drawRich(ctx, '随手扔针', 0, -40);
  const pulse = Math.max(0, 1 - Math.abs(t - BEAT) / 0.35);
  ctx.shadowColor = `rgba(255,181,71,${0.35 + 0.6 * pulse})`;
  ctx.shadowBlur = 30 + 50 * pulse;
  drawRich(ctx, [['竟能算出 '], ['π', C.amber], [' ？']], 0, 120);
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.font = `400 38px ${SANS}`;
  drawRich(ctx, 'Can random needles reveal π?', 0, 205, { color: C.dim });
  const sub = ease.out(prog(t, 2 * BEAT, 0.4));
  if (sub > 0) {
    ctx.globalAlpha = a * sub;
    ctx.font = `700 40px ${SANS}`;
    drawRich(ctx, [['全程真实计算', C.text], ['  ·  ', C.faint], ['结尾有反转', C.amber]], 0, 300 + (1 - sub) * 14);
  }
  ctx.restore();
  seriesTag(ctx, a);
}

// ---------------------------------------------------------------- 1777 card
export function drawHistory(ctx, t) {
  const inP = ease.out(prog(t, T.hist, 0.55));
  const outP = ease.in(prog(t, T.setup - 0.3, 0.35));
  if (inP <= 0 || outP >= 1) return;
  const cy = 790 + (1 - inP) * 700 - outP * 900;
  ctx.save();
  ctx.globalAlpha = Math.min(inP * 1.6, 1) * (1 - outP);
  ctx.translate(W / 2, cy);
  ctx.rotate(deg(lerp(-6, -1.2, inP) + outP * 4));
  const sc = lerp(0.92, 1, inP);
  ctx.scale(sc, sc);
  ctx.translate(-CARD.w / 2, -CARD.h / 2);
  ctx.drawImage(st.card, -CARD.pad, -CARD.pad);

  const land = T.stickLand;
  const stick = { x: FIG.x + 300, y: FIG.seams[1] - 8, a: deg(-38), len: 150 };
  const p = prog(t, land - 0.45, 0.45);
  if (p > 0) {
    const q = p * p;
    const a = stick.a + (1 - q) * 1.1;
    const lift = (1 - q) * 120;
    const scale = lerp(1.45, 1, q);
    const dx = (Math.cos(a) * stick.len * scale) / 2;
    const dy = (Math.sin(a) * stick.len * scale) / 2;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(59,46,33,0.25)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(stick.x - dx + lift * 0.3, stick.y - dy + lift * 0.5);
    ctx.lineTo(stick.x + dx + lift * 0.3, stick.y + dy + lift * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#5A3A1E';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(stick.x - dx, stick.y - dy - lift);
    ctx.lineTo(stick.x + dx, stick.y + dy - lift);
    ctx.stroke();
    ctx.restore();
  }
  const ring = ease.out(prog(t, land + 0.25, 0.5));
  if (ring > 0) {
    ctx.save();
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(stick.x + 6, FIG.seams[1], 58, 40, deg(-8), deg(200), deg(200) + ring * Math.PI * 2.1);
    ctx.stroke();
    ctx.restore();
  }
  const ann = ease.out(prog(t, T.hist + BEAT, 0.5));
  if (ann > 0) {
    ctx.save();
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CARD.w / 2 - 175, 922);
    ctx.lineTo(CARD.w / 2 - 175 + 350 * ann, 922 - 4 * ann);
    ctx.stroke();
    ctx.globalAlpha *= ann;
    ctx.translate(CARD.w / 2 + 228, 902);
    ctx.rotate(deg(-6));
    ctx.font = `700 40px ${SANS}`;
    ctx.fillStyle = C.red;
    ctx.textAlign = 'left';
    ctx.fillText('1777', 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- question + mystery
export function drawQuestion(ctx, t) {
  const a = life(t, T.test + 0.2, T.testDrop0 + 0.2, 0.35, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 28;
  ctx.font = `800 92px ${SANS}`;
  const q = ease.outBack(prog(t, T.test + 0.9, 0.4));
  drawRich(ctx, [['压线概率 = ', C.text]], W / 2 - 60, 830);
  if (q > 0) {
    ctx.save();
    ctx.translate(W / 2 + 250, 800);
    ctx.scale(q, q);
    ctx.font = `900 150px ${SANS}`;
    drawRich(ctx, [['？', C.amber]], 0, 52);
    ctx.restore();
  }
  ctx.restore();
}

export function drawMystery(ctx, t) {
  const a = life(t, T.mystery, T.p1, 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 26;
  const z = 1 + 0.03 * prog(t, T.mystery, T.p1 - T.mystery);
  ctx.translate(W / 2, 800);
  ctx.scale(z, z);
  ctx.font = `800 200px ${MONO}`;
  const w2 = ctx.measureText('2/').width;
  const wp = ctx.measureText('π').width;
  const x0 = -(w2 + wp) / 2;
  drawRich(ctx, '2/', x0, 60, { align: 'left', color: C.text });
  const glow = 0.5 + 0.5 * Math.sin((t - T.mystery) * 5);
  ctx.shadowColor = `rgba(255,181,71,${0.5 + 0.4 * glow})`;
  ctx.shadowBlur = 40;
  drawRich(ctx, [['π', C.amber]], x0 + w2, 60, { align: 'left' });
  ctx.shadowBlur = 0;
  const ring = ease.inOut(prog(t, T.mystery + 2.5, 1.0));
  if (ring > 0) {
    ctx.save();
    ctx.setLineDash([14, 12]);
    ctx.lineDashOffset = -(t - T.mystery) * 40;
    ctx.strokeStyle = 'rgba(255,181,71,0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x0 + w2 + wp / 2, 0, 150, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.font = `600 44px ${SANS}`;
  ctx.globalAlpha = a * ease.out(prog(t, T.mystery + 0.5, 0.4));
  drawRich(ctx, '≈ 63.7%', 0, 210, { color: C.dim });
  ctx.restore();
}

// ---------------------------------------------------------------- reveal
export function drawReveal(ctx, t) {
  const a = 1 - prog(t, T.twist, 0.35);
  if (t < T.reveal || a <= 0) return;
  const err = (Math.abs(st.piFinal - Math.PI) / Math.PI) * 100;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const l0 = ease.out(prog(t, T.reveal + 0.15, 0.4));
  ctx.globalAlpha = a * l0;
  ctx.font = `500 38px ${SANS}`;
  drawRich(ctx, '用 100 万根针算出', W / 2, 640, { color: C.dim });
  const l1 = ease.out(prog(t, T.reveal + BEAT / 2, 0.4));
  ctx.globalAlpha = a * l1;
  const label = '真实值 ';
  const digits = [['3.14', C.gold], ['15926…', C.dim]];
  ctx.font = `500 46px ${SANS}`;
  const wl = ctx.measureText(label).width;
  ctx.font = `500 46px ${MONO}`;
  const wn = ctx.measureText('3.1415926…').width;
  const x = W / 2 - (wl + wn) / 2;
  const y = 900 + (1 - l1) * 16;
  ctx.font = `500 46px ${SANS}`;
  drawRich(ctx, label, x, y, { align: 'left', color: C.dim });
  ctx.font = `500 46px ${MONO}`;
  drawRich(ctx, digits, x + wl, y, { align: 'left' });
  const l2 = ease.outBack(prog(t, T.reveal + BEAT, 0.4));
  if (l2 > 0) {
    ctx.globalAlpha = a * clamp(l2);
    ctx.save();
    ctx.translate(W / 2, 1000);
    ctx.scale(l2, l2);
    ctx.font = `800 50px ${SANS}`;
    drawRich(ctx, [['误差仅 ', C.text], [`${err.toFixed(2)}%`, C.amber]], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- twist
export const TW = {
  digits: T.twist, // "only 3.14"
  table: T.twist + 3.4, // 111.4
  card: T.twist + 6.8, // 114.8
  pi: T.twist + 10.1, // 118.1
  zu: T.twist + 13.4, // 121.4
  ask: T.twist + 16.7, // 124.7
};

export function drawTwist(ctx, t) {
  if (t < T.twist || t > T.outro + 0.5) return;
  const out = 1 - prog(t, T.outro - 0.35, 0.35);
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // 1. A million needles: only 3.14 is right.
  const a1 = life(t, TW.digits, TW.card, 0.35, 0.35);
  if (a1 > 0) {
    ctx.globalAlpha = a1;
    ctx.font = `700 132px ${MONO}`;
    const s = st.piFinal.toFixed(5);
    drawRich(ctx, [['3.14', C.gold], [s.slice(4), 'rgba(244,246,250,0.35)']], W / 2, 640);
    const u = ease.out(prog(t, TW.digits + 0.4, 0.5));
    ctx.font = `700 132px ${MONO}`;
    const full = ctx.measureText(s).width;
    const good = ctx.measureText('3.14').width;
    const x0 = W / 2 - full / 2;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, 670);
    ctx.lineTo(x0 + good * u, 670);
    ctx.stroke();
    ctx.globalAlpha = a1 * u;
    ctx.font = `600 40px ${SANS}`;
    drawRich(ctx, [['100 万根针，只准到 ', C.dim], ['3.14', C.gold]], W / 2, 740);
  }
  // 2. Error shrinks like 1/sqrt(n): typical error ≈ 2.37/√n.
  const a2 = life(t, TW.table, TW.card, 0.35, 0.35);
  if (a2 > 0) {
    const rows = [
      ['1 万根', '±0.02'],
      ['100 万根', '±0.002'],
      ['1 亿根', '±0.0002'],
    ];
    ctx.globalAlpha = a2;
    ctx.font = `500 32px ${SANS}`;
    drawRich(ctx, [['典型误差', C.faint]], W / 2, 850);
    rows.forEach(([n, e], k) => {
      const r = ease.out(prog(t, TW.table + 0.25 + k * 0.35, 0.35));
      if (r <= 0) return;
      ctx.globalAlpha = a2 * r;
      const y = 920 + k * 66 + (1 - r) * 12;
      ctx.font = `600 40px ${SANS}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = C.text;
      ctx.fillText(n, W / 2 - 40, y);
      ctx.font = `600 40px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = C.amber;
      ctx.fillText(e, W / 2 + 40, y);
    });
    const r = ease.out(prog(t, TW.table + 1.6, 0.4));
    if (r > 0) {
      ctx.globalAlpha = a2 * r;
      ctx.font = `600 36px ${SANS}`;
      drawRich(ctx, [['准到 6 位小数：约 ', C.dim], ['20 万亿根', C.amber]], W / 2, 1150);
    }
  }
  // 3. Lazzarini's notebook slides in.
  const cin = ease.out(prog(t, TW.card, 0.55));
  const cout = ease.in(prog(t, TW.zu - 0.2, 0.4));
  if (cin > 0 && cout < 1) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, cin * 1.6) * (1 - cout);
    ctx.translate(W / 2 + (1 - cin) * 500, 720 - cout * 120);
    ctx.rotate(deg(lerp(5, 1.5, cin)));
    ctx.translate(-NOTE.w / 2, -NOTE.h / 2);
    ctx.drawImage(st.note, -NOTE.pad, -NOTE.pad);
    // Circle the 3.1415929 line in red when the caption gets there.
    const ring = ease.out(prog(t, TW.pi + 0.2, 0.6));
    if (ring > 0) {
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(370, 437, 270, 52, deg(-2), deg(190), deg(190) + ring * Math.PI * 2.08);
      ctx.stroke();
    }
    ctx.restore();
  }
  const pa = life(t, TW.pi, TW.zu, 0.35, 0.3);
  if (pa > 0) {
    ctx.globalAlpha = pa;
    ctx.font = `700 40px ${SANS}`;
    drawRich(ctx, [['准到小数点后 ', C.dim], ['6', C.amber], [' 位', C.dim]], W / 2, 1160);
  }
  // 4. 355/113: Zu Chongzhi's "milü".
  const za = life(t, TW.zu, T.outro, 0.4, 0.35);
  if (za > 0) {
    ctx.globalAlpha = za;
    const z = ease.outBack(prog(t, TW.zu, 0.5));
    ctx.save();
    ctx.translate(W / 2, 700);
    ctx.scale(z, z);
    ctx.shadowColor = 'rgba(255,181,71,0.45)';
    ctx.shadowBlur = 40;
    ctx.font = `800 170px ${MONO}`;
    drawRich(ctx, [['355', C.amber], ['/', C.dim], ['113', C.amber]], 0, 0);
    ctx.restore();
    ctx.font = `600 42px ${SANS}`;
    drawRich(ctx, [['祖冲之 “密率”', C.text], ['  ·  1500 多年前', C.dim]], W / 2, 800);
    ctx.font = `500 34px ${MONO}`;
    drawRich(ctx, [['355 ÷ 113 = ', C.dim], ['3.1415929…', C.text]], W / 2, 870);
    const fine = ease.out(prog(t, TW.ask, 0.5));
    if (fine > 0) {
      ctx.globalAlpha = za * fine;
      ctx.font = `400 28px ${SANS}`;
      drawRich(ctx, '他的针长 = 线距的 5/6，于是', W / 2, 990, { color: C.faint });
      drawRich(ctx, 'π ≈ 5/3 × 3408 ÷ 1808 = 355/113', W / 2, 1036, { color: C.faint });
      drawRich(ctx, '3408 = 16 × 213，1808 = 16 × 113', W / 2, 1082, { color: C.faint });
      ctx.globalAlpha = za * ease.outBack(prog(t, TW.ask + 0.4, 0.45));
      ctx.font = `700 40px ${SANS}`;
      drawRich(ctx, [['评论区说说', C.amber], ['：你怎么看？', C.text]], W / 2, 1190);
    }
  }
  ctx.restore();
  void out;
}

// ---------------------------------------------------------------- outro
export function drawOutro(ctx, t) {
  if (t < T.outro) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 22;
  ctx.font = `800 88px ${SANS}`;
  drawStagger(ctx, '随机之中，藏着确定', W / 2, 730, t, T.outro + 0.1, { stagger: 0.05, dur: 0.5 });
  ctx.globalAlpha = ease.out(prog(t, T.outro + 0.6, 0.5));
  ctx.font = `400 36px ${SANS}`;
  drawRich(ctx, 'Order, hidden in chance', W / 2, 805, { color: C.dim });
  const b = ease.outBack(prog(t, T.outro + BEAT * 1.5, 0.45));
  if (b > 0) {
    ctx.globalAlpha = clamp(b);
    ctx.save();
    ctx.translate(W / 2, 945);
    ctx.scale(b, b);
    ctx.font = `700 34px ${SANS}`;
    ctx.letterSpacing = '4px';
    const label = '算给你看 · 第 1 期';
    const w = ctx.measureText(label).width + 56;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -38, w, 70, 35);
    ctx.stroke();
    ctx.fillStyle = C.amber;
    ctx.textAlign = 'center';
    ctx.fillText(label, 2, 10);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 2, 0.5));
  ctx.font = `500 42px ${SANS}`;
  drawRich(ctx, [['下期：', C.amber], ['三门问题，换还是不换？', C.text]], W / 2, 1070);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3, 0.5));
  ctx.font = `700 40px ${SANS}`;
  drawRich(ctx, [['关注我，', C.text], ['下期继续算给你看', C.amber]], W / 2, 1160);
  ctx.globalAlpha = ease.out(prog(t, T.outro + BEAT * 3.5, 0.5)) * 0.9;
  ctx.font = `400 28px ${SANS}`;
  drawRich(ctx, '本片所有随机实验的种子均提前固定，结果未经挑选', W / 2, 1330, { color: C.faint });
  drawRich(ctx, '画面、音乐与计算均由 AI 编写的代码生成', W / 2, 1374, { color: C.faint });
  ctx.restore();
}
