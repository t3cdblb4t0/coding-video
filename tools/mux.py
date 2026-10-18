#!/usr/bin/env python3
"""Mux WebCodecs H.264 output with the ORIGINAL AAC track of 梵高.mp4 (no audio re-encode).

usage: python3 tools/mux.py out/sample_chorus1            -> out/sample_chorus1.mp4
       (reads out/<name>.h264 + out/<name>.json written by tools/render.js)
"""
import base64, json, struct, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '梵高.mp4')


def box(typ, *payload):
    data = b''.join(payload)
    return struct.pack('>I4s', 8 + len(data), typ.encode()) + data


def full(typ, version, flags, *payload):
    return box(typ, struct.pack('>I', (version << 24) | flags), *payload)


# ---------------------------------------------------------------- source parsing
def children(buf, off, end):
    while off < end:
        size, typ = struct.unpack('>I4s', buf[off:off + 8]); hdr = 8
        if size == 1: size = struct.unpack('>Q', buf[off + 8:off + 16])[0]; hdr = 16
        if size == 0: size = end - off
        yield typ.decode('latin1'), off, off + hdr, off + size
        off += size


def find(buf, off, end, path):
    for typ, start, body, stop in children(buf, off, end):
        if typ == path[0]:
            return (start, body, stop) if len(path) == 1 else find(buf, body, stop, path[1:])
    return None


def source_audio():
    buf = open(SRC, 'rb').read()
    _, moov, moov_end = find(buf, 0, len(buf), ['moov'])
    for typ, start, body, stop in children(buf, moov, moov_end):
        if typ != 'trak': continue
        _, h, _ = find(buf, body, stop, ['mdia', 'hdlr'])
        if buf[h + 8:h + 12] != b'soun': continue
        _, md, _ = find(buf, body, stop, ['mdia', 'mdhd'])
        ts = struct.unpack('>I', buf[md + 12:md + 16])[0] if buf[md] == 0 else struct.unpack('>I', buf[md + 20:md + 24])[0]
        st = find(buf, body, stop, ['mdia', 'minf', 'stbl'])
        get = lambda n: find(buf, st[1], st[2], [n])
        s0, _, s1 = get('stsd'); stsd = buf[s0:s1]
        _, b, _ = get('stsz'); fixed, cnt = struct.unpack('>II', buf[b + 4:b + 12])
        sizes = [fixed] * cnt if fixed else list(struct.unpack('>%dI' % cnt, buf[b + 12:b + 12 + 4 * cnt]))
        co = get('stco'); big = False
        if co is None: co = get('co64'); big = True
        _, b, _ = co; n = struct.unpack('>I', buf[b + 4:b + 8])[0]
        offs = list(struct.unpack('>%d%s' % (n, 'Q' if big else 'I'), buf[b + 8:b + 8 + (8 if big else 4) * n]))
        _, b, _ = get('stsc'); n = struct.unpack('>I', buf[b + 4:b + 8])[0]
        stsc = [struct.unpack('>III', buf[b + 8 + 12 * i:b + 20 + 12 * i]) for i in range(n)]
        _, b, _ = get('stts'); n = struct.unpack('>I', buf[b + 4:b + 8])[0]
        stts = [struct.unpack('>II', buf[b + 8 + 8 * i:b + 16 + 8 * i]) for i in range(n)]
        el = find(buf, body, stop, ['edts', 'elst']); media_time = 0
        if el:
            # full box: version/flags(4) entry_count(4) then segment_duration, media_time, rate
            v = buf[el[1]]; media_time = struct.unpack('>i', buf[el[1] + 12:el[1] + 16])[0] if v == 0 else struct.unpack('>q', buf[el[1] + 16:el[1] + 24])[0]
        # flatten sample offsets
        samples, si = [], 0
        for ci, choff in enumerate(offs):
            per = next(e[1] for e in reversed(stsc) if e[0] <= ci + 1)
            o = choff
            for _ in range(per):
                samples.append((o, sizes[si])); o += sizes[si]; si += 1
        # AAC frames are always 1024 samples; the source has occasional 1025 timestamp nudges, which we drop
        assert all(abs(d - 1024) <= 1 for _, d in stts), 'expected 1024-sample AAC frames'
        return buf, ts, stsd, samples, max(0, media_time)
    raise SystemExit('no audio track in source')


# ---------------------------------------------------------------- writers
def stbl(stsd, durations, sizes, chunk_counts, chunk_offsets, keys=None):
    stts, last = [], None
    for d in durations:
        if last is not None and last[1] == d: last[0] += 1
        else: last = [1, d]; stts.append(last)
    out = [stsd, full('stts', 0, 0, struct.pack('>I', len(stts)), b''.join(struct.pack('>II', c, d) for c, d in stts))]
    if keys is not None:
        k = [i + 1 for i, v in enumerate(keys) if v]
        out.append(full('stss', 0, 0, struct.pack('>I', len(k)), b''.join(struct.pack('>I', x) for x in k)))
    sc, prev = [], None
    for i, c in enumerate(chunk_counts):
        if c != prev: sc.append((i + 1, c, 1)); prev = c
    out.append(full('stsc', 0, 0, struct.pack('>I', len(sc)), b''.join(struct.pack('>III', *e) for e in sc)))
    out.append(full('stsz', 0, 0, struct.pack('>II', 0, len(sizes)), b''.join(struct.pack('>I', s) for s in sizes)))
    out.append(full('co64', 0, 0, struct.pack('>I', len(chunk_offsets)), b''.join(struct.pack('>Q', o) for o in chunk_offsets)))
    return box('stbl', *out)


