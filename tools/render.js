#!/usr/bin/env node
// Render the WebGL painting in headless Chrome and encode it with WebCodecs (H.264).
//   node tools/render.js sheet 36 44 52                  -> out/stills/sheet.jpg (contact sheet, SHEET=name.jpg)
//   node tools/render.js chunk F0 F1 out/full/c_F0 [STATE_IN|-] [STATE_OUT]
//        renders global frames [F0, F1) at 24 fps -> <base>.h264 + <base>.json; continues exactly from STATE_IN if given
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
function loadPlaywright() {
  for (const p of ['playwright-core', 'playwright', '/inner_container/opt/toolchains/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/node_modules/playwright-core']) {
    try { return require(p); } catch (_) { /* next */ }
  }
  throw new Error('playwright-core not found (npm i playwright-core)');
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };
let sink = null;                      // ffmpeg child process receiving raw frames (mode "raw")
const serve = () => new Promise((resolve) => {
  const srv = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/sink')) {
      if (!sink) { res.writeHead(503); return res.end(); }
      req.on('data', (d) => { if (!sink.stdin.write(d)) { req.pause(); sink.stdin.once('drain', () => req.resume()); } });
      req.on('end', () => { res.writeHead(200); res.end(); });
      return;
    }
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0, '127.0.0.1', () => resolve(srv));
});

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const srv = await serve(), { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/bin/chrome',
    args: ['--disable-crash-reporter', '--crash-dumps-dir=/tmp/crash', '--no-zygote', '--disable-gpu', '--ignore-gpu-blocklist',
      '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/render/index.html`);
  await page.waitForFunction(() => window.__ready === true);
  const info = await page.evaluate(() => window.api.init());

  if (mode === 'sheet') {
    const dir = path.join(ROOT, 'out/stills'); fs.mkdirSync(dir, { recursive: true });
    const urls = [];
    for (const a of args) { const t = parseFloat(a), t0 = Date.now(); urls.push([t, await page.evaluate((t) => window.api.still(t), t)]); console.log(`t=${t} ${((Date.now() - t0) / 21).toFixed(0)} ms/frame`); }
    const sheet = await page.evaluate(async (urls) => {
      const cols = 2, w = 960, h = 540, c = document.createElement('canvas'); c.width = cols * w; c.height = Math.ceil(urls.length / cols) * h; const x = c.getContext('2d');
      for (const [i, [t, u]] of urls.entries()) {
        const img = new Image(); img.src = u; await img.decode(); const X = (i % cols) * w, Y = Math.floor(i / cols) * h;
        x.drawImage(img, X, Y, w, h); x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(X, Y, 120, 34); x.fillStyle = '#fff'; x.font = '22px monospace';
        x.fillText(`${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`, X + 10, Y + 24);
      }
      return c.toDataURL('image/jpeg', 0.82);
    }, urls);
    const f = path.join(dir, process.env.SHEET || 'sheet.jpg'); fs.writeFileSync(f, Buffer.from(sheet.split(',')[1], 'base64')); console.log('sheet', f);
  }

  if (mode === 'chunk') {
    const f0 = parseInt(args[0], 10), f1 = parseInt(args[1], 10), base = path.join(ROOT, args[2]);
    const stateIn = args[3] && args[3] !== '-' ? path.join(ROOT, args[3]) : null, stateOut = args[4] ? path.join(ROOT, args[4]) : null;
    const bitrate = parseFloat(process.env.BITRATE || '3.4e6');
    fs.mkdirSync(path.dirname(base), { recursive: true });
    if (stateIn) await page.evaluate((s) => window.api.loadState(s), fs.readFileSync(stateIn, 'utf8'));
    else await page.evaluate((t) => window.api.warm(t), f0 / info.fps);
    await page.evaluate(([b, f]) => window.api.startEncoder({ bitrate: b, f0: f }), [bitrate, f0]);
    const bin = fs.openSync(base + '.h264', 'w'), samples = []; let cfg = null; const t0 = Date.now();
    const take = (r) => { if (r.decoderConfig) cfg = r.decoderConfig; for (const c of r.chunks) { const b = Buffer.from(c.data, 'base64'); fs.writeSync(bin, b); samples.push({ size: b.length, key: c.key }); } };
    for (let f = f0; f < f1; f += 12) {
      take(await page.evaluate(([a, b]) => window.api.encodeFrames(a, b), [f, Math.min(f1, f + 12)]));
      if ((f - f0) % 120 === 0) console.log(`[${f0}] frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000 / Math.max(1, f - f0)).toFixed(2)} s/frame`);
    }
    take(await page.evaluate(() => window.api.finish()));
    fs.closeSync(bin);
    if (stateOut) fs.writeFileSync(stateOut, await page.evaluate(() => window.api.saveState()));
    fs.writeFileSync(base + '.json', JSON.stringify({ f0, f1, fps: info.fps, width: info.W, height: info.H, codec: cfg.codec, avcC: cfg.description, samples }));
    console.log(`[${f0}] wrote ${base}.h264 ${samples.length} frames in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  if (mode === 'raw') {            // node tools/render.js raw F0 F1 out/hq/c_F0.mp4   (env: FFMPEG, CRF, PRESET)
    const f0 = parseInt(args[0], 10), f1 = parseInt(args[1], 10), out = path.isAbsolute(args[2]) ? args[2] : path.join(ROOT, args[2]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const { spawn } = require('child_process');
    sink = spawn(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${info.W}x${info.H}`, '-r', String(info.fps), '-i', '-',
      '-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p',
      '-c:v', 'libx264', '-preset', process.env.PRESET || 'slow', '-crf', process.env.CRF || '22',
      ...(process.env.CRF === '0' ? [] : ['-profile:v', 'high']),            // lossless (reference only) needs High 4:4:4
      '-g', String(2 * info.fps), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-movflags', '+faststart', '-an', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((resolve, reject) => sink.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited ${c}`)))));
    const t0 = Date.now();
    await page.evaluate((t) => window.api.warm(t), f0 / info.fps);
    for (let f = f0; f < f1; f += 24) {
      await page.evaluate(([a, b]) => window.api.rawFrames(a, b, '/sink'), [f, Math.min(f1, f + 24)]);
      if ((f - f0) % 240 === 0) console.log(`[${f0}] frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000 / Math.max(1, f - f0)).toFixed(2)} s/frame`);
    }
    sink.stdin.end(); await done;
    console.log(`[${f0}] wrote ${out} ${f1 - f0} frames, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
