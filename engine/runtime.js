// Browser side of the renderer. engine/render.mjs opens page.html and calls window.runJob(job).
//
// A scene module (videos/<id>/scene.js) default-exports:
//   { meta: { title, output }, width, height, fps, duration, bitrate?,
//     setup?({ canvas, ctx }) — one-time precomputation (may be async),
//     draw(ctx, t, frameIndex) — must support random access in t (previews jump around),
//     audio?(offlineAudioContext, { duration }) — schedule the soundtrack (may be async) }
import { muxMP4 } from './mp4.js';
import { loadFonts } from './fonts.js';

const AUDIO_RATE = 48000;

async function post(path, body) {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'POST', body });
  if (!res.ok) throw new Error(`upload failed (${res.status}): ${path}`);
}

function copyBytes(src) {
  if (src instanceof ArrayBuffer) return new Uint8Array(src.slice(0));
  return new Uint8Array(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength));
}

// sRGB canvas pixels -> I420, BT.709 limited range (signalled in the MP4 'colr' box).
function rgbaToI420(rgba, w, h, out) {
  const cw = w >> 1;
  const ySize = w * h;
  const cSize = cw * (h >> 1);
  for (let j = 0; j < h; j += 2) {
    for (let i = 0; i < w; i += 2) {
      const a = (j * w + i) * 4;
      const b = a + 4;
      const c = a + w * 4;
      const d = c + 4;
      out[j * w + i] = 16 + 0.18259 * rgba[a] + 0.61423 * rgba[a + 1] + 0.06201 * rgba[a + 2];
      out[j * w + i + 1] = 16 + 0.18259 * rgba[b] + 0.61423 * rgba[b + 1] + 0.06201 * rgba[b + 2];
      out[(j + 1) * w + i] = 16 + 0.18259 * rgba[c] + 0.61423 * rgba[c + 1] + 0.06201 * rgba[c + 2];
      out[(j + 1) * w + i + 1] = 16 + 0.18259 * rgba[d] + 0.61423 * rgba[d + 1] + 0.06201 * rgba[d + 2];
      const r = (rgba[a] + rgba[b] + rgba[c] + rgba[d]) * 0.25;
      const g = (rgba[a + 1] + rgba[b + 1] + rgba[c + 1] + rgba[d + 1]) * 0.25;
      const bl = (rgba[a + 2] + rgba[b + 2] + rgba[c + 2] + rgba[d + 2]) * 0.25;
      const k = (j >> 1) * cw + (i >> 1);
      out[ySize + k] = 128 - 0.10064 * r - 0.33857 * g + 0.43922 * bl;
      out[ySize + cSize + k] = 128 + 0.43922 * r - 0.39894 * g - 0.04028 * bl;
    }
  }
}

async function pickH264(width, height, fps, bitrate) {
  // High, Main, then Constrained Baseline — all level 4.2 (enough for 1080x1920 @ 30/60 fps).
  for (const codec of ['avc1.64002a', 'avc1.4d402a', 'avc1.42e02a']) {
    const config = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } };
    const { supported } = await VideoEncoder.isConfigSupported(config);
    if (supported) return config;
  }
  throw new Error('no supported H.264 encoder configuration');
}

