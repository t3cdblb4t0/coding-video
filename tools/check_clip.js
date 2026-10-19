#!/usr/bin/env node
// Verifies a muxed MP4 independently of the renderer:
//   node tools/check_clip.js out/梵高_mv.mp4 36 44 52 ...   (song times)
// - parses the MP4 sample tables itself, decodes the requested frames with WebCodecs -> <mp4>_preview.jpg
// - cross-correlates the MP4's audio with the original song to confirm the offset is exact
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = (() => { for (const p of ['playwright-core', 'playwright', '/inner_container/opt/toolchains/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/node_modules/playwright-core']) { try { return require(p); } catch (_) {} } throw new Error('playwright-core not found'); })();

function readMp4(file) {           // minimal demux of the video track: avcC, timescale, sample offsets/sizes, keyframes, edit-free start
  const b = fs.readFileSync(file);
  const kids = (o, e) => { const r = []; while (o < e) { let sz = b.readUInt32BE(o), h = 8; const t = b.toString('latin1', o + 4, o + 8); if (sz === 1) { sz = Number(b.readBigUInt64BE(o + 8)); h = 16; } r.push({ t, o, b: o + h, e: o + sz }); o += sz; } return r; };
  const find = (o, e, p) => { for (const k of kids(o, e)) if (k.t === p[0]) return p.length === 1 ? k : find(k.b, k.e, p.slice(1)); return null; };
  const moov = find(0, b.length, ['moov']);
  for (const tr of kids(moov.b, moov.e).filter((k) => k.t === 'trak')) {
    const hd = find(tr.b, tr.e, ['mdia', 'hdlr']); if (b.toString('latin1', hd.b + 8, hd.b + 12) !== 'vide') continue;
    const md = find(tr.b, tr.e, ['mdia', 'mdhd']), ts = b.readUInt32BE(md.b + 12);
    const st = find(tr.b, tr.e, ['mdia', 'minf', 'stbl']), g = (n) => find(st.b, st.e, [n]);
    const avc1 = g('stsd'), avcC = find(avc1.b + 8 + 86, avc1.e, ['avcC']) || (() => { const i = b.indexOf('avcC', avc1.b); return { b: i + 4, e: i - 4 + b.readUInt32BE(i - 4) }; })();
    const sz = g('stsz'), n = b.readUInt32BE(sz.b + 8), sizes = Array.from({ length: n }, (_, i) => b.readUInt32BE(sz.b + 12 + 4 * i));
    const co = g('co64') || g('stco'), big = !!g('co64'), nc = b.readUInt32BE(co.b + 4), offs = Array.from({ length: nc }, (_, i) => (big ? Number(b.readBigUInt64BE(co.b + 8 + 8 * i)) : b.readUInt32BE(co.b + 8 + 4 * i)));
    const sc = g('stsc'), ns = b.readUInt32BE(sc.b + 4), stsc = Array.from({ length: ns }, (_, i) => [b.readUInt32BE(sc.b + 8 + 12 * i), b.readUInt32BE(sc.b + 12 + 12 * i)]);
    const ss = g('stss'), keys = new Set(Array.from({ length: b.readUInt32BE(ss.b + 4) }, (_, i) => b.readUInt32BE(ss.b + 8 + 4 * i) - 1));
    const tt = g('stts'), dur = b.readUInt32BE(tt.b + 12);
    const samples = []; let si = 0;
    offs.forEach((o, ci) => { const per = [...stsc].reverse().find((e) => e[0] <= ci + 1)[1]; for (let k = 0; k < per; k++) { samples.push({ off: o, size: sizes[si], key: keys.has(si) }); o += sizes[si]; si++; } });
    return { buf: b, fps: ts / dur, avcC: b.subarray(avcC.b, avcC.e).toString('base64'), samples };
  }
  throw new Error('no video track');
}

