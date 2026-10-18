import * as S from './shaders.js';
import { sceneAt, textAt, SAMPLE } from './timeline.js';
import { TextLayer } from './text.js';

const W = 1920, H = 1080, FW = 640, FH = 360, ASPECT = W / H;
const N_MAIN = 30000, N_DETAIL = 16000, N = N_MAIN + N_DETAIL;

let gl, prog = {}, fbo = {}, quad, strokeVao, instBuf, inst, textLayer, textTex, feat, timing;
const flowPix = new Uint8Array(FW * FH * 4);
const P = { x: new Float32Array(N), y: new Float32Array(N), age: new Float32Array(N), life: new Float32Array(N),
  dx: new Float32Array(N), dy: new Float32Array(N), seed: new Float32Array(N), rl: new Float32Array(N), rw: new Float32Array(N) };
let rng = 1234567;
const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296);
let prevCam = null, frameNo = 0;

function compile(vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n').slice(0, 3000)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
function tex(w, h, filter = gl.LINEAR) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function target(w, h, n = 1) {
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  const ts = [];
  for (let i = 0; i < n; i++) { const t = tex(w, h); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0); ts.push(t); }
  gl.drawBuffers(ts.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo incomplete');
  return { f, ts, w, h };
}

export async function init(canvas) {
  const [ft, tm] = await Promise.all([fetch('../data/audio_features.json').then((r) => r.json()), fetch('../data/lyrics_timing.json').then((r) => r.json())]);
  feat = ft; timing = tm;
  const face = new FontFace('LXGW', 'url(../assets/fonts/LXGWWenKai-Medium.ttf)'); await face.load(); document.fonts.add(face);
  canvas.width = W; canvas.height = H;
  gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false });
  if (!gl) throw new Error('no webgl2');
  prog.field = compile(S.FULLSCREEN_VS, S.FIELD_FS);
  prog.stroke = compile(S.STROKE_VS, S.STROKE_FS);
  prog.under = compile(S.FULLSCREEN_VS, S.UNDER_FS);
  prog.bright = compile(S.FULLSCREEN_VS, S.BRIGHT_FS);
  prog.blur = compile(S.FULLSCREEN_VS, S.BLUR_FS);
  prog.final = compile(S.FULLSCREEN_VS, S.FINAL_FS);
  fbo.field = target(FW, FH, 2);
  fbo.paint = target(W, H);
  fbo.b1 = target(W / 4, H / 4); fbo.b2 = target(W / 4, H / 4);
  textTex = tex(W, H);

  quad = gl.createVertexArray(); gl.bindVertexArray(quad);
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  strokeVao = gl.createVertexArray(); gl.bindVertexArray(strokeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  inst = new Float32Array(N * 8);
  instBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);

  for (let i = 0; i < N; i++) spawn(i, true);
  textLayer = new TextLayer(W, H, timing.lines);
  return { W, H, sample: SAMPLE };
}

function spawn(i, initial) {
  P.x[i] = -30 + rand() * (W + 60); P.y[i] = -30 + rand() * (H + 60);
  P.life[i] = 0.9 + rand() * 1.8; P.age[i] = initial ? rand() * P.life[i] : 0;
  P.seed[i] = rand() * 1000; P.rl[i] = 0.8 + rand() * 0.45; P.rw[i] = 0.85 + rand() * 0.3;
  P.dx[i] = 1; P.dy[i] = 0;
}

function sampleFlow(x, y) {
  const fx = Math.min(FW - 1, Math.max(0, (x / W) * FW | 0)), fy = Math.min(FH - 1, Math.max(0, (1 - y / H) * FH | 0));
  const k = (fy * FW + fx) * 4;
  return [(flowPix[k] / 255 - 0.5) / 2, (flowPix[k + 1] / 255 - 0.5) / 2, flowPix[k + 2] / 255];
}

function setU(p, u) {
  for (const k in u) {
    const loc = p.u[k]; if (!loc) continue; const v = u[k];
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2fv(loc, v);
    else if (v.length === 4) gl.uniform4fv(loc, v);
    else gl.uniform4fv(loc, v);
  }
}
function drawQuad() { gl.bindVertexArray(quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
function bindTex(unit, t, loc) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); }

