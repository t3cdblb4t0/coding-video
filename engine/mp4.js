// Minimal MP4 (ISO BMFF) muxer: one H.264 video track + optional Opus audio track.
// Writes moov before mdat ("faststart") and interleaves samples in ~1 s chunks.
//
// Track shapes:
//   video: { kind: 'video', timescale, width, height, avcC: Uint8Array, samples: [{ data, duration, key }] }
//   audio: { kind: 'audio', timescale: 48000, channels, preSkip, inputSampleRate, samples: [{ data, duration }] }

const te = new TextEncoder();
const u8 = (n) => Uint8Array.of(n & 255);
const u16 = (n) => Uint8Array.of((n >>> 8) & 255, n & 255);
const u24 = (n) => Uint8Array.of((n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const u32 = (n) => Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const str = (s) => te.encode(s);
const zeros = (n) => new Uint8Array(n);

function concat(parts) {
  const flat = parts.flat(Infinity);
  let len = 0;
  for (const p of flat) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of flat) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function box(type, ...parts) {
  const body = concat(parts);
  return concat([u32(body.length + 8), str(type), body]);
}

function fullBox(type, version, flags, ...parts) {
  return box(type, u8(version), u24(flags), ...parts);
}

const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32);

function runLength(values) {
  const runs = [];
  for (const v of values) {
    const last = runs[runs.length - 1];
    if (last && last[1] === v) last[0]++;
    else runs.push([1, v]);
  }
  return runs;
}

function sampleEntry(track) {
  if (track.kind === 'video') {
    return box(
      'avc1',
      zeros(6), u16(1), // reserved, data_reference_index
      u16(0), u16(0), zeros(12), // pre_defined, reserved, pre_defined
      u16(track.width), u16(track.height),
      u32(0x00480000), u32(0x00480000), u32(0), // 72 dpi, reserved
      u16(1), zeros(32), // frame_count, compressorname
      u16(0x0018), u16(0xffff), // depth, pre_defined
      box('avcC', track.avcC),
      // BT.709 primaries / transfer / matrix, limited range — matches engine/runtime.js rgbaToI420.
      box('colr', str('nclx'), u16(1), u16(1), u16(1), u8(0)),
      box('pasp', u32(1), u32(1)),
    );
  }
  return box(
    'Opus',
    zeros(6), u16(1), // reserved, data_reference_index
    zeros(8), // version, revision, vendor
    u16(track.channels), u16(16), u16(0), u16(0),
    u32(48000 * 65536), // sample rate, 16.16 fixed point (always 48 kHz for Opus)
    box('dOps', u8(0), u8(track.channels), u16(track.preSkip), u32(track.inputSampleRate), u16(0), u8(0)),
  );
}

function trak(track, id, chunks, movieTimescale) {
  const isVideo = track.kind === 'video';
  const mediaDuration = track.samples.reduce((s, x) => s + x.duration, 0);
  const trackDuration = Math.round((mediaDuration * movieTimescale) / track.timescale);

  const tkhd = fullBox(
    'tkhd', 0, 3, // enabled | in_movie
    u32(0), u32(0), u32(id), u32(0), u32(trackDuration), zeros(8),
    u16(0), u16(isVideo ? 0 : 1), u16(isVideo ? 0 : 0x0100), u16(0),
    MATRIX,
    u32(isVideo ? track.width * 65536 : 0), u32(isVideo ? track.height * 65536 : 0),
  );
  const mdhd = fullBox('mdhd', 0, 0, u32(0), u32(0), u32(track.timescale), u32(mediaDuration), u16(0x55c4), u16(0));
  const hdlr = fullBox(
    'hdlr', 0, 0, u32(0), str(isVideo ? 'vide' : 'soun'), zeros(12),
    str(isVideo ? 'VideoHandler' : 'SoundHandler'), u8(0),
  );
  const mediaHeader = isVideo ? fullBox('vmhd', 0, 1, u16(0), zeros(6)) : fullBox('smhd', 0, 0, u16(0), u16(0));
  const dinf = box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1)));

  const sttsRuns = runLength(track.samples.map((s) => s.duration));
  const stts = fullBox('stts', 0, 0, u32(sttsRuns.length), sttsRuns.map(([n, d]) => [u32(n), u32(d)]));

  const stscRuns = [];
  chunks.forEach((c, i) => {
    const last = stscRuns[stscRuns.length - 1];
    if (!last || last[1] !== c.samples.length) stscRuns.push([i + 1, c.samples.length]);
  });
  const stsc = fullBox('stsc', 0, 0, u32(stscRuns.length), stscRuns.map(([first, n]) => [u32(first), u32(n), u32(1)]));
  const stsz = fullBox('stsz', 0, 0, u32(0), u32(track.samples.length), track.samples.map((s) => u32(s.data.length)));
  const stco = fullBox('stco', 0, 0, u32(chunks.length), chunks.map((c) => u32(c.offset)));

  const tables = [fullBox('stsd', 0, 0, u32(1), sampleEntry(track)), stts];
  if (isVideo) {
    const keys = [];
    track.samples.forEach((s, i) => s.key && keys.push(i + 1));
    tables.push(fullBox('stss', 0, 0, u32(keys.length), keys.map(u32)));
  }
  tables.push(stsc, stsz, stco);

  return box('trak', tkhd, box('mdia', mdhd, hdlr, box('minf', mediaHeader, dinf, box('stbl', ...tables))));
}

