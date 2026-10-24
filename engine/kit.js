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
