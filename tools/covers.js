#!/usr/bin/env node
// Bilibili cover drafts (16:10, 1920×1200) composed from clean renderer frames (no lyrics baked in).
//   node tools/covers.js            -> out/covers/cover_*.jpg + out/covers/covers_sheet.jpg
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = (() => { for (const p of ['playwright-core', 'playwright', '/inner_container/opt/toolchains/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/node_modules/playwright-core']) { try { return require(p); } catch (_) {} } throw new Error('playwright-core not found'); })();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise((r) => srv.on('listening', r));
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/bin/chrome', args: ['--disable-crash-reporter', '--crash-dumps-dir=/tmp/crash', '--no-zygote', '--disable-gpu'] });
  const p = await b.newPage(); p.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/render/index.html`);
  await p.waitForFunction(() => window.__ready === true); await p.evaluate(() => window.api.init());
  const res = await p.evaluate(async () => {
    const m = await import('./main.js'); m.setTextEnabled(false);
    const shot = async (t) => { const img = new Image(); img.src = window.api.still(t); await img.decode(); return img; };
    const W = 1920, H = 1200;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
    // crop a source rect (in 1920×1080 frame px) into a dest rect, cover-fit
    const put = (x, img, sx, sy, sw, sh, dx, dy, dw, dh) => x.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    const text = (x, s, cx, cy, size, fill, o = {}) => {
      x.save(); x.font = `${size}px LXGW`; x.textAlign = o.align || 'center'; x.textBaseline = 'middle'; x.letterSpacing = o.sp || '0px';
      x.lineJoin = 'round'; x.shadowColor = o.glow || 'rgba(0,0,0,0.9)'; x.shadowBlur = o.blur ?? 30;
      x.lineWidth = o.stroke ?? size * 0.16; x.strokeStyle = o.strokeColor || 'rgba(10,8,20,0.95)'; x.strokeText(s, cx, cy);
      x.shadowBlur = 0; x.fillStyle = fill; x.fillText(s, cx, cy);
      if (o.glowFill) { x.shadowColor = o.glowFill; x.shadowBlur = size * 0.5; x.globalAlpha = 0.55; x.fillText(s, cx, cy); }
      x.restore(); };
    const vignette = (x, a = 0.55) => { const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    const out = {};

    // A · 生前 / 死后 split
    {
      const [c, x] = mk(), L = await shot(41.9), R = await shot(104.6);
      put(x, L, 520, 260, 700, 820, 0, 0, W / 2, H);         // lonely painter on the hill
      put(x, R, 610, 120, 820, 960, W / 2, 0, W / 2, H);     // the same sky, now in a museum, phones flashing
      vignette(x, 0.45);
      x.save(); x.strokeStyle = 'rgba(255,230,160,0.9)'; x.lineWidth = 8; x.shadowColor = 'rgba(255,200,90,0.9)'; x.shadowBlur = 30;
      x.beginPath(); x.moveTo(W / 2 + 40, 0); x.lineTo(W / 2 - 40, H); x.stroke(); x.restore();
      text(x, '活着', W * 0.25, H * 0.20, 190, '#f3e6c4');
      text(x, '没人捧场', W * 0.25, H * 0.36, 150, '#f3e6c4');
      text(x, '死后', W * 0.75, H * 0.20, 190, '#ffd447', { glowFill: 'rgba(255,200,70,0.8)' });
      text(x, '万人鼓掌', W * 0.75, H * 0.36, 150, '#ffd447', { glowFill: 'rgba(255,200,70,0.8)' });
      out.A = c.toDataURL('image/jpeg', 0.9);
    }
    // B · 星月夜 + 纯代码
    {
      const [c, x] = mk(), I = await shot(170.0);
      put(x, I, 96, 0, 1728, 1080, 0, 0, W, H);
      vignette(x, 0.5);
      text(x, '星星不疯', W * 0.5, H * 0.38, 230, '#ffe08a', { glowFill: 'rgba(255,210,80,0.9)', sp: '10px' });
      text(x, '怎么发光', W * 0.5, H * 0.58, 230, '#ffe08a', { glowFill: 'rgba(255,210,80,0.9)', sp: '10px' });
      x.save(); x.fillStyle = 'rgba(12,16,40,0.78)'; x.beginPath(); x.roundRect(W * 0.5 - 520, H * 0.73, 1040, 120, 60); x.fill(); x.restore();
      text(x, '每一帧 4.6 万笔 · 画面纯代码生成', W * 0.5, H * 0.73 + 60, 64, '#f3e6c4', { stroke: 0, blur: 0 });
      out.B = c.toDataURL('image/jpeg', 0.9);
    }
    // C · 8250 万美元 vs ¥9.9
    {
      const [c, x] = mk(), I = await shot(103.9), T = await shot(144.4);
      put(x, I, 96, 0, 1728, 1080, 0, 0, W, H);
      vignette(x, 0.55);
      x.save(); x.translate(W * 0.74, H * 0.60); x.rotate(0.06); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 40;
      x.drawImage(T, 220, 120, 1480, 900, -330, -200, 660, 400); x.lineWidth = 10; x.strokeStyle = '#fff'; x.strokeRect(-330, -200, 660, 400);
      x.shadowBlur = 0; x.fillStyle = '#e8231f'; x.beginPath(); x.roundRect(40, -120, 250, 150, 22); x.fill();          // the price tag (text layer is off)
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '78px LXGW'; x.fillText('¥9.9', 165, -60);
      x.font = '34px LXGW'; x.fillText('包邮', 165, 2); x.fillStyle = '#ffe45c'; x.font = '36px LXGW'; x.fillText('★★★★★', 165, 70);
      x.restore();
      text(x, '一幅 8250 万美元', W * 0.36, H * 0.18, 150, '#ffd447', { glowFill: 'rgba(255,200,70,0.8)' });
      // keep the bottom ~15 % clear: the feed overlays play count / danmaku / duration there
      text(x, '印成帆布包', W * 0.27, H * 0.60, 140, '#ffffff');
      x.save(); x.fillStyle = '#e8231f'; x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 30; x.beginPath(); x.roundRect(W * 0.27 - 300, H * 0.68, 600, 150, 30); x.fill(); x.restore();
      text(x, '9.9 包邮', W * 0.27, H * 0.68 + 78, 120, '#ffffff', { stroke: 0, blur: 0 });
      out.C = c.toDataURL('image/jpeg', 0.9);
    }
    // thumbnail-size contact sheet: how they read at feed size (≈ 380 px wide)
    {
      const tw = 380, th = 238, pad = 20, s = document.createElement('canvas'); s.width = (tw + pad) * 3 + pad; s.height = th + pad * 2 + 40;
      const x = s.getContext('2d'); x.fillStyle = '#f1f2f3'; x.fillRect(0, 0, s.width, s.height);
      let i = 0; for (const k of ['A', 'B', 'C']) { const img = new Image(); img.src = out[k]; await img.decode(); const X = pad + i * (tw + pad);
        x.save(); x.beginPath(); x.roundRect(X, pad, tw, th, 12); x.clip(); x.drawImage(img, X, pad, tw, th);
        const gr = x.createLinearGradient(0, pad + th - 44, 0, pad + th); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)');
        x.fillStyle = gr; x.fillRect(X, pad + th - 44, tw, 44); x.restore();                    // feed overlay: plays · danmaku · duration
        x.fillStyle = '#fff'; x.font = '15px LXGW'; x.fillText('1.2万播放 · 368弹幕', X + 10, pad + th - 12); x.fillText('03:18', X + tw - 52, pad + th - 12);
        x.fillStyle = '#18191c'; x.font = '20px LXGW'; x.fillText(`封面 ${k}`, X, pad + th + 30); i++; }
      out.sheet = s.toDataURL('image/jpeg', 0.92);
    }
    return out;
  });
  const dir = path.join(ROOT, 'out/covers'); fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(res)) { const f = path.join(dir, k === 'sheet' ? 'covers_thumbnail_sheet.jpg' : `cover_${k}.jpg`); fs.writeFileSync(f, Buffer.from(v.split(',')[1], 'base64')); console.log(path.relative(ROOT, f)); }
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
