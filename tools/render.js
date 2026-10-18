#!/usr/bin/env node
// Render the WebGL painting in headless Chrome, frame by frame, and encode with WebCodecs (H.264).
//   node tools/render.js stills 36 41 50            -> out/stills/t036.00.png ...
//   node tools/render.js clip 34.5 69.3 out/name    -> out/name.h264 + out/name.json (then run tools/mux.py)
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
function loadPlaywright() {
  for (const p of ['playwright-core', 'playwright',
    '/inner_container/opt/toolchains/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/node_modules/playwright-core']) {
    try { return require(p); } catch (_) { /* try next */ }
  }
  throw new Error('playwright-core not found (npm i playwright-core)');
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const srv = await serve();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/local/bin/chrome',
    args: ['--disable-crash-reporter', '--crash-dumps-dir=/tmp/crash', '--no-zygote', '--disable-gpu', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/render/index.html`);
  await page.waitForFunction(() => window.__ready === true);
  const info = await page.evaluate(() => window.api.init());

  if (mode === 'stills' || mode === 'sheet') {
    const dir = path.join(ROOT, 'out/stills'); fs.mkdirSync(dir, { recursive: true });
    const urls = [];
    for (const a of args) {
      const t = parseFloat(a), t0 = Date.now();
      const url = await page.evaluate((t) => window.api.still(t), t);
      urls.push([t, url]);
      if (mode === 'stills') fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
      console.log(`t=${t}`, `${((Date.now() - t0) / 25).toFixed(0)} ms/frame (incl. warm-up)`);
    }
    // contact sheet: 2 columns of 960x540 JPEG tiles with timestamps
    const sheet = await page.evaluate(async (urls) => {
      const cols = 2, w = 960, h = 540, rows = Math.ceil(urls.length / cols);
      const c = document.createElement('canvas'); c.width = cols * w; c.height = rows * h; const x = c.getContext('2d');
      for (const [i, [t, u]] of urls.entries()) {
        const img = new Image(); img.src = u; await img.decode();
        x.drawImage(img, (i % cols) * w, Math.floor(i / cols) * h, w, h);
        x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect((i % cols) * w, Math.floor(i / cols) * h, 120, 34);
        x.fillStyle = '#fff'; x.font = '22px monospace'; x.fillText(`${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`, (i % cols) * w + 10, Math.floor(i / cols) * h + 24);
      }
      return c.toDataURL('image/jpeg', 0.82);
    }, urls);
    const f = path.join(dir, process.env.SHEET || 'sheet.jpg');
    fs.writeFileSync(f, Buffer.from(sheet.split(',')[1], 'base64')); console.log('sheet', f);
  } else if (mode === 'clip') {
    const start = parseFloat(args[0]), end = parseFloat(args[1]), base = path.join(ROOT, args[2] || 'out/clip');
    const bitrate = parseFloat(process.env.BITRATE || '10e6');
    fs.mkdirSync(path.dirname(base), { recursive: true });
    const n = Math.round((end - start) * 30);
    const ok = await page.evaluate((b) => window.api.startEncoder({ bitrate: b }), bitrate);
    console.log('encoder high profile:', ok, 'frames:', n);
    await page.evaluate((t) => window.api.warm(t), start);
    const bin = fs.openSync(base + '.h264', 'w'); const index = []; let cfg = null; const t0 = Date.now();
    const take = (r) => { if (r.decoderConfig) cfg = r.decoderConfig; for (const c of r.chunks) { const b = Buffer.from(c.data, 'base64'); fs.writeSync(bin, b); index.push({ size: b.length, key: c.key, ts: c.ts }); } };
    for (let i = 0; i < n; i += 15) {
      take(await page.evaluate(([t, a, b]) => window.api.encodeRange(t, a, b), [start, i, Math.min(n, i + 15)]));
      if (i % 150 === 0) { const el = (Date.now() - t0) / 1000; console.log(`frame ${i}/${n}  ${(el / Math.max(1, i)).toFixed(2)} s/frame  eta ${((n - i) * el / Math.max(1, i) / 60).toFixed(1)} min`); }
    }
    take(await page.evaluate(() => window.api.finish()));
    fs.closeSync(bin);
    fs.writeFileSync(base + '.json', JSON.stringify({ start, end, fps: 30, width: info.W, height: info.H, codec: cfg && cfg.codec, avcC: cfg && cfg.description, samples: index }));
    console.log('wrote', base + '.h264', index.length, 'samples', 'in', ((Date.now() - t0) / 60000).toFixed(1), 'min');
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
