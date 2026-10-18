// Typography on a 2D canvas, composited in the final pass.
// - lower-third lyrics appear on their sung time; rhyme characters are enlarged and coloured
// - the letter scenes write the spoken lines by hand onto the paper (anchored in world space)
// - year counter, year flashes and a few one-off graphics (signatures, price, tag)

const CREAM = 'rgb(243,230,196)';
const STY = {
  'Verse 1': { size: 56, rhyme: '#ffb02e' }, 'Chorus 1': { size: 58, rhyme: '#ffd447' }, 'Chorus 2': { size: 58, rhyme: '#ffd447' },
  'Verse 2': { size: 56, rhyme: '#a9d4ff' }, 'Double Time': { size: 56, rhyme: '#ff8a3d' }, Build: { size: 56, rhyme: '#ffd447' },
  Spoken: { size: 46, color: 'rgb(223,230,242)', rhyme: '#bcd6ff', y: 0.83 }, Bridge: { size: 52, rhyme: '#ffb36b' },
  Outro: { size: 56, rhyme: (t) => (t < 145.1 ? '#ff4d4d' : '#ffd447') },
};
const LETTER = ['Intro', 'Ending', 'Reprise'];
const NAMES = ['Jean', 'Marie', 'Louis', 'Joseph', 'Pierre', 'Anne', 'Paul', 'Claude', 'Henri', 'Louise', 'Jacques', 'Rose', 'Émile', 'Marthe',
  'Victor', 'Jeanne', 'Auguste', 'Camille', 'Lucien', 'Marguerite', 'Étienne', 'Berthe', 'Gustave', 'Hélène', 'Félix', 'Adèle', 'Jules', 'Odile'];
const RHYME_SCALE = 1.42;

export class TextLayer {
  constructor(W, H, lines) {
    this.W = W; this.H = H; this.A = W / H;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.lines = lines.filter((l) => l.type === 'lyric' && !l.text.startsWith('(') && !LETTER.includes(l.section));
    this.letters = lines.filter((l) => l.type === 'lyric' && LETTER.includes(l.section));
    this.lines.forEach((l, i) => {      // sung lines hold their last note until shortly before the next line
      const next = this.lines[i + 1] ? this.lines[i + 1].start : l.end + 2, last = l.char_times[l.char_times.length - 1];
      l.showEnd = Math.max(l.end, Math.min(next - 0.06, last + 1.4));
    });
  }
  hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  toScreen(x, y, cam) {
    const qx = (x - cam[0]) * cam[2], qy = (y - cam[1]) * cam[2], c = Math.cos(cam[3]), s = Math.sin(cam[3]);
    return [((c * qx + s * qy) / this.A + 0.5) * this.W, (0.5 - (-s * qx + c * qy)) * this.H];
  }

  drawLyrics(t) {
    const { ctx, W, H } = this;
    for (const [li, line] of this.lines.entries()) {
      if (t < line.start - 0.1 || t > line.showEnd + 0.6) continue;
      const st = STY[line.section] || STY['Chorus 1'], size = st.size, gap = 6, spaceW = size * 0.55;
      const rc = typeof st.rhyme === 'function' ? st.rhyme(t) : st.rhyme, rset = new Set(line.rhyme || []);
      let ci = 0; const items = [];
      for (const ch of line.text) {
        if (ch === ' ') { items.push({ ch, w: spaceW, time: null }); continue; }
        const r = rset.has(ci);
        items.push({ ch, r, w: size * (r ? RHYME_SCALE : 1) + gap, time: line.char_times[ci++] });
      }
      const total = items.reduce((s, it) => s + it.w, 0) - gap;
      let x = W / 2 - total / 2 + (t - line.start) * 6;
      const baseY = H * (st.y || 0.865);
      ctx.textBaseline = 'alphabetic';
      for (const [k, it] of items.entries()) {
        if (it.time === null) { x += it.w; continue; }
        const pin = Math.min(1, Math.max(0, (t - it.time + 0.06) / 0.26));
        const pout = Math.min(1, Math.max(0, (t - (line.showEnd - 0.30 + 0.008 * k)) / 0.26));
        const a = pin * (1 - pout) * (1 - pout);
        if (a <= 0.003) { x += it.w; continue; }
        const e = 1 - (1 - pin) * (1 - pin);
        const dy = (1 - e) * 16 - pout * 48 + Math.sin(t * 2.1 + k * 1.7 + li) * 1.6;
        let sc = 1.18 - 0.18 * e + 0.08 * pout;
        if (it.r) sc = RHYME_SCALE * (1 + 0.32 * (1 - e)) + 0.08 * pout;
        ctx.save();
        ctx.translate(x + (it.w - gap) / 2, baseY + dy);
        ctx.rotate((this.hash(li * 50 + k) - 0.5) * (it.r ? 0.12 : 0.06) + pout * (this.hash(k + 9) - 0.5) * 0.5);
        ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.font = `${size}px LXGW`;
        ctx.shadowColor = 'rgba(4,8,26,0.85)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3;
        ctx.fillStyle = it.r ? rc : st.color || CREAM;
        ctx.fillText(it.ch, -size / 2, size * 0.36);
        ctx.shadowOffsetY = 0;
        if (it.r) { ctx.shadowColor = rc; ctx.shadowBlur = 30 + 30 * (1 - e); ctx.globalAlpha = a * (0.55 + 0.45 * (1 - e)); ctx.fillText(it.ch, -size / 2, size * 0.36); }
        else if (pin < 1) { ctx.shadowBlur = 0; ctx.globalAlpha = (1 - pin) * 0.8 * a; ctx.fillStyle = 'rgb(255,214,120)'; ctx.fillText(it.ch, -size / 2, size * 0.36); }
        ctx.restore();
        x += it.w;
      }
    }
  }

