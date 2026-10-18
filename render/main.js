import * as S from './shaders.js';
import { makeTimeline, FPS, SC, sceneState } from './timeline.js';
import { TextLayer } from './text.js';

const W = 1920, H = 1080, FW = 640, FH = 360, ASPECT = W / H;
const N_MAIN = 30000, N_DETAIL = 16000, N = N_MAIN + N_DETAIL;

let gl, prog = {}, fbo = {}, quad, strokeVao, dataTex, inst, textLayer, textTex, feat, timing, TL;
const DATA_W = 1024, DATA_H = Math.ceil(N * 2 / 1024);
const flowPix = new Uint8Array(FW * FH * 4);
const KEYS = ['x', 'y', 'age', 'life', 'dx', 'dy', 'seed', 'rl', 'rw'];
const P = Object.fromEntries(KEYS.map((k) => [k, new Float32Array(N)]));
let rng = 1234567, prevCam = null, prevKey = null;
const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296);

function compile(vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); const m = /0:(\d+)/.exec(log); const ln = m ? +m[1] : 0;
      throw new Error(log + '\n' + src.split('\n').slice(Math.max(0, ln - 4), ln + 2).map((l, i) => `${Math.max(1, ln - 3) + i}: ${l}`).join('\n')); } return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
function tex(w, h) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t;
}
function target(w, h, n = 1) {
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); const ts = [];
  for (let i = 0; i < n; i++) { const t = tex(w, h); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0); ts.push(t); }
  gl.drawBuffers(ts.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo incomplete');
  return { f, ts, w, h };
}
// The field shader is specialised per frame: only the scenes, shot and features actually on screen are
// compiled in (SwiftShader runs every branch otherwise). Variants are cached.
const fieldCache = {};
function fieldVariant(u) {
  const useMix = u.uMix > 0 && u.uMix < 1, a = u.uMix >= 1 ? u.uSceneB : u.uSceneA, b = u.uSceneB;
  const scenes = new Set([a]); if (useMix) scenes.add(b);
  const D = [`SA ${a}`, `SB ${b}`, `SHOT ${Math.round(u.uShot)}`]; if (useMix) D.push('MIX');
  const on = { HEART: u.uHeart, MANY: u.uMany, MOON: u.uMoon, VIL: u.uVillage, FIG: u.uFigure, BIGFIG: u.uBigFig, CYP: u.uCypress, DAY: u.uSun,
    WALL: u.uWall, BARS: u.uBars, GALLERY: u.uGallery, CROWD: u.uCrowd, FLASH: u.uFlash, TINT: u.uTint[3], DRAIN: u.uDrain };
  for (const k in on) if (on[k] > 1e-3) D.push(k);
  const key = D.join('|');
  if (!fieldCache[key]) {
    const M = S.FIELD, need = (k) => scenes.has(k);
    let src = M.HEAD + (need(SC.NIGHT) || need(SC.MODERN) ? M.NIGHT : '') + (need(SC.LETTER) ? M.LETTER : '') + (need(SC.ARLES) ? M.ARLES : '')
      + (need(SC.CROWS) || need(SC.GRAVE) ? M.CROWS : '') + (need(SC.LETTERS) ? M.LETTERS : '') + (need(SC.MODERN) ? M.MODERN : '') + M.MAIN;
    src = src.replace('#version 300 es\n', '#version 300 es\n' + D.map((d) => `#define ${d}`).join('\n') + '\n');
    fieldCache[key] = compile(S.FULLSCREEN_VS, src);
  }
  return fieldCache[key];
}
function spawn(i, initial) {
  P.x[i] = -30 + rand() * (W + 60); P.y[i] = -30 + rand() * (H + 60);
  P.life[i] = 0.9 + rand() * 1.8; P.age[i] = initial ? rand() * P.life[i] : 0;
  P.seed[i] = rand() * 1000; P.rl[i] = 0.8 + rand() * 0.45; P.rw[i] = 0.85 + rand() * 0.3; P.dx[i] = 1; P.dy[i] = 0;
}