MATRIX = struct.pack('>9I', 0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000)


def trak(tid, kind, ts, media_dur, movie_dur, w, h, stbl_box, elst=None):
    tkhd = full('tkhd', 0, 3, struct.pack('>IIIII', 0, 0, tid, 0, movie_dur), b'\0' * 8,
                struct.pack('>hhhH', 0, 0, 0x0100 if kind == 'soun' else 0, 0), MATRIX, struct.pack('>II', w << 16, h << 16))
    mdhd = full('mdhd', 0, 0, struct.pack('>IIII', 0, 0, ts, media_dur), struct.pack('>HH', 0x55c4, 0))
    name = b'SoundHandler\0' if kind == 'soun' else b'VideoHandler\0'
    hdlr = full('hdlr', 0, 0, struct.pack('>I4s', 0, kind.encode()), b'\0' * 12, name)
    xmhd = full('smhd', 0, 0, b'\0' * 4) if kind == 'soun' else full('vmhd', 0, 1, b'\0' * 8)
    dinf = box('dinf', full('dref', 0, 0, struct.pack('>I', 1), full('url ', 0, 1)))
    parts = [tkhd]
    if elst: parts.append(box('edts', full('elst', 0, 0, struct.pack('>I', 1), struct.pack('>IiI', movie_dur, elst, 0x10000))))
    parts.append(box('mdia', mdhd, hdlr, box('minf', xmhd, dinf, stbl_box)))
    return box('trak', *parts)


def main():
    base = os.path.join(ROOT, sys.argv[1]) if not os.path.isabs(sys.argv[1]) else sys.argv[1]
    meta = json.load(open(base + '.json'))
    vbin = open(base + '.h264', 'rb').read()
    fps, W, H = meta['fps'], meta['width'], meta['height']
    avcC = base64.b64decode(meta['avcC'])
    vs = meta['samples']; voffs, o = [], 0
    for s in vs: voffs.append(o); o += s['size']
    VTS, VDUR = 15360, 15360 // fps
    avc1 = box('avc1', b'\0' * 6, struct.pack('>H', 1), b'\0' * 16, struct.pack('>HHIIIH', W, H, 0x480000, 0x480000, 0, 1),
               b'\0' * 32, struct.pack('>Hh', 0x18, -1), box('avcC', avcC))
    vstsd = full('stsd', 0, 0, struct.pack('>I', 1), avc1)

    abuf, ATS, astsd, asamples, mt = source_audio()
    t0, t1 = meta['start'], meta['start'] + len(vs) / fps
    first = max(0, int((t0 * ATS + mt) // 1024) - 1)                 # one frame of pre-roll
    last = min(len(asamples), int(-(-(t1 * ATS + mt) // 1024)))
    skip = int(round(t0 * ATS + mt)) - first * 1024
    asel = asamples[first:last]

    # interleave ~1 s chunks
    chunks, vi, ai = [], 0, 0
    while vi < len(vs) or ai < len(asel):
        tv = vi / fps; ta = (first + ai) * 1024 / ATS - mt / ATS - t0
        if vi < len(vs) and (ai >= len(asel) or tv <= ta):
            n = min(fps, len(vs) - vi); chunks.append(('v', vi, n)); vi += n
        else:
            n = min(43, len(asel) - ai); chunks.append(('a', ai, n)); ai += n

    MOVIE_TS = 1000
    movie_dur = int(round((t1 - t0) * MOVIE_TS))
    def build(mdat_start):
        pos = mdat_start; vco, vcc, aco, acc = [], [], [], []
        for kind, i, n in chunks:
            if kind == 'v': vco.append(pos); vcc.append(n); pos += sum(vs[k]['size'] for k in range(i, i + n))
            else: aco.append(pos); acc.append(n); pos += sum(asel[k][1] for k in range(i, i + n))
        vt = trak(1, 'vide', VTS, len(vs) * VDUR, movie_dur, W, H,
                  stbl(vstsd, [VDUR] * len(vs), [s['size'] for s in vs], vcc, vco, [s['key'] for s in vs]))
        at = trak(2, 'soun', ATS, len(asel) * 1024, movie_dur, 0, 0,
                  stbl(astsd, [1024] * len(asel), [s for _, s in asel], acc, aco), elst=skip)
        mvhd = full('mvhd', 0, 0, struct.pack('>IIII', 0, 0, MOVIE_TS, movie_dur), struct.pack('>IH', 0x10000, 0x0100), b'\0' * 10,
                    MATRIX, b'\0' * 24, struct.pack('>I', 3))
        return box('moov', mvhd, vt, at)
    ftyp = box('ftyp', b'isom', struct.pack('>I', 512), b'isomiso2avc1mp41')
    payload_len = sum(s['size'] for s in vs) + sum(s for _, s in asel)
    moov = build(0)
    mdat_start = len(ftyp) + len(moov) + 16
    moov = build(mdat_start)
    out = base + '.mp4'
    with open(out, 'wb') as f:
        f.write(ftyp); f.write(moov); f.write(struct.pack('>I4sQ', 1, b'mdat', 16 + payload_len))
        for kind, i, n in chunks:
            for k in range(i, i + n):
                if kind == 'v': f.write(vbin[voffs[k]:voffs[k] + vs[k]['size']])
                else: off, sz = asel[k]; f.write(abuf[off:off + sz])
    print(f'{out}: {len(vs)} video frames ({sum(s["key"] for s in vs)} key), {len(asel)} AAC frames, '
          f'{(t1 - t0):.2f}s, {os.path.getsize(out) / 1e6:.1f} MB, codec {meta.get("codec")}')


if __name__ == '__main__':
    main()