  // handwriting on the letter: chars are "written" left to right at their spoken time
  drawLetter(t, cam, alpha) {
    if (alpha <= 0.01) return;
    const { ctx } = this, rows = [[-0.52, 0.22], [-0.52, 0.10]], adv = 0.058, sp = 0.03, fs = 0.05;
    const toP = (qx, qy) => { const c = Math.cos(0.03), s = Math.sin(0.03); return [c * qx - s * qy, s * qx + c * qy]; };
    const ang = -(0.03 - cam[3]), px = fs * cam[2] * this.H;
    const glyphs = [];
    for (const l of this.letters) {
      if (t < l.start - 0.2 || (l.section === 'Intro' && t > 20) || (l.section === 'Ending' && t > 186)) continue;
      let row = 0, x = rows[0][0], ci = 0, n = 0;
      for (const ch of l.text) {
        if (l.section === 'Intro' && l.text.startsWith('今晚')) row = 1;
        if (ch === ' ') { if (l.section !== 'Intro' && n === 5) { row = 1; x = rows[1][0]; } else x += sp; continue; }
        if (l.section === 'Intro' && l.text.startsWith('今晚') && n === 0) x = rows[1][0];
        glyphs.push({ ch, q: [x, rows[row][1]], time: l.char_times[ci++] }); x += adv; n++;
      }
    }
    if (t > 197.0) {            // signature after the last spoken word, proportional spacing
      ctx.font = '100px LXGW'; let x = -0.40;
      [...'Vincent'].forEach((ch, i) => { glyphs.push({ ch, q: [x, -0.10], time: 197.25 + i * 0.06, sig: true }); x += ctx.measureText(ch).width / 100 * fs * 1.25; });
    }
    for (const gph of glyphs) {
      const p = Math.min(1, Math.max(0, (t - gph.time + 0.02) / 0.22)); if (p <= 0) continue;
      const [wx, wy] = toP(gph.q[0], gph.q[1]), [sx, sy] = this.toScreen(wx, wy, cam), s = gph.sig ? px * 1.25 : px;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
      ctx.beginPath(); ctx.rect(-s * 0.1, -s * 1.1, s * 1.2 * p, s * 1.5); ctx.clip();
      ctx.globalAlpha = 0.9 * alpha; ctx.fillStyle = 'rgb(58,34,18)'; ctx.font = `${s}px LXGW`; ctx.textBaseline = 'alphabetic';
      ctx.fillText(gph.ch, 0, 0); ctx.restore();
    }
  }

  drawYear(y) {
    const { ctx } = this, x = 92, by = 96;
    const show = (txt, place, a, dy) => {
      if (!txt || a <= 0) return;
      ctx.globalAlpha = a * 0.78; ctx.shadowColor = 'rgba(4,8,26,0.8)'; ctx.shadowBlur = 14; ctx.fillStyle = CREAM;
      ctx.font = '34px LXGW'; ctx.fillText(txt, x, by + dy);
      if (place) { ctx.font = '24px LXGW'; ctx.globalAlpha = a * 0.55; ctx.fillText(place, x + 96, by + dy - 2); }
    };
    ctx.save(); ctx.textBaseline = 'alphabetic';
    if (y.prev && y.cur !== y.prev) show(y.prev, y.prevPlace, 1 - y.k, -22 * y.k);
    show(y.cur, y.place, y.prev && y.cur !== y.prev ? y.k : 1, y.prev && y.cur !== y.prev ? 22 * (1 - y.k) : 0);
    ctx.restore();
  }