(async () => {
  const [file, ...ts] = process.argv.slice(2), abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  const mp4 = readMp4(abs), want = ts.map((t) => Math.round(Number(t) * mp4.fps));
  const last = Math.max(...want), lastKey = (f) => { let k = f; while (k > 0 && !mp4.samples[k].key) k--; return k; };
  const needed = new Set(); for (const w of want) for (let k = lastKey(w); k <= w; k++) needed.add(k);
  const order = [...needed].sort((a, b) => a - b);
  const payload = order.map((k) => ({ i: k, key: mp4.samples[k].key, data: mp4.buf.subarray(mp4.samples[k].off, mp4.samples[k].off + mp4.samples[k].size).toString('base64') }));
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise((r) => srv.on('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/bin/chrome', args: ['--disable-crash-reporter', '--crash-dumps-dir=/tmp/crash', '--no-zygote', '--disable-gpu'] });
  const p = await b.newPage(); await p.goto(base + '/README.md');
  const rel = path.relative(ROOT, abs).split(path.sep).map(encodeURIComponent).join('/');
  const res = await p.evaluate(async ({ base, rel, payload, want, fps, avcC }) => {
    const cols = 2, w = 960, h = 540, sheet = document.createElement('canvas');
    sheet.width = cols * w; sheet.height = Math.ceil(want.length / cols) * h; const sx = sheet.getContext('2d');
    let got = 0; const desc = Uint8Array.from(atob(avcC), (c) => c.charCodeAt(0));
    const dec = new VideoDecoder({ output: (f) => {
      const fi = Math.round(f.timestamp * fps / 1e6), i = want.indexOf(fi);
      if (i >= 0) { const x = (i % cols) * w, y = Math.floor(i / cols) * h; sx.drawImage(f, x, y, w, h); got++;
        const st = fi / fps; sx.fillStyle = 'rgba(0,0,0,.55)'; sx.fillRect(x, y, 104, 30); sx.fillStyle = '#fff'; sx.font = '20px monospace';
        sx.fillText(`${Math.floor(st / 60)}:${(st % 60).toFixed(1).padStart(4, '0')}`, x + 9, y + 21); }
      f.close(); }, error: (e) => console.error(e) });
    dec.configure({ codec: 'avc1.640028', description: desc, codedWidth: 1920, codedHeight: 1080 });
    let prev = -2;
    for (const s of payload) {
      if (s.i !== prev + 1 && !s.key) throw new Error('gap without key frame');
      if (s.i !== prev + 1) { await dec.flush(); }
      dec.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: Math.round(s.i * 1e6 / fps), data: Uint8Array.from(atob(s.data), (c) => c.charCodeAt(0)) }));
      prev = s.i; let k = 0; while (dec.decodeQueueSize > 8 && k++ < 5000) await new Promise((r) => setTimeout(r, 1));
    }
    await Promise.race([dec.flush(), new Promise((r) => setTimeout(r, 60000))]);
    const decA = async (u) => new OfflineAudioContext(1, 44100, 44100).decodeAudioData(await (await fetch(u)).arrayBuffer());
    const a = (await decA(`${base}/${rel}`)).getChannelData(0), o = (await decA(`${base}/${encodeURIComponent('梵高.mp4')}`)).getChannelData(0);
    const A0 = Math.min(441000 * 3, a.length - 90000); let best = [-2, 0];
    for (let lag = -1500; lag <= 1500; lag++) { let s = 0, s1 = 0, s2 = 0; for (let k = A0; k < A0 + 88200; k += 2) { const va = a[k], vo = o[k + lag]; s += va * vo; s1 += va * va; s2 += vo * vo; } const r = s / Math.sqrt(s1 * s2); if (r > best[0]) best = [r, lag]; }
    return { framesDecoded: got, requested: want.length, audioSec: +(a.length / 44100).toFixed(3), audioCorr: +best[0].toFixed(5), audioOffsetErrorMs: +(best[1] / 44.1).toFixed(2), sheet: sheet.toDataURL('image/jpeg', 0.84) };
  }, { base, rel, payload, want, fps: mp4.fps, avcC: mp4.avcC });
  const outJ = abs.replace(/\.mp4$/, '') + '_preview.jpg';
  fs.writeFileSync(outJ, Buffer.from(res.sheet.split(',')[1], 'base64')); delete res.sheet;
  console.log(JSON.stringify({ ...res, fps: mp4.fps, frames: mp4.samples.length, preview: path.relative(ROOT, outJ) }));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