export function renderFrame(t, dt = 1 / FPS) {
  const st = TL.sceneAt(t), u = st.u, cam = u.uCam;
  u.uAspect = ASPECT; u.uTime = t;
  // 1) scene field
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.field.f); gl.viewport(0, 0, FW, FH);
  const fp = fieldVariant(u); gl.useProgram(fp.p); setU(fp, u); drawQuad();
  gl.readBuffer(gl.COLOR_ATTACHMENT1); gl.readPixels(0, 0, FW, FH, gl.RGBA, gl.UNSIGNED_BYTE, flowPix);
  // 2) advect strokes in world space (they follow flow and camera); on hard cuts don't re-project
  if (st.cutKey !== prevKey) prevCam = null;
  prevKey = st.cutKey;
  const pc = prevCam || cam;
  const cr0 = Math.cos(pc[3]), sr0 = Math.sin(pc[3]), cr1 = Math.cos(cam[3]), sr1 = Math.sin(cam[3]);
  const spd = st.speed, dta = dt * st.ageMul, zs = Math.min(1.6, Math.max(0.75, Math.sqrt(cam[2]))) * st.strokeScale;
  for (let i = 0; i < N; i++) {
    P.age[i] += dta;
    if (P.age[i] > P.life[i]) spawn(i, false);
    const sx = (P.x[i] / W - 0.5) * ASPECT, sy = 0.5 - P.y[i] / H;
    let wx = pc[0] + (cr0 * sx - sr0 * sy) / pc[2], wy = pc[1] + (sr0 * sx + cr0 * sy) / pc[2];
    const fx = Math.min(FW - 1, Math.max(0, (P.x[i] / W) * FW | 0)), fy = Math.min(FH - 1, Math.max(0, (1 - P.y[i] / H) * FH | 0)), k4 = (fy * FW + fx) * 4;
    const vx = (flowPix[k4] / 255 - 0.5) / 2, vy = (flowPix[k4 + 1] / 255 - 0.5) / 2, sz = flowPix[k4 + 2] / 255, vis = flowPix[k4 + 3] / 255;
    wx += vx * dt * spd; wy += vy * dt * spd;
    const qx = (wx - cam[0]) * cam[2], qy = (wy - cam[1]) * cam[2];
    P.x[i] = ((cr1 * qx + sr1 * qy) / ASPECT + 0.5) * W; P.y[i] = (0.5 - (-sr1 * qx + cr1 * qy)) * H;
    if (P.x[i] < -40 || P.x[i] > W + 40 || P.y[i] < -40 || P.y[i] > H + 40) spawn(i, false);
    const ex = cr1 * vx + sr1 * vy, ey = -(-sr1 * vx + cr1 * vy), m = Math.hypot(ex, ey);
    if (m > 1e-5) { let dx = P.dx[i] * 0.65 + (ex / m) * 0.35, dy = P.dy[i] * 0.65 + (ey / m) * 0.35; const mm = Math.hypot(dx, dy) || 1; P.dx[i] = dx / mm; P.dy[i] = dy / mm; }
    let len = (10 + 33 * sz) * P.rl[i] * zs, wid = (4.4 + 8.0 * sz) * P.rw[i] * zs;
    let a = Math.min(1, P.age[i] / 0.22) * Math.min(1, (P.life[i] - P.age[i]) / 0.35) * vis;
    if (i >= N_MAIN) { len *= 0.5; wid *= 0.55; a *= Math.min(1, Math.max(0, (0.5 - sz) / 0.25)); }
    if (a < 0.02) { len = 0; wid = 0; }              // invisible: degenerate quad, nothing to rasterise
    const o = i * 8;
    inst[o] = P.x[i]; inst[o + 1] = P.y[i]; inst[o + 2] = P.dx[i]; inst[o + 3] = P.dy[i];
    inst[o + 4] = len; inst[o + 5] = wid; inst[o + 6] = a * 0.96; inst[o + 7] = P.seed[i];
  }
  prevCam = cam.slice();
  // 3) paint: underpainting + strokes
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.paint.f); gl.viewport(0, 0, W, H);
  gl.useProgram(prog.under.p); bindTex(0, fbo.field.ts[0], prog.under.u.uColor); bindTex(1, fbo.field.ts[1], prog.under.u.uFlow); drawQuad();
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(prog.stroke.p); bindTex(0, fbo.field.ts[0], prog.stroke.u.uColor); gl.uniform2f(prog.stroke.u.uScreen, W, H);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dataTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, DATA_W, DATA_H, gl.RGBA, gl.FLOAT, inst); gl.uniform1i(prog.stroke.u.uData, 1);
  gl.bindVertexArray(strokeVao); gl.drawArrays(gl.TRIANGLES, 0, N * 6);
  gl.disable(gl.BLEND);
  // 4) bloom
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.b1.f); gl.viewport(0, 0, fbo.b1.w, fbo.b1.h);
  gl.useProgram(prog.bright.p); bindTex(0, fbo.paint.ts[0], prog.bright.u.uTex); drawQuad();
  for (let k = 0; k < 2; k++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.b2.f); gl.useProgram(prog.blur.p); bindTex(0, fbo.b1.ts[0], prog.blur.u.uTex); gl.uniform2f(prog.blur.u.uDir, (1.6 + k) / fbo.b1.w, 0); drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.b1.f); bindTex(0, fbo.b2.ts[0], prog.blur.u.uTex); gl.uniform2f(prog.blur.u.uDir, 0, (1.6 + k) / fbo.b1.h); drawQuad();
  }
  // 5) text (letter handwriting is visible while the letter scene is)
  const ss = sceneState(t), letterA = (ss.b === SC.LETTER ? ss.mix : 0) + (ss.a === SC.LETTER && ss.b !== SC.LETTER ? 1 - ss.mix : 0);
  const tc = textLayer.render(t, TL.textAt(t), cam, letterA);
  gl.bindTexture(gl.TEXTURE_2D, textTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, tc);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  // 6) final composite
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
  gl.useProgram(prog.final.p);
  bindTex(0, fbo.paint.ts[0], prog.final.u.uPaint); bindTex(1, fbo.b1.ts[0], prog.final.u.uBloom); bindTex(2, textTex, prog.final.u.uText);
  gl.uniform1f(prog.final.u.uBloomAmt, 0.55 + 0.25 * st.pulse);
  gl.uniform1f(prog.final.u.uFade, Math.max(0, st.fade)); gl.uniform1f(prog.final.u.uWhite, st.white);
  drawQuad();
  gl.finish();
}

