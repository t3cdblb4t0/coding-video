// Inspect any H.264/VP8/VP9 video (our renders or reference clips):
// metadata, playback check, audio levels + tempo estimate, cut detection, and contact sheets.
//   node engine/inspect.mjs <video> [--every 1] [--scan 0.2] [--out previews/inspect-name] [--frames]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, openPage, parseArgs } from './server.mjs';

const args = parseArgs(process.argv.slice(2));
const input = args._[0] && path.resolve(args._[0]);
if (!input || !fs.existsSync(input)) {
  console.error('usage: node engine/inspect.mjs <video> [--every 1] [--scan 0.2] [--out dir] [--frames]');
  process.exit(2);
}
const base = path.basename(input).replace(/\.[^.]+$/, '');
const outDir = args.out ?? `previews/inspect-${base}`;
const ext = `/ext/${encodeURIComponent('input' + path.extname(input).toLowerCase())}`;

const { server, port } = await startServer({ extraFiles: { [decodeURIComponent(ext)]: input } });
const { browser, page } = await openPage();
let exitCode = 0;
try {
  await page.goto(`http://localhost:${port}/engine/page.html`);
  const report = await page.evaluate(
    async ({ src, every, scan, outDir, saveFrames }) => {
      const post = async (p, body) => {
        const r = await fetch(`/api/file?path=${encodeURIComponent(p)}`, { method: 'POST', body });
        if (!r.ok) throw new Error('upload failed ' + p);
      };
      const toJpeg = (c, q = 0.85) => new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      const v = document.createElement('video');
      v.muted = true;
      v.preload = 'auto';
      v.src = src;
      document.body.appendChild(v);
      await new Promise((ok, fail) => {
        v.onloadeddata = ok;
        v.onerror = () => fail(new Error('video element error: ' + (v.error?.message || v.error?.code)));
      });
      const out = { duration: +v.duration.toFixed(3), width: v.videoWidth, height: v.videoHeight };

      // Short playback to confirm both streams decode in Chrome's (FFmpeg-based) pipeline.
      await v.play();
      await new Promise((r) => setTimeout(r, 1500));
      v.pause();
      out.playback = { videoBytesDecoded: v.webkitVideoDecodedByteCount, audioBytesDecoded: v.webkitAudioDecodedByteCount };

      // requestVideoFrameCallback never fires in headless mode, so rely on 'seeked' alone.
      const seek = (t) =>
        new Promise((r) => {
          const target = Math.min(t, Math.max(0, v.duration - 0.02));
          if (Math.abs(v.currentTime - target) < 1e-4 && v.readyState >= 2) return r();
          v.onseeked = () => r();
          v.currentTime = target;
        });

      // Cut detection on small grayscale thumbnails.
      const landscape = v.videoWidth > v.videoHeight;
      const tiny = document.createElement('canvas');
      tiny.width = landscape ? 64 : 36;
      tiny.height = landscape ? 36 : 64;
      const tctx = tiny.getContext('2d', { willReadFrequently: true });
      const diffs = [];
      let prev = null;
      for (let t = 0; t < v.duration; t += scan) {
        await seek(t);
        tctx.drawImage(v, 0, 0, tiny.width, tiny.height);
        const d = tctx.getImageData(0, 0, tiny.width, tiny.height).data;
        const g = new Float32Array(tiny.width * tiny.height);
        for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
        if (prev) {
          let s = 0;
          for (let i = 0; i < g.length; i++) s += Math.abs(g[i] - prev[i]);
          diffs.push({ t: +t.toFixed(2), d: s / g.length });
        }
        prev = g;
      }
      const sorted = diffs.map((x) => x.d).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const threshold = Math.max(18, median * 4);
      out.cuts = diffs.filter((x) => x.d > threshold).map((x) => x.t);
      out.motion = { medianFrameDiff: +median.toFixed(2), cutThreshold: +threshold.toFixed(1) };

      // Contact sheets, 4 x 4 per page, cells labelled with timestamps.
      const times = [];
      for (let t = 0; t < v.duration; t += every) times.push(+t.toFixed(2));
      const cellW = landscape ? 420 : 270;
      const cellH = Math.round((cellW * v.videoHeight) / v.videoWidth);
      const perPage = 16;
      const full = document.createElement('canvas');
      full.width = v.videoWidth;
      full.height = v.videoHeight;
      const fctx = full.getContext('2d');
      out.sheets = [];
      for (let p = 0; p * perPage < times.length; p++) {
        const chunk = times.slice(p * perPage, (p + 1) * perPage);
        const sheet = document.createElement('canvas');
        sheet.width = 4 * cellW;
        sheet.height = Math.ceil(chunk.length / 4) * (cellH + 30);
        const s = sheet.getContext('2d');
        s.fillStyle = '#222';
        s.fillRect(0, 0, sheet.width, sheet.height);
        for (const [k, t] of chunk.entries()) {
          await seek(t);
          const x = (k % 4) * cellW;
          const y = Math.floor(k / 4) * (cellH + 30);
          s.drawImage(v, x, y + 30, cellW, cellH);
          s.fillStyle = '#ff0';
          s.font = '22px monospace';
          s.fillText(`${t.toFixed(1)}s`, x + 6, y + 23);
          if (saveFrames) {
            fctx.drawImage(v, 0, 0);
            await post(`${outDir}/frame-${t.toFixed(2).padStart(6, '0')}.jpg`, await toJpeg(full, 0.9));
          }
        }
        const name = `${outDir}/sheet-${String(p + 1).padStart(2, '0')}.jpg`;
        await post(name, await toJpeg(sheet));
        out.sheets.push(name);
      }

      // Audio: decode the whole file, then levels and a rough tempo from onset autocorrelation.
      try {
        const buf = await (await fetch(src)).arrayBuffer();
        const audio = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(buf);
        const ch = audio.getChannelData(0);
        const sr = audio.sampleRate;
        let peak = 0;
        let sum = 0;
        for (let i = 0; i < ch.length; i++) {
          const a = Math.abs(ch[i]);
          if (a > peak) peak = a;
          sum += ch[i] * ch[i];
        }
        const hop = Math.round(sr * 0.01);
        const env = [];
        for (let i = 0; i + hop <= ch.length; i += hop) {
          let e = 0;
          for (let j = i; j < i + hop; j++) e += ch[j] * ch[j];
          env.push(Math.sqrt(e / hop));
        }
        const onset = env.map((e, i) => Math.max(0, e - (env[i - 1] ?? e)));
        let best = { bpm: 0, score: -Infinity };
        for (let bpm = 60; bpm <= 180; bpm++) {
          const lag = Math.round(6000 / bpm);
          let score = 0;
          for (let i = lag; i < onset.length; i++) score += onset[i] * onset[i - lag];
          if (score > best.score) best = { bpm, score };
        }
        const loudness = [];
        for (let s = 0; s < audio.duration; s += 1) {
          const a = Math.floor(s * sr);
          const b = Math.min(ch.length, Math.floor((s + 1) * sr));
          let e = 0;
          for (let i = a; i < b; i++) e += ch[i] * ch[i];
          loudness.push(+(20 * Math.log10(Math.sqrt(e / Math.max(1, b - a)) || 1e-9)).toFixed(1));
        }
        out.audio = {
          channels: audio.numberOfChannels, sampleRate: sr, duration: +audio.duration.toFixed(3),
          peakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(1), rmsDb: +(20 * Math.log10(Math.sqrt(sum / ch.length) || 1e-9)).toFixed(1),
          tempoGuessBpm: best.bpm, loudnessPerSecondDb: loudness,
        };
      } catch (e) {
        out.audio = { error: String(e.message || e) };
      }
      return out;
    },
    { src: ext, every: Number(args.every ?? 1), scan: Number(args.scan ?? 0.2), outDir, saveFrames: !!args.frames },
  );
  report.file = path.relative(ROOT, input) || input;
  report.bytes = fs.statSync(input).size;
  fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
process.exit(exitCode);