export function renderFrame(t, dt = 1 / 30) {
  const u = sceneAt(t, timing.beat_grid, feat);
  u.uAspect = ASPECT; u.uTime = t;
  const cam = u.uCam;

  // 1) scene field
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.field.f); gl.viewport(0, 0, FW, FH);
  gl.useProgram(prog.field.p); setU(prog.field, u); drawQuad();
  gl.readBuffer(gl.COLOR_ATTACHMENT1);
  gl.readPixels(0, 0, FW, FH, gl.RGBA, gl.UNSIGNED_BYTE, flowPix);

  // 2) advect strokes in world space so they follow both the flow and the camera
  const pc = prevCam || cam;
  const cr0 = Math.cos(pc[3]), sr0 = Math.sin(pc[3]), cr1 = Math.cos(cam[3]), sr1 = Math.sin(cam[3]);
  const spd = u.speed;
  for (let i = 0; i < N; i++) {
    P.age[i] += dt;
    if (P.age[i] > P.life[i]) spawn(i, false);
    const sx = (P.x[i] / W - 0.5) * ASPECT, sy = 0.5 - P.y[i] / H;
    let wx = pc[0] + (cr0 * sx - sr0 * sy) / pc[2], wy = pc[1] + (sr0 * sx + cr0 * sy) / pc[2];
    const [vx, vy, sz] = sampleFlow(P.x[i], P.y[i]);
    wx += vx * dt * spd; wy += vy * dt * spd;
    const qx = (wx - cam[0]) * cam[2], qy = (wy - cam[1]) * cam[2];
    const nx = cr1 * qx + sr1 * qy, ny = -sr1 * qx + cr1 * qy;
    P.x[i] = (nx / ASPECT + 0.5) * W; P.y[i] = (0.5 - ny) * H;
    if (P.x[i] < -40 || P.x[i] > W + 40 || P.y[i] < -40 || P.y[i] > H + 40) { spawn(i, false); }
    // stroke direction in screen space (y down), smoothed
    const ex = cr1 * vx + sr1 * vy, ey = -(-sr1 * vx + cr1 * vy), m = Math.hypot(ex, ey);
    if (m > 1e-5) { const k = 0.35; let dx = P.dx[i] * (1 - k) + (ex / m) * k, dy = P.dy[i] * (1 - k) + (ey / m) * k; const mm = Math.hypot(dx, dy) || 1; P.dx[i] = dx / mm; P.dy[i] = dy / mm; }
    const detail = i >= N_MAIN;
    const zs = Math.min(1.6, Math.max(0.75, Math.sqrt(cam[2])));
    let len = (10 + 33 * sz) * P.rl[i] * zs, wid = (4.4 + 8.0 * sz) * P.rw[i] * zs;
    let a = Math.min(1, P.age[i] / 0.22) * Math.min(1, (P.life[i] - P.age[i]) / 0.35);
    if (detail) { len *= 0.5; wid *= 0.55; a *= Math.min(1, Math.max(0, (0.5 - sz) / 0.25)); }
    const o = i * 8;
    inst[o] = P.x[i]; inst[o + 1] = P.y[i]; inst[o + 2] = P.dx[i]; inst[o + 3] = P.dy[i];
    inst[o + 4] = len; inst[o + 5] = wid; inst[o + 6] = a * 0.96; inst[o + 7] = P.seed[i];
  }
  prevCam = cam.slice();

  // 3) paint: underpainting + strokes
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.paint.f); gl.viewport(0, 0, W, H);
  gl.useProgram(prog.under.p); bindTex(0, fbo.field.ts[0], prog.under.u.uColor); drawQuad();
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(prog.stroke.p); bindTex(0, fbo.field.ts[0], prog.stroke.u.uColor); gl.uniform2f(prog.stroke.u.uScreen, W, H);
  gl.bindVertexArray(strokeVao); gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N);
  gl.disable(gl.BLEND);

  // 4) bloom
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.b1.f); gl.viewport(0, 0, fbo.b1.w, fbo.b1.h);
  gl.useProgram(prog.bright.p); bindTex(0, fbo.paint.ts[0], prog.bright.u.uTex); drawQuad();
  for (let k = 0; k < 2; k++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.b2.f); gl.useProgram(prog.blur.p); bindTex(0, fbo.b1.ts[0], prog.blur.u.uTex); gl.uniform2f(prog.blur.u.uDir, (1.6 + k) / fbo.b1.w, 0); drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.b1.f); bindTex(0, fbo.b2.ts[0], prog.blur.u.uTex); gl.uniform2f(prog.blur.u.uDir, 0, (1.6 + k) / fbo.b1.h); drawQuad();
  }

  // 5) text
  const info = textAt(t);
  const tc = textLayer.render(t, info);
  gl.bindTexture(gl.TEXTURE_2D, textTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, tc);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  // 6) final composite to the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
  gl.useProgram(prog.final.p);
  bindTex(0, fbo.paint.ts[0], prog.final.u.uPaint); bindTex(1, fbo.b1.ts[0], prog.final.u.uBloom); bindTex(2, textTex, prog.final.u.uText);
  gl.uniform1f(prog.final.u.uFrame, frameNo++); gl.uniform1f(prog.final.u.uBloomAmt, 0.55 + 0.25 * u.uPulse);
  gl.uniform1f(prog.final.u.uFade, Math.max(0, u.fade)); gl.uniform1f(prog.final.u.uTextOn, 1);
  drawQuad();
  gl.finish();
}

// warm the stroke population up so the first frame already looks painted
export function warmup(t, frames = 24) { prevCam = null; for (let k = frames; k > 0; k--) renderFrame(t - k / 30); }
