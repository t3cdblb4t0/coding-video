#!/usr/bin/env node
// Build the full MV in high quality: render every chunk losslessly into x264 (one compression step),
// join the chunks without re-encoding, and add the original AAC track from 梵高.mp4 untouched.
//   node tools/build_mv.js [--crf 22] [--preset slow] [--jobs 3] [--out out/van-gogh-mv-1080p.mp4] [--preview-mbps 3.6]
// env: CHROME (chrome binary), FFMPEG (ffmpeg binary, needs libx264)
const { spawn, spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const CRF = arg('crf', '22'), PRESET = arg('preset', 'slow'), JOBS = parseInt(arg('jobs', '3'), 10);
const OUT = path.resolve(ROOT, arg('out', 'out/van-gogh-mv-1080p.mp4')), PREVIEW_MBPS = arg('preview-mbps', null);
const FFMPEG = process.env.FFMPEG || 'ffmpeg', FPS = 24, TOTAL = 4758;            // 198.25 s @ 24 fps
// chunks start at hard cuts / black frames (render/timeline.js CHAIN_STARTS), so the stroke warm-up is never visible
const CUTS = [0, 298, 638, 798, 1873, 2301, 3290, 3687, 4464, TOTAL];
const DIR = path.join(ROOT, 'out/hq');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env, ...opts });
    let err = '';
    p.stdout.on('data', (d) => process.stdout.write(d.toString().split('\n').filter((l) => /wrote|frame \d|rror/.test(l)).map((l) => l + '\n').join('')));
    p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-20000); });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${c}\n${err.split('\n').filter((l) => !/dbus|Fontconfig|ANGLE|angle|GL Driver|GPU stall/.test(l)).slice(-15).join('\n')}`))));
  });
}

(async () => {
  const t0 = Date.now();
  fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true }); fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const chunks = CUTS.slice(0, -1).map((f0, i) => ({ f0, f1: CUTS[i + 1], file: path.join(DIR, `c_${String(f0).padStart(4, '0')}.mp4`) }));
  const queue = [...chunks].sort((a, b) => (b.f1 - b.f0) - (a.f1 - a.f0));              // longest first
  console.log(`rendering ${TOTAL} frames in ${chunks.length} chunks, ${JOBS} at a time, x264 CRF ${CRF} preset ${PRESET}`);
  const worker = async () => { for (let c; (c = queue.shift());) await run(process.execPath, [path.join(__dirname, 'render.js'), 'raw', String(c.f0), String(c.f1), c.file], { env: { ...process.env, CRF, PRESET } }); };
  await Promise.all(Array.from({ length: JOBS }, worker));
  console.log(`rendered in ${((Date.now() - t0) / 60000).toFixed(1)} min`);

  const list = path.join(DIR, 'list.txt');
  fs.writeFileSync(list, chunks.map((c) => `file '${c.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(ROOT, '梵高.mp4'),
    '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', '-metadata', 'title=梵高 MV', OUT]);

  // sanity checks on the joined file
  const probe = spawnSync(FFMPEG.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-count_packets', '-show_entries', 'stream=codec_type,nb_read_packets,duration', '-of', 'json', OUT], { encoding: 'utf8' });
  const st = JSON.parse(probe.stdout).streams, v = st.find((s) => s.codec_type === 'video'), a = st.find((s) => s.codec_type === 'audio');
  if (+v.nb_read_packets !== TOTAL) throw new Error(`expected ${TOTAL} video frames, got ${v.nb_read_packets}`);
  if (Math.abs(+a.duration - TOTAL / FPS) > 0.05) throw new Error(`audio duration ${a.duration} != ${TOTAL / FPS}`);
  const mb = fs.statSync(OUT).size / 1e6;
  console.log(`${path.relative(ROOT, OUT)}: ${v.nb_read_packets} frames, ${(+v.duration).toFixed(2)} s video, ${(+a.duration).toFixed(2)} s audio, ${mb.toFixed(1)} MB (${(mb * 8 / (TOTAL / FPS)).toFixed(1)} Mbps)`);

  if (PREVIEW_MBPS) {                    // optional small version (< 100 MB) re-encoded from the HQ file, 2-pass
    const pv = OUT.replace(/\.mp4$/, `_preview.mp4`), b = `${PREVIEW_MBPS}M`, log = path.join(DIR, 'pass');
    const common = ['-hide_banner', '-loglevel', 'error', '-y', '-i', OUT, '-c:v', 'libx264', '-preset', 'slow', '-b:v', b, '-maxrate', `${PREVIEW_MBPS * 1.6}M`, '-bufsize', `${PREVIEW_MBPS * 3}M`, '-passlogfile', log];
    await run(FFMPEG, [...common, '-pass', '1', '-an', '-f', 'null', '-']);
    await run(FFMPEG, [...common, '-pass', '2', '-map', '0:v', '-map', '0:a', '-c:a', 'copy', '-movflags', '+faststart', pv]);
    console.log(`${path.relative(ROOT, pv)}: ${(fs.statSync(pv).size / 1e6).toFixed(1)} MB`);
  }
  console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