function planChunks(track, trackIndex, chunkSeconds) {
  const chunks = [];
  let t = 0;
  let current = null;
  track.samples.forEach((s, i) => {
    const bucket = Math.floor(t / (track.timescale * chunkSeconds));
    if (!current || current.bucket !== bucket) {
      current = { track: trackIndex, bucket, start: t / track.timescale, samples: [], offset: 0 };
      chunks.push(current);
    }
    current.samples.push(i);
    t += s.duration;
  });
  return chunks;
}

export function muxMP4(tracks, { chunkSeconds = 1 } = {}) {
  const movieTimescale = 1000;
  const perTrack = tracks.map((t, i) => planChunks(t, i, chunkSeconds));
  const ordered = perTrack.flat().sort((a, b) => a.start - b.start || a.track - b.track);
  const movieDuration = Math.max(
    ...tracks.map((t) => Math.round((t.samples.reduce((s, x) => s + x.duration, 0) * movieTimescale) / t.timescale)),
  );

  const ftyp = box('ftyp', str('isom'), u32(512), str('isom'), str('iso2'), str('avc1'), str('mp41'));
  const buildMoov = () =>
    box(
      'moov',
      fullBox(
        'mvhd', 0, 0, u32(0), u32(0), u32(movieTimescale), u32(movieDuration),
        u32(0x00010000), u16(0x0100), u16(0), zeros(8), MATRIX, zeros(24), u32(tracks.length + 1),
      ),
      ...tracks.map((t, i) => trak(t, i + 1, perTrack[i], movieTimescale)),
    );

  // moov size does not depend on the offset values, so measure once, then fill offsets in.
  const moovSize = buildMoov().length;
  let offset = ftyp.length + moovSize + 8;
  for (const c of ordered) {
    c.offset = offset;
    for (const i of c.samples) offset += tracks[c.track].samples[i].data.length;
  }
  if (offset > 0xffffffff) throw new Error('output exceeds 4 GB; 64-bit offsets are not implemented');
  const moov = buildMoov();

  const out = new Uint8Array(offset);
  out.set(ftyp, 0);
  out.set(moov, ftyp.length);
  let o = ftyp.length + moov.length;
  out.set(u32(offset - o), o);
  out.set(str('mdat'), o + 4);
  o += 8;
  for (const c of ordered) {
    for (const i of c.samples) {
      const d = tracks[c.track].samples[i].data;
      out.set(d, o);
      o += d.length;
    }
  }
  return out;
}