  drawFlash(t, f) {          // a big year written in the middle, then flying into the counter
    if (!f) return;
    const { ctx, W, H } = this, size = 250, k = Math.min(1, Math.max(0, (t - (f.t0 + f.flyAt)) / f.flyDur)), ke = k * k * (3 - 2 * k);
    ctx.save(); ctx.translate(W / 2 + (162 - W / 2) * ke, H * 0.47 + (85 - H * 0.47) * ke); ctx.scale(1 - 0.86 * ke, 1 - 0.86 * ke);
    ctx.font = `${size}px LXGW`; ctx.textBaseline = 'middle';
    const w = size * 0.56, x0 = -w * 2;
    for (const [i, d] of [...f.text].entries()) {
      const p = Math.min(1, Math.max(0, (t - f.chars[i] + 0.04) / 0.18)); if (p <= 0) continue;
      ctx.globalAlpha = p * (1 - Math.max(0, (k - 0.6) / 0.4));
      ctx.shadowColor = 'rgba(255,190,90,0.9)'; ctx.shadowBlur = 40 * (1.2 - p * 0.6); ctx.fillStyle = 'rgb(252,236,200)';
      const js = 1.35 - 0.35 * p;
      ctx.save(); ctx.translate(x0 + i * w + w / 2 + (1 - p) * (this.hash(i) - 0.5) * 40, 0); ctx.scale(js, js); ctx.fillText(d, -w / 2, 0); ctx.restore();
    }
    ctx.restore();
  }

  drawSignatures(st) {       // the petition: names pile up around the door
    const { ctx, W, H } = this, n = Math.min(44, Math.floor(st * 18));
    ctx.save(); ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = Math.min(1, (st - i / 18) * 5) * (st > 2.35 ? Math.max(0, 1 - (st - 2.35) * 3) : 1);
      ctx.save(); ctx.translate((0.05 + 0.9 * this.hash(i * 3.1)) * W, (0.08 + 0.6 * this.hash(i * 7.7)) * H);
      ctx.rotate((this.hash(i * 1.3) - 0.5) * 0.6); ctx.globalAlpha = a * 0.9;
      ctx.font = `${26 + 20 * this.hash(i * 5.3)}px LXGW`; ctx.fillStyle = 'rgb(46,26,14)';
      ctx.shadowColor = 'rgba(250,236,200,0.7)'; ctx.shadowBlur = 8; ctx.fillText(NAMES[i % NAMES.length], 0, 0); ctx.restore();
    }
    ctx.restore();
  }

  drawMoney(st) {
    const { ctx, W, H } = this, v = Math.round(80000000 * Math.min(1, (st / 0.7) ** 0.6) / 10000) * 10000, sc = 1 + 0.05 * st;
    ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = Math.min(1, st * 6) * Math.min(1, (1.17 - st) * 6);
    ctx.font = '150px LXGW'; ctx.shadowColor = 'rgba(255,200,80,0.9)'; ctx.shadowBlur = 40; ctx.fillStyle = 'rgb(255,215,106)';
    ctx.fillText(v.toLocaleString('en-US'), 0, 0); ctx.restore();
  }

  drawPrice(st) {
    const { ctx, W, H } = this, p = Math.min(1, st * 5), sc = 0.6 + 0.4 * p + 0.08 * Math.sin(st * 9) * (1 - Math.min(1, st));
    ctx.save(); ctx.translate(W * 0.70, H * 0.44); ctx.scale(sc, sc); ctx.globalAlpha = p; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgb(232,35,31)'; ctx.shadowColor = 'rgba(80,0,0,0.6)'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.roundRect(-230, -150, 460, 230, 36); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = '130px LXGW'; ctx.fillText('¥9.9', 0, -50);
    ctx.font = '58px LXGW'; ctx.fillText('包邮', 0, 40);
    ctx.fillStyle = 'rgb(255,228,92)'; ctx.font = '62px LXGW'; ctx.fillText('★★★★★', 0, 150);
    ctx.fillStyle = '#fff'; ctx.font = '44px LXGW'; ctx.fillText('好评', 0, 222); ctx.restore();
  }

  render(t, info, cam, letterAlpha) {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.drawLetter(t, cam, letterAlpha);
    this.drawYear(info.year);
    if (info.signatures !== null) this.drawSignatures(info.signatures);
    this.drawLyrics(t);
    this.drawFlash(t, info.flash);
    if (info.money !== null) this.drawMoney(info.money);
    if (info.price !== null) this.drawPrice(info.price);
    return this.canvas;
  }
}
