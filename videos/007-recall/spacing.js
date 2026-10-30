// 算 · 间隔: 1,000 new words on each of three review schedules, run through the FSRS model for 30
// days. A cell is one word: lit while it would still come back, dark once it is lost. On a review
// day every word is tested: the ones that come back flash white, the lost ones flash red (look at
// the answer, learn it again). Day 30 is the test.
import { clamp, lerp, prog, ease } from '../../engine/kit.js';
import { W, C, SANS, MONO, card, label, life, rgba, countUp } from './style.js';
import { T, dayAt, timeOfDay } from './timeline.js';
import { wordOn } from './sim.js';

const XS = [360, 960, 1560];
const COLS = 40;
const ROWS = 25;
const P = 12; // pitch
const CS = 10; // cell size
const GW = COLS * P;
const GH = ROWS * P;
const GY = 340;
const CAL_Y = 694;
const NUM_Y = 864;

let st = null;
let reviewTimes = null; // per schedule: [time of each review]
export function setupSpacing(s) {
  st = s;
  reviewTimes = s.memory.map((sch) => sch.days.map((d, k) => (d === 0 ? T.run0 + k * 0.25 : timeOfDay(d, s.testDay))));
}

function panelFrame(ctx, k, a) {
  const x0 = XS[k] - GW / 2;
  ctx.save();
  ctx.globalAlpha *= a;
  card(ctx, x0 - 18, GY - 18, GW + 36, GH + 36, { r: 16, fill: 'rgba(255,248,234,0.03)', stroke: 'rgba(255,248,234,0.16)', lw: 2 });
  ctx.restore();
}

function drawCells(ctx, t, k, alpha) {
  const sch = st.memory[k];
  const x0 = XS[k] - GW / 2;
  const d = dayAt(t, st.testDay);
  const tested = t >= T.test;
  const dev = prog(t, T.cells, 1.2); // cells develop in a sweep, top-left to bottom-right
  const times = reviewTimes[k];
  // Which review (if any) is flashing now.
  let flash = -1;
  let fu = 0;
  times.forEach((tr, j) => {
    if (t >= tr && t < tr + 0.5) {
      flash = j;
      fu = (t - tr) / 0.5;
    }
  });
  const classes = { on: [], off: [], ok: [], lapse: [], gold: [], gone: [] };
  for (let i = 0; i < sch.words.length; i++) {
    const c = i % COLS;
    const r = (i / COLS) | 0;
    // Before the sweep reaches it, a word is an empty slot.
    if ((c + r) / (COLS + ROWS) > dev * 1.05) {
      classes.off.push(i);
      continue;
    }
    const wd = sch.words[i];
    let cls;
    if (tested) cls = wd.remembered ? 'gold' : 'gone';
    else if (flash >= 0) cls = wd.events[flash].ok ? 'ok' : 'lapse';
    else cls = wordOn(wd, d) ? 'on' : 'off';
    classes[cls].push(i);
  }
  const fill = (list, style, glow = 0, glowColor = null) => {
    if (!list.length) return;
    ctx.save();
    ctx.fillStyle = style;
    if (glow) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glow;
    }
    ctx.beginPath();
    for (const i of list) ctx.rect(x0 + (i % COLS) * P, GY + ((i / COLS) | 0) * P, CS, CS);
    ctx.fill();
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha *= alpha;
  const fade = 1 - fu;
  fill(classes.off, 'rgba(127,216,242,0.09)');
  fill(classes.gone, 'rgba(255,248,234,0.06)');
  fill(classes.on, rgba(C.ice, 0.88), 6, rgba(C.ice, 0.6));
  fill(classes.ok, `rgba(${Math.round(lerp(255, 127, fu))},${Math.round(lerp(255, 216, fu))},${Math.round(lerp(255, 242, fu))},${lerp(1, 0.88, fu)})`, 10 * fade, 'rgba(255,255,255,0.8)');
  fill(classes.lapse, rgba(C.red, lerp(1, 0.85, fu)), 12 * fade, rgba(C.red, 0.9));
  const gu = ease.out(prog(t, T.test, 0.5));
  fill(classes.gold, `rgba(246,207,126,${lerp(0.5, 0.95, gu)})`, 8, 'rgba(246,207,126,0.7)');
  ctx.restore();
}

