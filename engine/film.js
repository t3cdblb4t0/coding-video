// Film grammar for the series from episode 06 on, taken from frame-by-frame teardowns of the
// #vibe知识大赏 films that took off (see 运营/爆款拆解.md):
// - text develops from a blur, character by character, instead of popping or sliding in;
// - emphasis is brightness (glow, gold), not size or bounce;
// - something always drifts (dust), but the subject holds still once it is drawn, so it can be read;
// - sections dissolve or flash into each other rather than cut;
// - a tiny chapter mark top-left, and one instrument top-right that keeps reporting a number.
// Every function is a pure function of time t, so previews can jump anywhere.
import { clamp, lerp, prog, ease, mulberry32 } from './kit.js';
import { SANS, SONG, SERIF, MONO } from './fonts.js';

export const FILM = {
  text: '#FFF8EA',
  dim: 'rgba(255,248,234,0.64)',
  faint: 'rgba(255,248,234,0.36)',
  gold: '#F6CF7E',
  red: '#F0566E',
  ice: '#7FD8F2',
  bg0: '#0D1527',
  bg1: '#03050B',
};

const chars = (rich, color) => {
  const parts = typeof rich === 'string' ? [[rich]] : rich;
  const out = [];
  for (const [txt, c] of parts) for (const ch of txt) out.push([ch, c ?? color]);
  return out;
};

export function measureChars(ctx, rich) {
  return chars(rich).reduce((w, [ch]) => w + ctx.measureText(ch).width, 0);
}

