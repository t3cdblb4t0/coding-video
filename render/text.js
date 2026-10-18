// Typography drawn on a 2D canvas and composited in the final pass.
// Characters appear on their sung time (ASR char timestamps) and leave by dissolving upward.

const CREAM = [243, 230, 196];

export class TextLayer {
  constructor(W, H, lines) {
    this.W = W; this.H = H;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.lines = lines.filter((l) => l.type === 'lyric' && !l.text.startsWith('('));
    // sung (non-rap) lines hold their last note: keep them up until shortly before the next line
    this.lines.forEach((l, i) => {
      const next = this.lines[i + 1] ? this.lines[i + 1].start : l.end + 2;
      const last = l.char_times[l.char_times.length - 1];
      l.showEnd = Math.max(l.end, Math.min(next - 0.06, last + 1.4));
    });
  }

  hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  drawLyrics(t) {
    const { ctx, W, H } = this;
    const size = 56, gap = 6, spaceW = 30, baseY = H * 0.865;
    for (const [li, line] of this.lines.entries()) {
      if (t < line.start - 0.1 || t > line.showEnd + 0.6) continue;
      const chars = [...line.text];
      let ci = 0; const items = [];
      for (const ch of chars) {
        if (ch === ' ') { items.push({ ch, w: spaceW, time: null }); continue; }
        items.push({ ch, w: size + gap, time: line.char_times[ci++] });
      }
      const total = items.reduce((s, it) => s + it.w, 0) - gap;
      const drift = (t - line.start) * 6;
      let x = W / 2 - total / 2 + drift;
      ctx.font = `${size}px LXGW`;
      ctx.textBaseline = 'alphabetic';
      for (const [k, it] of items.entries()) {
        if (it.time === null) { x += it.w; continue; }
        const pin = Math.min(1, Math.max(0, (t - it.time + 0.06) / 0.26));
        // leave quickly and upward so the next line (same baseline) never collides with this one
        const outT = line.showEnd - 0.30 + 0.008 * k;
        const pout = Math.min(1, Math.max(0, (t - outT) / 0.26));
        const a = pin * (1 - pout) * (1 - pout);
        if (a <= 0.003) { x += it.w; continue; }
        const e = 1 - (1 - pin) * (1 - pin);
        const wob = Math.sin(t * 2.1 + k * 1.7 + li) * 1.6;
        const dy = (1 - e) * 16 - pout * 48 + wob;
        const sc = 1.18 - 0.18 * e + 0.08 * pout;
        ctx.save();
        ctx.translate(x + size / 2, baseY + dy);
        ctx.rotate((this.hash(li * 50 + k) - 0.5) * 0.06 + pout * (this.hash(k + 9) - 0.5) * 0.5);
        ctx.scale(sc, sc);
        ctx.globalAlpha = a;
        ctx.shadowColor = 'rgba(4,8,26,0.85)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3;
        ctx.fillStyle = `rgb(${CREAM.join(',')})`;
        ctx.fillText(it.ch, -size / 2, size * 0.36);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        if (pin < 1) {   // freshly written: brief warm glow
          ctx.globalAlpha = (1 - pin) * 0.8;
          ctx.fillStyle = 'rgb(255,214,120)';
          ctx.fillText(it.ch, -size / 2, size * 0.36);
        }
        ctx.restore();
        x += it.w;
      }
    }
  }

  drawYear(t, info) {
    const { ctx } = this;
    ctx.save();
    ctx.font = '34px LXGW';
    ctx.textBaseline = 'alphabetic';
    const x = 92, y = 96;
    const show = (txt, place, a, dy) => {
      if (a <= 0) return;
      ctx.globalAlpha = a * 0.78;
      ctx.shadowColor = 'rgba(4,8,26,0.8)'; ctx.shadowBlur = 14;
      ctx.fillStyle = `rgb(${CREAM.join(',')})`;
      ctx.fillText(txt, x, y + dy);
      ctx.font = '24px LXGW';
      ctx.globalAlpha = a * 0.55;
      ctx.fillText(place, x + 96, y + dy - 2);
      ctx.font = '34px LXGW';
    };
    if (info.year === '1888') show('1888', '阿尔勒', 1, 0);
    else { show('1888', '阿尔勒', 1 - info.yearFlip, -22 * info.yearFlip); show('1889', '圣雷米', info.yearFlip, 22 * (1 - info.yearFlip)); }
    ctx.restore();
  }

  drawFlash(t, f) {
    if (!f) return;
    const { ctx, W, H } = this;
    const size = 250, k = Math.min(1, Math.max(0, (t - (f.t0 + 1.15)) / 0.75)), ke = k * k * (3 - 2 * k);
    // flies from the centre into the year counter
    const cx = W / 2 + (92 + 70 - W / 2) * ke, cy = H * 0.47 + (85 - H * 0.47) * ke, sc = 1 - 0.86 * ke;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.font = `${size}px LXGW`; ctx.textBaseline = 'middle';
    const digits = [...f.text], w = size * 0.56, x0 = -w * 2;
    for (const [i, d] of digits.entries()) {
      const p = Math.min(1, Math.max(0, (t - f.chars[i] + 0.04) / 0.18));
      if (p <= 0) continue;
      const a = p * (1 - Math.max(0, (k - 0.6) / 0.4));
      ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(255,190,90,0.9)'; ctx.shadowBlur = 40 * (1.2 - p * 0.6);
      ctx.fillStyle = 'rgb(252,236,200)';
      const jx = (1 - p) * (this.hash(i) - 0.5) * 40, js = 1.35 - 0.35 * p;
      ctx.save(); ctx.translate(x0 + i * w + w / 2 + jx, 0); ctx.scale(js, js);
      ctx.fillText(d, -w / 2, 0); ctx.restore();
    }
    ctx.restore();
  }

  render(t, info) {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.drawYear(t, info);
    this.drawLyrics(t);
    this.drawFlash(t, info.flash);
    return this.canvas;
  }
}