function calendar(ctx, t, k, a) {
  const sch = st.memory[k];
  const x0 = XS[k] - GW / 2;
  const days = st.testDay;
  const xd = (d) => x0 + (d / days) * GW;
  const intro = ease.out(prog(t, T.sch[k], 0.6));
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(255,248,234,0.28)';
  ctx.fillRect(x0, CAL_Y - 1.5, GW, 3);
  for (let dd = 0; dd <= days; dd++) {
    const h = dd % 5 === 0 ? 16 : 8;
    ctx.fillRect(xd(dd) - 1, CAL_Y - h / 2, 2, h);
  }
  // The review days (A: four stacked on day 0).
  sch.days.forEach((dd, j) => {
    const u = ease.out(prog(t, T.sch[k] + 0.3 + j * 0.18, 0.35));
    if (u <= 0) return;
    const stack = dd === 0 ? j : 0;
    ctx.save();
    ctx.globalAlpha *= u;
    ctx.fillStyle = C.gold;
    ctx.shadowColor = 'rgba(246,207,126,0.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(xd(dd), CAL_Y - 26 - stack * 22, 9, 0, 6.283);
    ctx.fill();
    ctx.restore();
  });
  // The test, day 30.
  label(ctx, '考试', xd(days), CAL_Y + 52, { size: 32, weight: 700, color: C.red, align: 'right' });
  label(ctx, '第 0 天', x0, CAL_Y + 52, { size: 30, weight: 500, color: C.faint, align: 'left' });
  // Today.
  if (t >= T.run0 && t < T.test + 0.4) {
    const d = dayAt(t, days);
    ctx.fillStyle = C.text;
    ctx.beginPath();
    ctx.moveTo(xd(d), CAL_Y + 8);
    ctx.lineTo(xd(d) - 10, CAL_Y + 26);
    ctx.lineTo(xd(d) + 10, CAL_Y + 26);
    ctx.fill();
  }
  ctx.restore();
  return intro;
}

export function drawSpacing(ctx, t) {
  if (t < T.space - 0.2 || t > T.spaceEnd + 0.4) return;
  const a = life(t, T.space, T.spaceEnd + 0.4, 0.5, 0.6);
  ctx.save();
  ctx.globalAlpha = a;
  // The model, top centre.
  label(ctx, '记忆模型 FSRS（Anki 内置）· 默认参数 · 模拟', W / 2, 150, { size: 34, weight: 500, color: C.dim });
  const ck = ease.out(prog(t, T.run0 - 0.4, 0.5));
  if (ck > 0) {
    ctx.save();
    ctx.globalAlpha *= ck;
    const d = Math.floor(dayAt(t, st.testDay) + 1e-6);
    const col = t >= T.test ? C.red : C.gold;
    label(ctx, `${d}`, W / 2, 238, { size: 76, weight: 700, family: MONO, color: col, halo: 18 });
    label(ctx, '第', W / 2 - 64, 236, { size: 50, weight: 700, color: col, align: 'right' });
    label(ctx, '天', W / 2 + 64, 236, { size: 50, weight: 700, color: col, align: 'left' });
    ctx.restore();
  }
  st.memory.forEach((sch, k) => {
    panelFrame(ctx, k, ease.out(prog(t, T.space + 0.2 + k * 0.15, 0.5)));
    const intro = ease.out(prog(t, T.sch[k], 0.6));
    // Panels not yet introduced sit back a little.
    const focus = t < T.sch[2] + 1.2 ? (t >= T.sch[k] ? 1 : 0.55) : 1;
    drawCells(ctx, t, k, focus);
    label(ctx, sch.key, XS[k] - GW / 2, GY - 34, { size: 52, weight: 800, color: C.gold, align: 'left' });
    if (intro > 0) {
      ctx.save();
      ctx.globalAlpha *= intro;
      label(ctx, sch.name, XS[k] - GW / 2 + 52, GY - 36, { size: 44, weight: 700, align: 'left' });
      ctx.restore();
    }
    calendar(ctx, t, k, ease.out(prog(t, T.space + 0.4 + k * 0.15, 0.5)));
    // The result.
    if (t >= T.test + 0.4) {
      const v = countUp(t, T.test + 0.5, 1.4, sch.kept);
      const best = k === 2 ? life(t, T.insight, T.spaceEnd + 0.4, 0.5, 0.4) : 0;
      label(ctx, `${v}`, XS[k] + 40, NUM_Y, { size: 124, weight: 700, family: MONO, color: C.gold, align: 'right', halo: 16 + 20 * best });
      label(ctx, `/ ${st.nWords}`, XS[k] + 56, NUM_Y, { size: 42, weight: 500, family: MONO, color: C.dim, align: 'left' });
    }
    if (t >= T.lapses) {
      const la = ease.out(prog(t, T.lapses + k * 0.25, 0.5));
      ctx.save();
      ctx.globalAlpha *= la;
      label(ctx, `复习时想不起来 ${sch.lapses} 次`, XS[k], NUM_Y + 60, { size: 38, weight: 600, color: k === 2 ? C.red : C.dim });
      ctx.restore();
    }
  });
  // C minus A.
  const dA = life(t, T.diff, T.spaceEnd + 0.4, 0.5, 0.4);
  if (dA > 0) {
    const [A, , Cc] = st.memory;
    ctx.save();
    ctx.globalAlpha *= dA;
    label(ctx, `+${Cc.kept - A.kept}`, XS[2] + GW / 2 + 6, GY - 34, { size: 52, weight: 800, family: MONO, color: C.gold, align: 'right', halo: 20 });
    ctx.restore();
  }
  ctx.restore();
}
