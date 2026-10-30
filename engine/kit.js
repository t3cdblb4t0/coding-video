// Shared helpers for scenes: easing/timing, seeded randomness, text, captions.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, start, dur) => clamp((t - start) / dur);
export const smooth = (a, b, x) => {
  const u = clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

export const ease = {
  out: (x) => 1 - (1 - x) ** 3,
  in: (x) => x ** 3,
  inOut: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  outBack: (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
};

// 0 outside [a, b]; ramps up over `fin` seconds and down over `fout` seconds.
export function envelope(t, a, b, fin = 0.25, fout = 0.25) {
  if (t <= a || t >= b) return 0;
  return Math.min(1, (t - a) / fin, (b - t) / fout);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rich text: segments = [[text, colour?], ...] or a plain string. Returns total width.
function segs(s) {
  return typeof s === 'string' ? [[s]] : s;
}
export function measureRich(ctx, s) {
  return segs(s).reduce((w, [txt]) => w + ctx.measureText(txt).width, 0);
}
export function drawRich(ctx, s, x, y, { align = 'center', color = '#F4F6FA' } = {}) {
  const parts = segs(s);
  const total = measureRich(ctx, parts);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  for (const [txt, c] of parts) {
    ctx.fillStyle = c ?? color;
    ctx.fillText(txt, cx, y);
    cx += ctx.measureText(txt).width;
  }
  return total;
}

// Per-character fade + rise, staggered. Works for CJK and Latin alike.
export function drawStagger(ctx, s, x, y, t, start, { stagger = 0.035, dur = 0.4, rise = 26, color = '#F4F6FA' } = {}) {
  const parts = segs(s);
  const total = measureRich(ctx, parts);
  let cx = x - total / 2;
  let k = 0;
  ctx.textAlign = 'left';
  for (const [txt, c] of parts) {
    for (const ch of txt) {
      const w = ctx.measureText(ch).width;
      const p = ease.out(prog(t, start + k * stagger, dur));
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha *= p;
        ctx.fillStyle = c ?? color;
        ctx.fillText(ch, cx, y + (1 - p) * rise);
        ctx.restore();
      }
      cx += w;
      k++;
    }
  }
}

// Bilingual caption: bold Chinese line (rich text allowed) over a smaller English line.
// Fades over 0.2 s at both ends; lines shrink to fit maxWidth instead of overflowing.
export function drawCaption(ctx, t, cap, { x, yZh, yEn, family, zhSize = 54, enSize = 30, maxWidth = 780, dim = 'rgba(244,246,250,0.62)' }) {
  const a = envelope(t, cap.t0, cap.t1, 0.2, 0.2);
  if (a <= 0) return;
  const rise = (1 - ease.out(prog(t, cap.t0, 0.35))) * 16;
  const fit = (weight, size, s) => {
    ctx.font = `${weight} ${size}px ${family}`;
    const w = measureRich(ctx, s);
    if (w > maxWidth) ctx.font = `${weight} ${Math.floor((size * maxWidth) / w)}px ${family}`;
  };
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 18;
  fit(700, zhSize, cap.zh);
  drawRich(ctx, cap.zh, x, yZh + rise);
  if (cap.en) {
    fit(400, enSize, cap.en);
    drawRich(ctx, cap.en, x, yEn + rise, { color: dim });
  }
  ctx.restore();
}

export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');

// Wrap rich text into lines no wider than maxWidth (uses the current ctx.font).
// Breaks are allowed after spaces, after CJK ideographs and after CJK punctuation, but never
// right before closing punctuation, so Chinese wraps anywhere and English wraps at spaces.
const CLOSING = '，。、：；？！）」』》%,.;:?!)';
const isCJK = (ch) => /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch);
// Preferred break points. Spaces are deliberately not in here: in Chinese captions they only pad
// numbers ("1 万"), so they are allowed breaks but get no bonus.
const PUNCT = '，。：；？！、,.;:?!';
export function wrapRich(ctx, s, maxWidth) {
  const chars = [];
  for (const [txt, c] of segs(s)) for (const ch of txt) chars.push([ch, c]);
  const N = chars.length;
  const w = chars.map(([ch]) => ctx.measureText(ch).width);
  const total = w.reduce((a, b) => a + b, 0);
  // A space next to a digit only pads a number in Chinese text ("直线 77 次"), so it is not a
  // break point: this keeps numbers attached to their units.
  const isDigit = (k) => k >= 0 && k < N && /[0-9.%]/.test(chars[k][0]);
  const canBreakAfter = (k) => {
    if (k >= N - 1 || CLOSING.includes(chars[k + 1][0])) return false;
    if (chars[k][0] === ' ') return !isDigit(k - 1) && !isDigit(k + 1);
    return isCJK(chars[k][0]);
  };
  const isPunct = (k) => PUNCT.includes(chars[k][0]);
  // Rebuild [text, colour] segments for chars[from, to), trimming spaces at both ends.
  const toSegs = (from, to) => {
    while (from < to && chars[from][0] === ' ') from++;
    while (to > from && chars[to - 1][0] === ' ') to--;
    const out = [];
    for (let k = from; k < to; k++) {
      const [ch, c] = chars[k];
      const last = out[out.length - 1];
      if (last && last[1] === c) last[0] += ch;
      else out.push([ch, c]);
    }
    return out;
  };
  if (total <= maxWidth) return [toSegs(0, N)];
  // Two lines if possible: the most balanced split, with a bonus for breaking at punctuation.
  let best = null;
  let acc = 0;
  for (let k = 0; k < N - 1; k++) {
    acc += w[k];
    if (!canBreakAfter(k) || acc > maxWidth || total - acc > maxWidth) continue;
    const cost = Math.max(acc, total - acc) - (isPunct(k) ? 0.35 * maxWidth : 0);
    if (!best || cost < best.cost) best = { k, cost };
  }
  if (best) return [toSegs(0, best.k + 1), toSegs(best.k + 1, N)];
  // Otherwise greedy, preferring a punctuation break in the second half of each line.
  const lines = [];
  let start = 0;
  let width = 0;
  let lastBreak = -1;
  let lastPunct = -1;
  for (let k = 0; k < N; k++) {
    if (k > start && width + w[k] > maxWidth) {
      const half = start + (k - start) / 2;
      const cut = lastPunct >= half ? lastPunct + 1 : lastBreak >= start ? lastBreak + 1 : k;
      lines.push(toSegs(start, cut));
      start = cut;
      width = w.slice(start, k).reduce((a, b) => a + b, 0);
      lastBreak = lastPunct = -1;
      for (let j = start; j < k; j++) if (canBreakAfter(j)) (lastBreak = j), isPunct(j) && (lastPunct = j);
    }
    width += w[k];
    if (canBreakAfter(k)) {
      lastBreak = k;
      if (isPunct(k)) lastPunct = k;
    }
  }
  lines.push(toSegs(start, N));
  return lines.filter((ln) => ln.length);
}