function setU(p, u) {
  for (const k in u) {
    const loc = p.u[k]; if (!loc) continue; const v = u[k];
    if (typeof v === 'number') gl.uniform1f(loc, v); else if (v.length === 2) gl.uniform2fv(loc, v); else gl.uniform4fv(loc, v);
  }
}
function drawQuad() { gl.bindVertexArray(quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
function bindTex(unit, t, loc) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); }

export async function init(canvas) {
  const [ft, tm] = await Promise.all([fetch('../data/audio_features.json').then((r) => r.json()), fetch('../data/lyrics_timing.json').then((r) => r.json())]);
  feat = ft; timing = tm; TL = makeTimeline(timing, feat);
  const face = new FontFace('LXGW', 'url(../assets/fonts/LXGWWenKai-Medium.ttf)'); await face.load(); document.fonts.add(face);
  canvas.width = W; canvas.height = H;
  gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false });
  if (!gl) throw new Error('no webgl2');
  prog.stroke = compile(S.STROKE_VS, S.STROKE_FS);
  prog.under = compile(S.FULLSCREEN_VS, S.UNDER_FS); prog.bright = compile(S.FULLSCREEN_VS, S.BRIGHT_FS);
  prog.blur = compile(S.FULLSCREEN_VS, S.BLUR_FS); prog.final = compile(S.FULLSCREEN_VS, S.FINAL_FS);
  fbo.field = target(FW, FH, 2); fbo.paint = target(W, H); fbo.b1 = target(W / 4, H / 4); fbo.b2 = target(W / 4, H / 4);
  textTex = tex(W, H);
  quad = gl.createVertexArray(); gl.bindVertexArray(quad);
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  strokeVao = gl.createVertexArray();
  inst = new Float32Array(DATA_W * DATA_H * 4);
  dataTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, dataTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, DATA_W, DATA_H, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindVertexArray(null);
  for (let i = 0; i < N; i++) spawn(i, true);
  textLayer = new TextLayer(W, H, timing.lines);
  return { W, H, fps: FPS };
}

// warm the stroke population up so the first frame already looks painted
export function warmup(t, frames = 20) { prevCam = null; prevKey = null; for (let k = frames; k > 0; k--) renderFrame(t - k / FPS); }

// exact continuation across separately rendered chunks
export function saveState() {
  const b64 = (a) => { const u8 = new Uint8Array(a.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  return JSON.stringify({ rng, prevCam, prevKey, P: Object.fromEntries(KEYS.map((k) => [k, b64(P[k])])) });
}
export function loadState(json) {
  const s = JSON.parse(json); rng = s.rng; prevCam = s.prevCam; prevKey = s.prevKey;
  for (const k of KEYS) { const bin = atob(s.P[k]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); P[k].set(new Float32Array(u8.buffer)); }
}