async function renderAudio(scene, log = () => {}) {
  const length = Math.ceil(scene.duration * AUDIO_RATE);
  const octx = new OfflineAudioContext(2, length, AUDIO_RATE);
  const t0 = performance.now();
  await scene.audio(octx, { duration: scene.duration });
  log(`audio graph built in ${((performance.now() - t0) / 1000).toFixed(1)} s; rendering ${scene.duration} s of sound`);
  const buffer = await octx.startRendering();
  log(`audio rendered in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  const chans = [buffer.getChannelData(0), buffer.getChannelData(1)];

  let peak = 0;
  let sumSq = 0;
  for (const ch of chans) {
    for (let i = 0; i < ch.length; i++) {
      const v = Math.abs(ch[i]);
      if (v > peak) peak = v;
      sumSq += ch[i] * ch[i];
    }
  }
  const gain = peak > 0 ? 10 ** (-1 / 20) / peak : 1; // normalise peak to -1 dBFS
  for (const ch of chans) for (let i = 0; i < ch.length; i++) ch[i] *= gain;
  const rmsDb = 20 * Math.log10(Math.sqrt(sumSq / (2 * length)) * gain || 1e-9);

  const packets = [];
  let head = null;
  let failure = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      if (!head && meta?.decoderConfig?.description) head = copyBytes(meta.decoderConfig.description);
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      packets.push({ data, duration: Math.round(((chunk.duration ?? 20000) * AUDIO_RATE) / 1e6) });
    },
    error: (e) => (failure = e),
  });
  encoder.configure({ codec: 'opus', sampleRate: AUDIO_RATE, numberOfChannels: 2, bitrate: 192000 });
  const step = 4800;
  for (let off = 0; off < length; off += step) {
    const n = Math.min(step, length - off);
    const planar = new Float32Array(n * 2);
    planar.set(chans[0].subarray(off, off + n), 0);
    planar.set(chans[1].subarray(off, off + n), n);
    const data = new AudioData({
      format: 'f32-planar', sampleRate: AUDIO_RATE, numberOfFrames: n, numberOfChannels: 2,
      timestamp: Math.round((off * 1e6) / AUDIO_RATE), data: planar,
    });
    encoder.encode(data);
    data.close();
  }
  await encoder.flush();
  if (failure) throw failure;

  // OpusHead (little-endian): bytes 10-11 hold pre-skip. libopus' default lookahead is 312.
  const preSkip = head && head.length >= 19 ? head[10] | (head[11] << 8) : 312;
  const track = { kind: 'audio', timescale: AUDIO_RATE, channels: 2, preSkip, inputSampleRate: AUDIO_RATE, samples: packets };
  return { track, info: { peakBeforeNorm: +peak.toFixed(3), rmsDb: +rmsDb.toFixed(1), preSkip, packets: packets.length, opusHead: !!head } };
}

async function renderVideo(scene, canvas, ctx, log) {
  const { width: W, height: H, fps } = scene;
  const total = Math.round(scene.duration * fps);
  const config = await pickH264(W, H, fps, scene.bitrate ?? 10e6);
  const samples = [];
  let avcC = null;
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (!avcC && meta?.decoderConfig?.description) avcC = copyBytes(meta.decoderConfig.description);
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({ data, duration: 1000, key: chunk.type === 'key', ts: chunk.timestamp });
    },
    error: (e) => (failure = e),
  });
  encoder.configure(config);

  const yuv = new Uint8ClampedArray((W * H * 3) / 2);
  const started = performance.now();
  for (let i = 0; i < total; i++) {
    await scene.draw(ctx, i / fps, i);
    rgbaToI420(ctx.getImageData(0, 0, W, H).data, W, H, yuv);
    const frame = new VideoFrame(yuv, {
      format: 'I420', codedWidth: W, codedHeight: H,
      timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps),
      colorSpace: { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false },
    });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 2) await new Promise((r) => setTimeout(r, 1));
    if (failure) throw failure;
    if (i % fps === 0 || i === total - 1) {
      const elapsed = (performance.now() - started) / 1000;
      log(`video ${i + 1}/${total} frames, ${(elapsed / (i + 1) * 1000).toFixed(0)} ms/frame`);
    }
  }
  await encoder.flush();
  if (failure) throw failure;
  if (!avcC) throw new Error('encoder produced no avcC description');
  if (samples.length !== total) throw new Error(`encoder returned ${samples.length} frames, expected ${total}`);
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].ts <= samples[i - 1].ts) throw new Error('encoder reordered frames (B-frames are not supported by mp4.js)');
  }
  const track = { kind: 'video', timescale: fps * 1000, width: W, height: H, avcC, samples };
  const info = {
    codec: config.codec, profile: avcC[1], level: avcC[3], frames: total,
    keyframes: samples.filter((s) => s.key).length, seconds: +((performance.now() - started) / 1000).toFixed(1),
  };
  return { track, info };
}

window.runJob = async function runJob(job) {
  const log = (msg) => console.log(`[render] ${msg}`);
  await loadFonts();
  const scene = (await import(job.scene)).default;
  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  if (scene.setup) await scene.setup({ canvas, ctx });

  if (job.mode === 'preview') {
    const scale = job.scale ?? 0.5;
    const small = document.createElement('canvas');
    small.width = Math.round(scene.width * scale);
    small.height = Math.round(scene.height * scale);
    const sctx = small.getContext('2d');
    const cols = Math.min(job.times.length, 4);
    const sheet = document.createElement('canvas');
    const cell = { w: Math.round(scene.width * 0.25), h: Math.round(scene.height * 0.25) };
    sheet.width = cols * cell.w;
    sheet.height = Math.ceil(job.times.length / cols) * (cell.h + 34);
    const shctx = sheet.getContext('2d');
    shctx.fillStyle = '#222';
    shctx.fillRect(0, 0, sheet.width, sheet.height);
    const files = [];
    for (const [k, t] of job.times.entries()) {
      await scene.draw(ctx, t, Math.round(t * scene.fps));
      sctx.drawImage(canvas, 0, 0, small.width, small.height);
      const name = `${job.outDir}/t${t.toFixed(2).padStart(6, '0')}.jpg`;
      await post(name, await new Promise((r) => small.toBlob(r, 'image/jpeg', 0.9)));
      files.push(name);
      const x = (k % cols) * cell.w;
      const y = Math.floor(k / cols) * (cell.h + 34);
      shctx.drawImage(canvas, x, y + 34, cell.w, cell.h);
      shctx.fillStyle = '#fff';
      shctx.font = '24px "Source Code Pro"';
      shctx.fillText(`t=${t.toFixed(2)}s`, x + 8, y + 26);
    }
    const sheetName = `${job.outDir}/sheet.jpg`;
    await post(sheetName, await new Promise((r) => sheet.toBlob(r, 'image/jpeg', 0.88)));
    return { files, sheet: sheetName };
  }

  if (job.mode === 'cover') {
    if (!scene.cover) throw new Error('scene has no cover() export');
    const files = [];
    for (const [w, h, tag] of [[1920, 1080, '16x9'], [1440, 1080, '4x3'], [1080, 1440, '3x4']]) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const cctx = c.getContext('2d');
      await scene.cover(cctx, { w, h });
      const name = `${job.outBase}-封面-${tag}.jpg`;
      await post(name, await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)));
      files.push(name);
    }
    return { covers: files };
  }

  const audio = scene.audio ? await renderAudio(scene, log) : null;
  if (audio) log(`audio ${JSON.stringify(audio.info)}`);
  const video = await renderVideo(scene, canvas, ctx, log);
  const mp4 = muxMP4(audio ? [video.track, audio.track] : [video.track]);
  await post(job.out, mp4);
  let silent = null;
  if (audio && job.silentCopy) {
    silent = job.out.replace(/\.mp4$/i, '-无声.mp4');
    await post(silent, muxMP4([video.track]));
  }
  return { out: job.out, silent, bytes: mp4.length, video: video.info, audio: audio?.info ?? null };
};
