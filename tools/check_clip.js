#!/usr/bin/env node
// Verifies a rendered clip and makes a contact sheet from the ENCODED frames.
//   node tools/check_clip.js out/sample_chorus1 35.0 38.6 ...   (song times)
// - decodes out/<name>.h264 with WebCodecs and tiles the requested frames -> out/<name>_preview.jpg
// - cross-correlates the muxed audio with the original song to confirm the offset is exact
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = (() => { for (const p of ['playwright-core', 'playwright', '/inner_container/opt/toolchains/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/node_modules/playwright-core']) { try { return require(p); } catch (_) {} } throw new Error('playwright-core not found'); })();

(async () => {
  const [name, ...ts] = process.argv.slice(2);
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise((r) => srv.on('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/bin/chrome', args: ['--disable-crash-reporter', '--crash-dumps-dir=/tmp/crash', '--no-zygote', '--disable-gpu'] });
  const p = await b.newPage(); await p.goto(base + '/README.md');
  const res = await p.evaluate(async ({ base, name, ts }) => {
    const meta = await (await fetch(`${base}/${name}.json`)).json();
    const bin = new Uint8Array(await (await fetch(`${base}/${name}.h264`)).arrayBuffer());
    const want = ts.map((t) => Math.round((t - meta.start) * meta.fps));
    const cols = 2, w = 960, h = 540, sheet = document.createElement('canvas');
    sheet.width = cols * w; sheet.height = Math.ceil(want.length / cols) * h; const sx = sheet.getContext('2d');
    let got = 0;
    const dec = new VideoDecoder({ output: (f) => {
      const fi = Math.round(f.timestamp * meta.fps / 1e6), i = want.indexOf(fi);
      if (i >= 0) { const x = (i % cols) * w, y = Math.floor(i / cols) * h; sx.drawImage(f, x, y, w, h); got++;
        const st = meta.start + fi / meta.fps; sx.fillStyle = 'rgba(0,0,0,.55)'; sx.fillRect(x, y, 104, 30); sx.fillStyle = '#fff'; sx.font = '20px monospace';
        sx.fillText(`${Math.floor(st / 60)}:${(st % 60).toFixed(1).padStart(4, '0')}`, x + 9, y + 21); }
      f.close(); }, error: (e) => console.error(e) });
    dec.configure({ codec: meta.codec, description: Uint8Array.from(atob(meta.avcC), (c) => c.charCodeAt(0)), codedWidth: meta.width, codedHeight: meta.height });
    let off = 0; const last = Math.max(...want);
    for (const [i, s] of meta.samples.entries()) {
      dec.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: Math.round(i * 1e6 / meta.fps), data: bin.subarray(off, off + s.size) })); off += s.size;
      if (i > last + 2) break;
      let k = 0; while (dec.decodeQueueSize > 8 && k++ < 5000) await new Promise((r) => setTimeout(r, 1));
    }
    await Promise.race([dec.flush(), new Promise((r) => setTimeout(r, 60000))]);
    // audio alignment against the source song
    const decA = async (u) => new OfflineAudioContext(1, 44100, 44100).decodeAudioData(await (await fetch(u)).arrayBuffer());
    const a = (await decA(`${base}/${name}.mp4`)).getChannelData(0), o = (await decA(`${base}/${encodeURIComponent('梵高.mp4')}`)).getChannelData(0);
    const exp = Math.round(meta.start * 44100), A0 = Math.min(441000, a.length - 90000); let best = [-2, 0];
    for (let lag = -1500; lag <= 1500; lag++) { let s = 0, s1 = 0, s2 = 0; for (let k = A0; k < A0 + 88200; k += 2) { const va = a[k], vo = o[exp + k + lag]; s += va * vo; s1 += va * va; s2 += vo * vo; } const r = s / Math.sqrt(s1 * s2); if (r > best[0]) best = [r, lag]; }
    return { framesDecoded: got, requested: want.length, audioCorr: +best[0].toFixed(5), audioOffsetErrorMs: +(best[1] / 44.1).toFixed(2), sheet: sheet.toDataURL('image/jpeg', 0.84) };
  }, { base, name, ts: ts.map(Number) });
  fs.writeFileSync(path.join(ROOT, `${name}_preview.jpg`), Buffer.from(res.sheet.split(',')[1], 'base64')); delete res.sheet;
  console.log(JSON.stringify(res));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