// Rich text ([text, colour] segments) drawn one character at a time, each developing from a blur to
// sharp over `per` seconds; the whole line is out within about a second whatever its length.
// ctx.font must be set by the caller. Returns the line width.
export function developText(ctx, rich, x, y, t, t0, { align = 'center', color = FILM.text, per = 0.34, gap = 0.07, blur = 9, rise = 0, glow = 0, glowColor = null } = {}) {
  const cs = chars(rich, color);
  const widths = cs.map(([ch]) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const g = Math.min(gap, (1.0 - per) / Math.max(1, cs.length - 1));
  ctx.save();
  ctx.textAlign = 'left';
  for (let k = 0; k < cs.length; k++) {
    const u = prog(t, t0 + k * g, per);
    if (u > 0) {
      const e = ease.out(u);
      ctx.save();
      ctx.globalAlpha *= e;
      if (e < 0.995) ctx.filter = `blur(${(blur * (1 - e)).toFixed(2)}px)`;
      ctx.fillStyle = cs[k][1];
      if (glow > 0) {
        ctx.shadowColor = glowColor ?? (typeof cs[k][1] === 'string' ? cs[k][1] : FILM.gold);
        ctx.shadowBlur = glow;
      }
      ctx.fillText(cs[k][0], cx, y + rise * (1 - e));
      ctx.restore();
    }
    cx += widths[k];
  }
  ctx.restore();
  return total;
}

// Captions in the bottom zone (y 80-95% of the frame). Chinese develops per character, the English
// line (italic serif) fades in as a whole 0.18 s later; both fade out over 0.3 s.
// captions: [{ t0, t1, zh: rich, en }].
export function drawFilmCaptions(ctx, t, captions, { W, zhY = 948, enY = 998, zhSize = 46, enSize = 27, alpha = 1 } = {}) {
  for (const cap of captions) {
    if (t < cap.t0 || t > cap.t1) continue;
    const out = 1 - ease.in(prog(t, cap.t1 - 0.3, 0.3));
    if (out <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha * out;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 14;
    if (cap.zh) {
      ctx.font = `600 ${zhSize}px ${SANS}`;
      developText(ctx, cap.zh, W / 2, zhY, t, cap.t0);
    }
    if (cap.en) {
      ctx.globalAlpha = alpha * out * ease.out(prog(t, cap.t0 + 0.18, 0.55));
      ctx.font = `italic 400 ${enSize}px ${SERIF}`;
      ctx.fillStyle = FILM.dim;
      ctx.textAlign = 'center';
      ctx.fillText(cap.en, W / 2, enY);
    }
    ctx.restore();
  }
}

// Background: deep blue-black, lighter in the middle, with a vignette and a little grain. Built once.
export function buildFilmBackground(W, H, { c0 = FILM.bg0, c1 = FILM.bg1, cx = 0.5, cy = 0.45, seed = 6 } = {}) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W * cx, H * cy, 40, W * cx, H * cy, Math.max(W, H) * 0.75);
  grad.addColorStop(0, c0);
  grad.addColorStop(1, c1);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const rand = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 6;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Drifting, twinkling dust. makeDust once; drawDust every frame.
export function makeDust(seed, n, W, H) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, z: 0.25 + r() * 0.75, ph: r() * 6.283, sp: 0.3 + r() * 0.7 }));
}
export function drawDust(ctx, dust, t, W, H, { rgb = '255,244,225', alpha = 0.55, vx = 7, vy = -4 } = {}) {
  ctx.save();
  for (const p of dust) {
    const x = (((p.x + vx * t * p.sp * p.z) % W) + W) % W;
    const y = (((p.y + vy * t * p.sp * p.z) % H) + H) % H;
    const tw = 0.45 + 0.55 * Math.sin(t * (0.6 + p.sp) + p.ph) ** 2;
    ctx.globalAlpha = alpha * p.z * tw;
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + 1.5 * p.z, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

// Whole-frame flash: up in `up` s, back down over `down` s.
export function drawFlash(ctx, t, t0, W, H, { up = 0.06, down = 0.5, peak = 0.75, rgb = '255,246,228' } = {}) {
  if (t < t0 || t > t0 + up + down) return;
  const a = t < t0 + up ? (t - t0) / up : 1 - ease.out((t - t0 - up) / down);
  ctx.save();
  ctx.globalAlpha = clamp(a) * peak;
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Top-left chapter mark: "算给你看 06" and the three acts, the current one lit.
export function drawChapter(ctx, episode, act, alpha = 1, { x = 64, y = 74 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `600 24px ${SANS}`;
  ctx.letterSpacing = '5px';
  ctx.fillStyle = FILM.dim;
  ctx.fillText('算给你看', x, y);
  let w = ctx.measureText('算给你看').width;
  ctx.letterSpacing = '0px';
  ctx.font = `500 22px ${MONO}`;
  ctx.fillStyle = FILM.gold;
  ctx.fillText(String(episode).padStart(2, '0'), x + w + 10, y);
  w += 10 + ctx.measureText('00').width + 28;
  ctx.fillStyle = 'rgba(255,248,234,0.22)';
  ctx.fillRect(x + w, y - 9, 34, 1.5);
  w += 50;
  ctx.font = `600 22px ${SANS}`;
  ['问', '算', '想'].forEach((s, k) => {
    ctx.fillStyle = k === act ? FILM.gold : 'rgba(255,248,234,0.3)';
    ctx.fillText(s, x + w, y);
    w += 40;
  });
  ctx.restore();
}

// Title card: a dark veil, the title in large Song type with a gold glow, a Latin line and a plain
// subtitle. Everything develops in. motif(ctx, u) draws behind the title (u in [0, 1] over the card).
export function drawTitleCard(ctx, t, t0, t1, W, H, { title, latin, subtitle, kicker = null, motif = null, y = 500 } = {}) {
  if (t < t0 || t > t1) return;
  const a = Math.min(ease.out(prog(t, t0, 0.25)), 1 - ease.in(prog(t, t1 - 0.6, 0.6)));
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = '#02040A';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  if (motif) motif(ctx, prog(t, t0, t1 - t0));
  ctx.textBaseline = 'alphabetic';
  if (kicker) {
    ctx.save();
    ctx.globalAlpha = a * ease.out(prog(t, t0 + 0.5, 0.7));
    ctx.font = `500 30px ${SANS}`;
    ctx.letterSpacing = '14px';
    ctx.fillStyle = 'rgba(246,207,126,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(kicker, W / 2 + 7, y - 232);
    ctx.restore();
  }
  ctx.font = `700 196px ${SONG}`;
  ctx.letterSpacing = '36px';
  const grad = ctx.createLinearGradient(0, y - 170, 0, y + 20);
  grad.addColorStop(0, '#FFF1C9');
  grad.addColorStop(1, '#D9A548');
  developText(ctx, [[title, grad]], W / 2 + 18, y, t, t0 + 0.15, { per: 0.6, gap: 0.22, blur: 18, glow: 28, glowColor: 'rgba(246,207,126,0.55)' });
  ctx.letterSpacing = '0px';
  ctx.globalAlpha = a * ease.out(prog(t, t0 + 0.8, 0.7));
  ctx.font = `500 26px ${SERIF}`;
  ctx.letterSpacing = '9px';
  ctx.fillStyle = FILM.gold;
  ctx.textAlign = 'center';
  ctx.fillText(latin, W / 2 + 4, y + 84);
  ctx.letterSpacing = '0px';
  ctx.globalAlpha = a;
  ctx.font = `500 40px ${SANS}`;
  developText(ctx, subtitle, W / 2, y + 160, t, t0 + 1.1, { color: FILM.dim });
  ctx.restore();
}

// The instrument top-right: "seen" (always) and "/ total" (fades in when the denominator is
// revealed). Numbers in mono, labels in sans. alphaTotal in [0, 1].
export function drawDenominator(ctx, { seen, seenLabel, total, totalLabel, alpha = 1, alphaTotal = 0, color = FILM.text, x = 1856, y = 96 }) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  let right = x;
  if (alphaTotal > 0) {
    // First the seen number slides left to make room, then "/ total" fades in: never overlapping.
    const slide = clamp(alphaTotal * 2);
    const show = clamp(alphaTotal * 2 - 1);
    ctx.save();
    ctx.font = `600 44px ${MONO}`;
    const tw = ctx.measureText(total).width;
    ctx.font = `300 44px ${MONO}`;
    const sw = ctx.measureText('/').width;
    if (show > 0) {
      ctx.globalAlpha = alpha * show;
      ctx.font = `600 44px ${MONO}`;
      ctx.fillStyle = FILM.gold;
      ctx.fillText(total, x, y);
      ctx.font = `500 20px ${SANS}`;
      ctx.fillText(totalLabel, x, y - 50);
      ctx.font = `300 44px ${MONO}`;
      ctx.fillStyle = FILM.faint;
      ctx.fillText('/', x - tw - 16, y);
    }
    ctx.restore();
    right = lerp(x, x - (tw + 16 + sw + 16), ease.inOut(slide));
  }
  ctx.font = `600 44px ${MONO}`;
  ctx.fillStyle = color;
  ctx.fillText(seen, right, y);
  ctx.font = `500 20px ${SANS}`;
  ctx.fillStyle = FILM.dim;
  ctx.fillText(seenLabel, right, y - 50);
  ctx.restore();
}

// A small anchor top-left under the chapter mark: year · place · person, typed in quietly.
export function drawAnchor(ctx, t, t0, t1, lines, { x = 64, y = 132 } = {}) {
  if (t < t0 || t > t1) return;
  const a = Math.min(1, 1 - ease.in(prog(t, t1 - 0.4, 0.4)));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((ln, k) => {
    ctx.font = k === 0 ? `600 30px ${MONO}` : `500 24px ${SANS}`;
    developText(ctx, ln, x, y + k * 40, t, t0 + 0.12 * k, { align: 'left', color: k === 0 ? FILM.gold : FILM.dim, per: 0.3, gap: 0.03, blur: 6 });
  });
  ctx.restore();
}

export { SANS, SONG, SERIF, MONO };
