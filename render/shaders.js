// GLSL sources. World coords: screen height = 1, y up. The field pass outputs, per texel,
// colour + "star mask" and flow (world velocity, stroke size, stroke visibility).
// FIELD_FS is assembled from scene modules so each scene stays readable.

export const FULLSCREEN_VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oFlow;
uniform float uAspect, uTime, uPulse, uSpark, uSceneA, uSceneB, uMix, uDrain;
uniform vec4 uCam, uTint; uniform vec2 uMixC;
uniform float uSwirl, uTurb, uYellow, uMany, uStarGlow, uBright, uMoon, uGround, uFigure, uVillage, uCypress, uCold, uSun, uFlame, uHeart, uBigFig;
uniform vec2 uMorphC; uniform vec4 uStars[12];
uniform float uWall, uWallPan, uBars, uCut, uGallery, uCrowd, uFlash;
uniform float uShot, uShotT, uCrows, uStorm, uDot1, uDot2, uStones, uIvy, uLetT, uPaint, uDim, uPair, uLink, uCandle, uSketch;

struct F { vec3 c; vec2 v; float sz; float st; float vis; };
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2  hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdRBox(vec2 p, vec2 b, float r){ return sdBox(p, b - r) - r; }
float sdSeg(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float fill(float d){ return smoothstep(0.003, -0.002, d); }
void vortex(vec2 p, vec2 c, float R, float s, inout float psi, inout vec2 g){
  vec2 d = p - c; float e = exp(-dot(d, d) / (R * R)); psi += s * R * e; g += s * R * e * (-2.0 * d / (R * R)); }
vec2 curl(vec2 g){ return vec2(g.y, -g.x); }
float turbPsi(vec2 p){ return fbm(p * 3.2 + vec2(0.0, uTime * 0.04)); }
vec2 turbVel(vec2 p, float T){ float e = 0.004;
  return curl(T * vec2(turbPsi(p + vec2(e, 0)) - turbPsi(p - vec2(e, 0)), turbPsi(p + vec2(0, e)) - turbPsi(p - vec2(0, e))) / (2. * e)); }
void put(inout F f, vec3 c, vec2 v, float sz, float a){ f.c = mix(f.c, c, a); f.v = mix(f.v, v, a); f.sz = mix(f.sz, sz, a); f.st *= 1. - a; }
vec4 halo(vec2 p, vec2 c, float R, float b){
  float d = length(p - c) / R; if (d > 1.25) return vec4(0.);
  vec3 core = vec3(1.0, 0.98, 0.86), ringY = vec3(0.98, 0.83, 0.30), ringP = vec3(0.93, 0.95, 0.80), ringB = vec3(0.50, 0.70, 0.86);
  vec3 col = mix(ringY, ringP, 0.5 + 0.5 * cos(d * 21.0 - uTime * 0.6));
  col = mix(col, ringB, smoothstep(0.55, 1.05, d) * 0.65); col = mix(core, col, smoothstep(0.10, 0.30, d));
  return vec4(col * (0.85 + 0.25 * b), clamp(b, 0., 1.) * (1.0 - smoothstep(0.62, 1.2, d))); }
void addHalo(inout F f, vec2 p, vec2 c, float R, float b, float sz){ vec4 h = halo(p, c, R, b); if (h.a > 0.){ f.c = mix(f.c, h.rgb, h.a); f.sz = mix(f.sz, sz, h.a); f.st = max(f.st, h.a); } }
float hillBack(float x){ return -0.135 + 0.032 * sin(2.1 * x + 0.7) + 0.018 * sin(5.3 * x + 2.0); }
float hillFront(float x){ return -0.235 + 0.055 * sin(1.4 * x - 0.4) + 0.022 * sin(3.7 * x + 1.1); }
// a small human silhouette (feet at origin, height ~1); walk = phase, 0 = standing
float sdPerson(vec2 q, float walk){
  float sw = 0.12 * sin(walk) * step(0.001, abs(walk));
  float d = sdSeg(q, vec2(-0.03 + sw, 0.), vec2(-0.01, 0.45), 0.06);
  d = min(d, sdSeg(q, vec2(0.05 - sw, 0.), vec2(0.02, 0.45), 0.06));
  d = min(d, sdSeg(q, vec2(0.0, 0.45), vec2(0.0, 0.78), 0.12));
  d = min(d, length(q - vec2(0.0, 0.9)) - 0.085);
  return min(d, sdSeg(q, vec2(-0.16, 0.97), vec2(0.16, 0.97), 0.025)); }
// Arles daylight: turquoise swirling sky, a ringed sun, wheat below the horizon hz
F dayField(vec2 p, vec2 sunC, float sunR, float hz){
  F f; float t = uTime, psi = 0.; vec2 g = vec2(0.);
  vortex(p, sunC, 0.22 * sunR, 0.09, psi, g); vortex(p, vec2(-0.45, 0.28), 0.18, -0.04, psi, g);
  f.v = curl(g) + vec2(0.012, 0.); f.sz = 0.75; f.st = 0.; f.vis = 1.;
  f.c = mix(vec3(0.42, 0.72, 0.74), vec3(0.24, 0.52, 0.70), smoothstep(-0.1, 0.5, p.y));
  f.c = mix(f.c, vec3(0.80, 0.90, 0.78), smoothstep(0.7, 1.0, 0.5 + 0.5 * sin(psi * 300. + fbm(p * 6.) * 2.)) * 0.6);
  float ds = length(p - sunC) / sunR;
  vec3 sc = mix(vec3(1.0, 0.88, 0.35), vec3(0.97, 0.64, 0.18), 0.5 + 0.5 * cos(ds * 70. - t * 1.5));
  sc = mix(vec3(1.0, 0.95, 0.62), sc, smoothstep(0.04, 0.09, ds));
  float sa = 1. - smoothstep(0.16, 0.30, ds);
  f.c = mix(f.c, sc, sa); f.sz = mix(f.sz, 0.35, sa); f.st = sa * 0.6;
  float hd = hz + 0.02 * sin(2.6 * p.x + 1.0), fa = smoothstep(hd + 0.004, hd - 0.004, p.y);
  if (fa > 0.){
    float wb = 0.5 + 0.5 * sin(p.y * 90. + sin(p.x * 6. + t * 0.8) * 2. + fbm(p * 8.) * 3.);
    vec3 wc = mix(mix(vec3(0.80, 0.55, 0.12), vec3(0.97, 0.80, 0.25), wb), vec3(1.0, 0.92, 0.55), smoothstep(0.9, 1.0, wb) * 0.7);
    put(f, wc, vec2(1., 0.35 * sin(p.x * 6. + t * 0.8 + p.y * 10.)) * 0.05, 0.62, fa);
  }
  return f; }
`;

// ------------------------------------------------------------------ NIGHT (starry night + Arles day morph)
const NIGHT = `
F sNight(vec2 p){
  F f; float t = uTime, psi = 0.; vec2 g = vec2(0.); float sw = uSwirl;
  vortex(p, vec2(-0.13 + 0.015 * sin(t * 0.11), 0.19), 0.17, 0.070 * sw, psi, g);
  vortex(p, vec2(0.10, 0.14 + 0.01 * sin(t * 0.13)), 0.12, 0.060 * sw, psi, g);
  vortex(p, vec2(-0.52, 0.14), 0.10, -0.045 * sw, psi, g);
  vortex(p, vec2(0.60, 0.05), 0.11, 0.035 * sw, psi, g);
  float yc = 0.12 + 0.07 * sin(2.4 * p.x + 0.3), ycp = 0.168 * cos(2.4 * p.x + 0.3), wv = 0.075;
  float th = tanh((p.y - yc) / wv), sech2 = 1. - th * th, A = 0.05 * sw;
  psi += A * wv * th; g += vec2(-A * sech2 * ycp, A * sech2);
  vec2 moonC = vec2(0.63, 0.33);
  for (int i = 0; i < 12; i++){ vec4 st = uStars[i]; if (st.w <= 0.) continue; vortex(p, st.xy, st.z * 1.6, 0.05 * sw, psi, g); }
  vortex(p, moonC, 0.13, 0.045 * sw * uMoon, psi, g);
#ifdef DAY
  float morphK = (1. - uSun) * uSun * 4.;
  vortex(p, uMorphC, 0.35, 0.22 * morphK, psi, g);
#endif
  psi += 0.016 * uTurb * turbPsi(p);
  f.v = curl(g) + turbVel(p, 0.016 * uTurb) + vec2(0.006, 0.0);
#ifdef HEART
  if (uHeart > 0.){ vec2 dc = p - uCam.xy; f.v += normalize(dc + 1e-4) * uHeart * 0.08 * exp(-length(dc) * 2.); }
#endif
  float hgt = smoothstep(-0.15, 0.48, p.y);
  vec3 deep = vec3(0.035, 0.085, 0.27), mid = vec3(0.10, 0.25, 0.56), light = vec3(0.33, 0.55, 0.78), pale = vec3(0.70, 0.83, 0.82);
  f.c = mix(mix(light, mid, 0.55), deep, hgt);
  float band = 0.5 + 0.5 * sin(psi * 420. + fbm(p * 7.) * 2.2);
  f.c = mix(f.c, mix(mid, pale, smoothstep(0.62, 1.0, band)), 0.55 * smoothstep(0.25, 0.95, band));
  float yb = smoothstep(0.78, 0.95, 0.5 + 0.5 * sin(psi * 210. + 1.3 + fbm(p * 5. + 3.) * 2.));
  f.c = mix(f.c, vec3(0.93, 0.80, 0.36), yb * (0.18 + 0.75 * uYellow));
  f.sz = 0.72; f.st = 0.; f.vis = 1.;
#ifdef MANY
  if (uMany > 0.){
    vec2 cell = floor(p / 0.055);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
      vec2 cc = cell + vec2(i, j); float hh = hash12(cc + 7.1);
      if (hh > uMany * 0.48) continue;
      vec2 sp = (cc + 0.2 + 0.6 * hash22(cc)) * 0.055; if (sp.y < -0.05) continue;
      float tw = 0.65 + 0.35 * sin(t * (2. + 3. * hash12(cc + 1.)) + 20. * hash12(cc)) + 0.4 * uPulse;
      addHalo(f, p, sp, 0.008 + 0.009 * hash12(cc + 2.), tw * smoothstep(0., 0.6, uMany * 0.48 - hh + 0.3), 0.18);
    }
  }
#endif
  for (int i = 0; i < 12; i++){ vec4 st = uStars[i]; if (st.w <= 0.) continue;
    addHalo(f, p, st.xy, st.z * (1. + 0.12 * uPulse), st.w * uStarGlow * (1. + 0.35 * uPulse), 0.3); }
#ifdef MOON
  if (uMoon > 0.){
    vec4 h = halo(p, moonC, 0.15, 0.9 * uMoon);
    f.c = mix(f.c, mix(h.rgb, vec3(0.97, 0.72, 0.25), 0.35), h.a); f.sz = mix(f.sz, 0.32, h.a); f.st = max(f.st, h.a);
    float cres = step(length(p - moonC), 0.052) * step(0.045, length(p - moonC - vec2(0.022, 0.014))) * uMoon;
    f.c = mix(f.c, vec3(1.0, 0.72, 0.22), cres); f.sz = mix(f.sz, 0.15, cres); f.st = max(f.st, cres);
  }
#endif
  // ground
  float hb = hillBack(p.x), hf = hillFront(p.x), e = 0.002;
  if (p.y < hb + 0.004){
    float bb = 0.5 + 0.5 * sin((p.y - hb) * 160. + fbm(p * 9.) * 3.);
    vec2 td = normalize(vec2(2. * e, hillBack(p.x + e) - hillBack(p.x - e)));
    put(f, mix(vec3(0.10, 0.20, 0.32), vec3(0.20, 0.36, 0.48), bb * 0.7), td * 0.012, 0.55, smoothstep(hb + 0.004, hb - 0.004, p.y) * uGround);
  }
#ifdef VIL
  if (uVillage > 0. && p.y < hb + 0.10 && p.y > hb - 0.04 && p.x > -0.34 && p.x < 0.82){
    for (int i = 0; i < 17; i++){
      float fi = float(i), hx = -0.31 + fi * 0.068 + 0.022 * hash12(vec2(fi, 1.));
      float bw = 0.010 + 0.009 * hash12(vec2(fi, 2.)), bh = 0.005 + 0.007 * hash12(vec2(fi, 3.));
      if (i == 7){ bw = 0.010; bh = 0.020; }
      float by = hillBack(hx) - 0.006; vec2 q = p - vec2(hx, by + bh);
      float roofH = i == 7 ? 0.070 : 0.010 + 0.008 * hash12(vec2(fi, 5.));
      vec2 rq = p - vec2(hx, by + 2. * bh);
      float roof = (rq.y > 0. && rq.y < roofH && abs(rq.x) < (bw + 0.004) * (1. - rq.y / roofH)) ? 1. : 0.;
      float wallA = fill(sdBox(q, vec2(bw, bh))) * uVillage;
      if (wallA > 0.){
        vec2 cw = vec2(0.0075, 0.0068), wq = fract((q + vec2(bw, bh)) / cw) - 0.5;
        float win = step(abs(wq.x), 0.24) * step(abs(wq.y), 0.26) * step(0.55, hash12(floor((q + vec2(bw, bh)) / cw) + fi * 9.));
        put(f, mix(mix(vec3(0.16, 0.24, 0.36), vec3(0.30, 0.38, 0.48), hash12(vec2(fi, 4.))), vec3(1.0, 0.80, 0.30), win), vec2(0., 0.004), 0.12, wallA);
        f.st = max(f.st, win * wallA);
      }
      if (roof > 0.) put(f, vec3(0.08, 0.13, 0.22), vec2(0.006, 0.), 0.14, roof * uVillage);
    }
  }
#endif
  if (p.y < hf + 0.004){
    float bb = 0.5 + 0.5 * sin((p.y - hf) * 120. + fbm(p * 8. + 4.) * 3.);
    vec2 td = normalize(vec2(2. * e, hillFront(p.x + e) - hillFront(p.x - e)));
    put(f, mix(vec3(0.05, 0.11, 0.18), vec3(0.13, 0.24, 0.30), bb * 0.6), td * 0.010, 0.6, smoothstep(hf + 0.004, hf - 0.004, p.y) * uGround);
  }
#ifdef FIG
  if (uFigure > 0.){
    vec2 b0 = vec2(0.16, hillFront(0.16) - 0.004), q = (p - b0) / 0.075;
    float d = sdPerson(q, 0.), d2 = sdSeg(q, vec2(0.0, 0.7), vec2(0.30, 0.62), 0.04);
    float easel = min(sdSeg(q, vec2(0.36, 0.0), vec2(0.50, 0.95), 0.02), sdSeg(q, vec2(0.66, 0.0), vec2(0.52, 0.95), 0.02));
    put(f, vec3(0.025, 0.04, 0.08), vec2(0., 0.002), 0.05, smoothstep(0.03, -0.01, min(min(d, d2), easel)) * uFigure);
    float ac = smoothstep(0.02, -0.01, sdBox(q - vec2(0.51, 0.62), vec2(0.13, 0.16))) * uFigure;
    put(f, vec3(0.95, 0.78, 0.32), vec2(0., 0.002), 0.05, ac); f.st = max(f.st, ac);
  }
#endif
#ifdef BIGFIG
  if (uBigFig > 0.){                                          // the painter emerging from the strokes ("是一个人")
    vec2 q = (rot(-uCam.w) * (p - uCam.xy) * uCam.z + vec2(0.0, 0.27)) / 0.44;
    float dp = sdPerson(q, 0.), a = smoothstep(0.03, -0.01, dp) * uBigFig, rim = smoothstep(0.06, 0.0, abs(dp - 0.01)) * uBigFig;
    put(f, vec3(0.98, 0.78, 0.30), vec2(0., 0.03) / uCam.z, 0.2, rim * (0.6 + 0.4 * uPulse)); f.st = max(f.st, rim);
    put(f, vec3(0.02, 0.03, 0.08), vec2(0., 0.03) / uCam.z, 0.25, a);
  }
#endif
#ifdef CYP
  if (uCypress > 0.){
    float y = p.y, k = clamp((0.43 - y) / 1.05, 0., 1.), fl = 1. + uFlame;
    float cx = -0.60 + 0.045 * fl * sin(y * 5. + t * 0.45 * fl) * (y + 0.6) + 0.02 * (fbm(vec2(y * 3., t * 0.1)) - 0.5);
    float w = 0.085 * pow(k, 0.7) * (0.72 + 0.55 * fbm(vec2(y * 6., t * 0.2 * fl))) + 0.02 * fl * sin(y * 26. + t * 1.2 * fl + 3. * fbm(vec2(y * 4., 1.))) * k;
    float a = smoothstep(0.006, -0.004, abs(p.x - cx) - w) * step(y, 0.43 + 0.05 * uFlame) * uCypress;
    if (a > 0.){
      float bb = 0.5 + 0.5 * sin((p.x - cx) * 110. + fbm(p * 10.) * 4.);
      vec3 cc = mix(vec3(0.05, 0.10, 0.07), vec3(0.17, 0.30, 0.17), bb);
      cc = mix(cc, vec3(0.33, 0.27, 0.13), smoothstep(0.85, 1.0, bb) * 0.6);
      cc = mix(cc, mix(vec3(0.75, 0.30, 0.08), vec3(0.98, 0.70, 0.20), bb), uFlame * smoothstep(0.3, 1.0, bb) * 0.55);
      put(f, cc, vec2(0.35 * sin(y * 12. + t * 1.3 * fl + (p.x - cx) * 40.), 1.) * 0.045 * fl, 0.5, a);
    }
  }
#endif
#ifdef DAY
  if (uSun > 0.){                                              // the day is swallowed by a spiral of night
    F d = dayField(p, uMorphC, 1., -0.07);
    vec2 dd = p - uMorphC; float r = length(dd), ang = atan(dd.y, dd.x);
    float edge = 0.09 + r * 0.85 + 0.10 * sin(ang * 2. + r * 16.) * min(1., r * 6.) + 0.18 * fbm(p * 5.);
    float dayA = 1. - smoothstep(edge - 0.06, edge + 0.06, (1. - uSun) * 2.3);
    put(f, d.c, d.v, d.sz, dayA); f.st = max(f.st, d.st * dayA);
  }
#endif
  if (uCold > 0.){ float l = dot(f.c, vec3(0.3, 0.55, 0.15)); f.c = mix(f.c, mix(vec3(l), f.c, 0.6) * vec3(0.82, 0.92, 1.12), uCold * (1. - f.st * 0.85)); }
  return f;
}
`;

// ------------------------------------------------------------------ LETTER (paper on a desk, candle light, ink sketch)
const LETTER = `
float ink(vec2 q){                       // the little starry-night sketch in the letter margin
  float th = 0.0032, d = 1e3;
  d = min(d, abs(q.y - (-0.16 + 0.012 * sin(q.x * 26.))) - th + step(0.52, q.x) + step(q.x, 0.08));
  d = min(d, abs(length(q - vec2(0.20, 0.03)) - 0.016) - th); d = min(d, abs(length(q - vec2(0.20, 0.03)) - 0.03) - th * 0.8);
  d = min(d, abs(length(q - vec2(0.46, 0.05)) - 0.02) - th); d = min(d, length(q - vec2(0.38, 0.09)) - 0.006);
  vec2 sp = q - vec2(0.31, -0.03); float r = length(sp), a = atan(sp.y, sp.x) + 3.14159;
  float k = 0.011, sd = abs(mod(r - k * a / 6.2832, k) - k * 0.5) - th * 0.8; d = min(d, max(sd, r - 0.045));
  float yy = (q.y + 0.16) / 0.24, w = 0.016 * (1. - yy) * (0.8 + 0.4 * sin(yy * 9.));
  d = min(d, max(abs(abs(q.x - 0.13) - w) - th, abs(yy - 0.5) - 0.5));
  return d; }
F sLetter(vec2 p){
  F f; float t = uTime;
  vec2 q = rot(-0.03) * p; vec2 hp = vec2(0.62, 0.40);
  float dPaper = sdRBox(q, hp, 0.01) + 0.006 * (fbm(q * 18.) - 0.5);
  float grain = 0.5 + 0.5 * sin(p.y * 260. + fbm(p * vec2(2., 30.)) * 6.);
  f.c = mix(vec3(0.16, 0.09, 0.05), vec3(0.30, 0.18, 0.09), grain * 0.8); f.v = vec2(0.006, 0.); f.sz = 0.6; f.st = 0.; f.vis = 0.85;
  float pa = smoothstep(0.003, -0.003, dPaper);
  if (pa > 0.){
    vec3 pc = mix(vec3(0.90, 0.82, 0.64), vec3(0.74, 0.62, 0.43), smoothstep(0.45, 0.85, fbm(q * 4. + 3.)) * 0.7);
    pc *= 1. - 0.35 * smoothstep(-0.10, 0.0, dPaper);                       // darker, burnt edges
    pc = mix(pc, vec3(0.60, 0.46, 0.30), step(0.82, fbm(q * 23. + 1.)) * 0.35); // foxing
    vec2 fv = vec2(0.004, 0.002 * sin(q.y * 40. + q.x * 9.));
    put(f, pc, fv, 0.42, pa); f.vis = mix(f.vis, 0.4, pa);
    float dI = ink(q), rev = smoothstep(uSketch * 0.6 - 0.04, uSketch * 0.6, (q.x - 0.06) + 0.03 * fbm(q * 30.));
    float ia = smoothstep(0.002, -0.001, dI) * (1. - rev) * pa;
    put(f, vec3(0.22, 0.14, 0.08), vec2(0.002, 0.002), 0.08, ia); f.vis = mix(f.vis, 0.9, ia);
  }
  float fl = 0.86 + 0.08 * sin(t * 9.1) + 0.06 * vnoise(vec2(t * 13., 2.));
  float glow = uCandle * fl * exp(-length(p - vec2(-0.78, 0.42)) * 1.25);
  f.c *= 0.18 + 1.05 * glow; f.c += vec3(0.25, 0.12, 0.02) * glow * glow;
  return f; }
`;

// ------------------------------------------------------------------ ARLES 1888 (verse 1: one shot per rap line)
const ARLES = `
F cafe(vec2 p){
  F f; f.st = 0.; f.vis = 1.; f.sz = 0.7;
  f.c = mix(vec3(0.08, 0.16, 0.42), vec3(0.03, 0.07, 0.24), smoothstep(-0.1, 0.5, p.y));
  f.v = vec2(0.008, 0.003 * sin(p.x * 9.));
  addHalo(f, p, vec2(-0.35, 0.36), 0.025, 0.9, 0.25); addHalo(f, p, vec2(0.12, 0.42), 0.02, 0.8, 0.25); addHalo(f, p, vec2(0.55, 0.33), 0.03, 0.9, 0.25);
  float aw = step(p.y, 0.48 - 0.25 * (p.x + 0.9)) * step(0.10, p.y) * step(p.x, 0.1);         // yellow awning
  put(f, mix(vec3(0.96, 0.78, 0.28), vec3(0.85, 0.55, 0.15), fbm(p * 12.)), vec2(0.03, -0.012), 0.5, aw); f.st = max(f.st, aw * 0.5);
  if (p.y < 0.02){
    vec2 cb = fract(p * vec2(26., 40.) + vec2(0.5 * floor(p.y * 40.), 0.)) - 0.5;
    vec3 fc = mix(vec3(0.92, 0.66, 0.26), vec3(0.62, 0.38, 0.14), smoothstep(0.30, 0.48, max(abs(cb.x), abs(cb.y))));
    put(f, fc * (0.75 + 0.35 * smoothstep(-0.5, 0.0, p.y)), vec2(0.02, 0.0), 0.45, smoothstep(0.02, 0.012, p.y));
  }
  put(f, vec3(0.20, 0.09, 0.05), vec2(0.03, 0.), 0.3, fill(sdBox(p - vec2(0., -0.26), vec2(0.9, 0.05))));  // table top
  return f; }
F room(vec2 p){
  F f; f.st = 0.; f.vis = 1.;
  f.c = mix(vec3(0.24, 0.44, 0.40), vec3(0.34, 0.54, 0.46), fbm(p * 6.)); f.v = vec2(0.0, 0.01); f.sz = 0.75;
  if (p.y < -0.12){
    float px = p.x / (0.25 - p.y), tl = step(0.45, abs(fract(px * 5.) - 0.5)) + step(0.45, abs(fract(1. / (0.12 - p.y + 0.3) * 1.2) - 0.5));
    put(f, mix(vec3(0.66, 0.28, 0.13), vec3(0.42, 0.16, 0.08), min(1., tl)), vec2(px * 0.02, -0.012), 0.55, smoothstep(-0.115, -0.125, p.y));
  }
  return f; }
float sdChair(vec2 q, bool arm){          // side-ish view, seat at y=0.22, origin = floor centre
  float d = sdBox(q - vec2(0., 0.22), vec2(0.11, 0.018));
  d = min(d, sdSeg(q, vec2(-0.09, 0.), vec2(-0.09, 0.22), 0.012)); d = min(d, sdSeg(q, vec2(0.09, 0.), vec2(0.09, 0.22), 0.012));
  d = min(d, sdSeg(q, vec2(-0.09, 0.22), vec2(-0.10, 0.52), 0.013));
  d = min(d, sdBox(q - vec2(-0.095, 0.40), vec2(0.018, 0.11)));
  if (arm) d = min(d, sdSeg(q, vec2(-0.09, 0.36), vec2(0.10, 0.33), 0.016));
  return d; }
F town(vec2 p, float push){
  F f; f.st = 0.; f.vis = 1.; f.sz = 0.7;
  f.c = mix(vec3(0.96, 0.58, 0.24), vec3(0.36, 0.20, 0.42), smoothstep(-0.05, 0.45, p.y)); f.v = vec2(0.012, 0.);
  float fac = fill(sdBox(p - vec2(0., -0.05), vec2(0.42, 0.40)));
  put(f, mix(vec3(0.78, 0.62, 0.36), vec3(0.60, 0.44, 0.26), fbm(p * 8.)), vec2(0., 0.008), 0.6, fac);
  put(f, vec3(0.12, 0.07, 0.05), vec2(0., 0.01), 0.3, fill(sdBox(p - vec2(0., -0.20), vec2(0.09, 0.18))));
  for (int i = 0; i < 11; i++){
    float fi = float(i), x = -0.75 + fi * 0.15 + 0.04 * hash12(vec2(fi, 2.)), h = 0.28 + 0.08 * hash12(vec2(fi, 3.));
    vec2 q = (p - vec2(x, -0.62 + 0.012 * sin(uTime * 9. + fi))) / ((h + push * 0.25) * 1.2);
    float d = min(length(q - vec2(0., 0.82)) - 0.11, sdRBox(q - vec2(0., 0.35), vec2(0.20, 0.38), 0.12));
    put(f, vec3(0.05, 0.04, 0.07), vec2(0., 0.004), 0.3, smoothstep(0.02, -0.02, d));
    if (hash12(vec2(fi, 9.)) > 0.55) put(f, vec3(0.90, 0.86, 0.74), vec2(0., 0.003), 0.15, fill(sdBox(q - vec2(0.08, 1.12), vec2(0.10, 0.07))));
  }
  return f; }
F sArles(vec2 p){
  float s = uShot, st = uShotT, t = uTime; F f;
#if SHOT == 0                                             // 画架一扛 往南走
    f = dayField(p, vec2(0.42, 0.30), 1., -0.07);
    float road = smoothstep(0.012, 0.0, abs(p.x - 0.05 - (p.y + 0.07) * 0.6) - 0.012 - 0.35 * max(0., -0.07 - p.y));
    put(f, mix(vec3(0.82, 0.64, 0.40), vec3(0.66, 0.48, 0.28), fbm(p * 20.)), vec2(0.01, 0.03), 0.4, road * step(p.y, -0.065));
    vec2 q = (p - vec2(-0.30 + 0.11 * st, -0.30)) / 0.20;
    float d = min(sdPerson(q, t * 9.), sdBox(rot(0.25) * (q - vec2(-0.16, 0.62)), vec2(0.13, 0.17)));
    put(f, vec3(0.08, 0.06, 0.05), vec2(0.03, 0.), 0.06, smoothstep(0.03, -0.01, d));
#elif SHOT == 1                                           // 太阳一烫 黄满手
    f = dayField(p, uCam.xy, 2.6, -0.6);
    vec2 dc = p - uCam.xy; f.v += normalize(dc) * 0.06 * smoothstep(0.3, 0.6, length(dc) / 0.4);
    f.c = mix(f.c, vec3(1.0, 0.80, 0.22), 0.25 + 0.2 * uPulse);
#elif SHOT == 2 || SHOT == 3                              // 兜里没钱 只剩酒 / 苦艾一口 就上头
    vec2 w = p; if (s > 2.5) w += 0.025 * vec2(sin(p.y * 14. + t * 5.), cos(p.x * 11. + t * 4.)) * min(1., st * 1.5);
    f = cafe(w);
    float bot = min(sdRBox(w - vec2(-0.16, -0.06), vec2(0.045, 0.15), 0.03), sdRBox(w - vec2(-0.16, 0.13), vec2(0.014, 0.06), 0.008));
    put(f, vec3(0.06, 0.12, 0.08), vec2(0., 0.02), 0.12, fill(bot));
    float gx = (w.y + 0.21) / 0.17, glass = fill(max(abs(w.x - 0.10) - 0.035 - 0.02 * gx, abs(w.y + 0.12) - 0.09));
    vec3 gc = s > 2.5 ? vec3(0.45, 0.92, 0.35) : vec3(0.92, 0.80, 0.50);
    put(f, gc, vec2(0., 0.02), 0.1, glass); f.st = max(f.st, glass * 0.8);
#elif SHOT == 4                                           // 盼高更来 当盟友 — the Yellow House
    f = cafe(p + vec2(0., -0.2)); f.c = mix(f.c, vec3(0.05, 0.12, 0.45), 0.6);
    float house = fill(sdBox(p - vec2(-0.05, -0.05), vec2(0.30, 0.28)));
    put(f, mix(vec3(0.95, 0.80, 0.30), vec3(0.85, 0.62, 0.18), fbm(p * 10.)), vec2(0., 0.01), 0.5, house);
    vec2 wq = fract((p - vec2(-0.35, -0.33)) / vec2(0.12, 0.14)) - 0.5;
    float win = house * step(abs(wq.x), 0.22) * step(abs(wq.y), 0.28) * step(p.y, 0.17);
    put(f, vec3(0.18, 0.42, 0.22), vec2(0., 0.01), 0.15, win);
    float door = fill(sdBox(p - vec2(-0.05, -0.24), vec2(0.045, 0.09)));
    put(f, mix(vec3(0.15, 0.32, 0.18), vec3(1.0, 0.85, 0.45), smoothstep(0.3, 1.0, st)), vec2(0., 0.01), 0.12, door);
    f.st = max(f.st, door * smoothstep(0.3, 1.0, st));
#elif SHOT >= 5 && SHOT <= 7                              // 俩猛兽 / 他骂我疯 / 摔门撒手
    f = room(p);
    float jit = s > 5.5 ? 0.006 * uPulse : 0.;
    vec2 qa = p - vec2(-0.30 + jit, -0.36), qb = p - vec2(0.30 - jit, -0.36);
    qb.x = -qb.x;
    if (s > 6.5){ float fall = min(1., st / 0.35); qb = rot(-1.45 * fall * fall) * (qb - vec2(0.10, 0.)) + vec2(0.10, 0.); }
    put(f, vec3(0.92, 0.70, 0.22), vec2(0., 0.01), 0.12, smoothstep(0.004, -0.002, sdChair(qa, false)));
    put(f, vec3(0.50, 0.17, 0.08), vec2(0., 0.01), 0.12, smoothstep(0.004, -0.002, sdChair(qb, true)));
    if (s > 6.5) f.c *= 1. - 0.75 * smoothstep(0.45, 0.6, st);          // the door slams: dark
#elif SHOT == 8 || SHOT == 9                              // 剃刀一抖 血往下流 / 割下左耳 塞她手
    f = room(p); f.c *= 0.18;
    vec2 a = vec2(-0.75, 0.30), b = vec2(0.75, -0.25), dir = normalize(b - a);
    float pr = s < 8.5 ? min(1., st / 0.25) : 1.;
    float d = sdSeg(p, a, mix(a, b, pr), 0.012 + 0.01 * fbm(p * 30.));
    put(f, vec3(0.78, 0.05, 0.04), dir * 0.12, 0.25, smoothstep(0.004, -0.004, d) * (s < 8.5 ? 1. : max(0., 1. - st)));
    if (s > 8.5){
      vec2 c = vec2(floor(p.x * 40.), 0.); float sp = 0.3 + 0.4 * hash12(c), y0 = 0.5 - fract(hash12(c + 3.) + st * sp) * 1.2;
      float drop = smoothstep(0.004, 0., abs(fract(p.x * 40.) - 0.5) / 40. - 0.003) * smoothstep(0.08, 0., abs(p.y - y0) - 0.03) * step(0.6, hash12(c + 5.));
      put(f, vec3(0.62, 0.04, 0.05), vec2(0., -0.08), 0.15, drop * (1. - st * 0.6));
    }
#elif SHOT == 10 || SHOT == 11                            // 全镇签名 堵在门口 / 赶出镇口
    f = town(p, s > 10.5 ? st : 0.);
#elif SHOT == 12 || SHOT == 13                            // 九百张画 没人收 / 骨气嚼碎 咽进喉
    vec2 w = p;
    if (s > 12.5){ float r = length(w), a = st * 3.2 * exp(-r * 2.2); w = rot(a) * w * (1. + 0.35 * st); }
    f.c = mix(vec3(0.30, 0.22, 0.12), vec3(0.42, 0.32, 0.18), fbm(w * 6.)); f.v = vec2(0.004, 0.006); f.sz = 0.7; f.st = 0.; f.vis = 1.;
    vec2 cell = floor((w + vec2(0.72, 0.36)) / vec2(0.24, 0.24)), lq = (w + vec2(0.72, 0.36)) - (cell + 0.5) * vec2(0.24, 0.24);
    if (cell.x >= 0. && cell.x < 6. && cell.y >= 0. && cell.y < 3.){
      float id = cell.x + cell.y * 6., h = hash12(cell + 4.);
      vec3 cc = mix(vec3(0.20, 0.30, 0.42), vec3(0.62, 0.50, 0.22), h); cc = mix(cc, vec3(0.30, 0.42, 0.24), hash12(cell + 8.) * 0.5);
      cc *= 0.45 + 0.25 * fbm(lq * 20. + h * 9.);
      bool sold = id == 8.;
      if (sold) cc = mix(vec3(0.95, 0.72, 0.25), vec3(0.98, 0.90, 0.60), fbm(lq * 14.)) * (0.9 + 0.3 * uPulse);
      float fr = fill(sdBox(lq, vec2(0.095, 0.08)));
      put(f, vec3(0.16, 0.11, 0.05), vec2(0.004, 0.), 0.1, fill(sdBox(lq, vec2(0.105, 0.09))));
      put(f, cc, vec2(cos(h * 6.3), sin(h * 6.3)) * 0.02, 0.22, fr); if (sold) f.st = max(f.st, fr);
    }
#else                                                     // 画商摆手 我不回头 — walking away into the sunset
    f = dayField(p, vec2(0.02, -0.02), 1.1, -0.07);
    f.c = mix(f.c, vec3(0.98, 0.55, 0.22), smoothstep(0.35, -0.05, p.y) * 0.55);
    float road = smoothstep(0.012, 0.0, abs(p.x) - 0.004 - 0.55 * max(0., -0.07 - p.y));
    put(f, mix(vec3(0.80, 0.58, 0.34), vec3(0.62, 0.42, 0.24), fbm(p * 20.)), vec2(0., 0.03), 0.4, road * step(p.y, -0.065));
    float sc = mix(0.20, 0.07, min(1., st / 1.4)); vec2 q = (p - vec2(0., mix(-0.38, -0.12, min(1., st / 1.4)))) / sc;
    put(f, vec3(0.08, 0.05, 0.04), vec2(0., 0.02), 0.05, smoothstep(0.04, -0.01, sdPerson(q, t * 7.)));
#endif
  return f; }
`;

// ------------------------------------------------------------------ CROWS (1890 Auvers wheatfield) and GRAVE
const CROWS = `
F sCrows(vec2 p){
  F f; float t = uTime, psi = 0.; vec2 g = vec2(0.); f.st = 0.; f.vis = 1.; f.sz = 0.75;
  vortex(p, vec2(-0.45, 0.32), 0.09, 0.05, psi, g); vortex(p, vec2(0.05, 0.36), 0.08, -0.04, psi, g); vortex(p, vec2(0.55, 0.30), 0.09, 0.05, psi, g);
  f.v = curl(g) + turbVel(p, 0.045 * (0.6 + uStorm)) + vec2(0.03, 0.006 * sin(p.x * 6.));
  float tb = fbm(p * vec2(3., 6.) + vec2(t * 0.05, 0.)) + psi * 12.;
  vec3 sky = mix(vec3(0.12, 0.26, 0.58), vec3(0.03, 0.07, 0.28), smoothstep(0.0, 0.42, p.y));
  sky = mix(sky, vec3(0.04, 0.08, 0.30), smoothstep(0.45, 0.7, tb) * 0.7);
  sky = mix(sky, vec3(0.32, 0.50, 0.78), smoothstep(0.62, 0.8, fract(tb * 3.)) * 0.45);
  sky = mix(sky, vec3(0.78, 0.82, 0.80), smoothstep(0.78, 0.95, fbm(p * 5. + 3.)) * 0.55 * (1. - uStorm) * smoothstep(0.0, 0.15, p.y));
  f.c = sky * (1. - 0.40 * uStorm);
  float hz = 0.0 + 0.02 * sin(p.x * 4.) + 0.01 * fbm(p * 20.);
  if (p.y < hz + 0.004){
    float wb = 0.5 + 0.5 * sin(p.y * 70. + p.x * 8. + sin(p.x * 5. + t * 1.2) * 3. + fbm(p * 9.) * 3.);
    put(f, mix(vec3(0.78, 0.55, 0.12), vec3(0.96, 0.78, 0.22), wb), vec2(0.5, 0.6 * sin(p.x * 7. + t * 1.5 + p.y * 12.)) * 0.08, 0.6, smoothstep(hz + 0.004, hz - 0.004, p.y));
    float dep = hz - p.y, wob = 0.02 * (fbm(p * 12.) - 0.5);
    float cp = abs(p.x + 0.2 * (p.y - hz) + wob) - dep * 0.35 - 0.005;
    put(f, mix(vec3(0.62, 0.28, 0.12), vec3(0.45, 0.20, 0.10), fbm(p * 20.)), vec2(0., 0.04), 0.4, smoothstep(0.01, 0., cp) * step(p.y, hz));
    float lp = min(abs(p.x + 0.55 - 0.9 * dep) - dep * 0.12 - 0.004, abs(p.x - 0.60 + 0.9 * dep) - dep * 0.12 - 0.004);
    put(f, vec3(0.20, 0.45, 0.22), vec2(0.02, 0.03), 0.4, smoothstep(0.01, 0., lp) * step(p.y, hz));
  }
  for (int i = 0; i < 48; i++){
    float fi = float(i); if (fi >= uCrows * 48.) break;
    float life = fract(hash12(vec2(fi, 1.)) + t * 0.10 * (0.6 + 0.8 * hash12(vec2(fi, 2.))));
    vec2 c = vec2(hash12(vec2(fi, 3.)) * 1.9 - 0.95, hash12(vec2(fi, 4.)) * 0.5) + vec2(0.3 * (life - 0.5), 0.05 * sin(life * 6. + fi));
    c.y = 0.05 + c.y * 0.9;
    float sc = 0.022 + 0.035 * hash12(vec2(fi, 5.)) + 0.05 * life * uStorm, flap = sin(t * 10. + fi * 2.) * 0.45;
    vec2 q = (p - c) / sc;
    float d = min(sdSeg(q, vec2(0.), vec2(-1.0, 0.30 + flap), 0.22), sdSeg(q, vec2(0.), vec2(1.0, 0.30 + flap), 0.22));
    d = min(d, length(q * vec2(1., 1.4)) - 0.28);
    put(f, vec3(0.02, 0.02, 0.05), vec2(0.04, 0.0), 0.05, smoothstep(0.12, -0.05, d));
  }
  return f; }
F sGrave(vec2 p){
  F f; float t = uTime; f.st = 0.; f.vis = 1.; f.sz = 0.75;
  f.c = mix(vec3(0.015, 0.025, 0.06), vec3(0.03, 0.05, 0.11), fbm(p * 3. + t * 0.03)); f.v = turbVel(p, 0.008) + vec2(0.002, 0.);
  if (uStones > 0.){
    float gy = -0.18 + 0.01 * sin(p.x * 5.);
    f.c = mix(f.c, mix(vec3(0.05, 0.08, 0.20), vec3(0.12, 0.18, 0.32), smoothstep(0.4, -0.1, p.y)), uStones);
    if (p.y < gy) put(f, mix(vec3(0.04, 0.09, 0.06), vec3(0.08, 0.16, 0.10), 0.5 + 0.5 * sin(p.y * 120. + fbm(p * 10.) * 4.)), vec2(0.01, 0.004 * sin(p.x * 20.)), 0.55, uStones);
    for (int i = 0; i < 2; i++){
      float fi = float(i); vec2 q = p - vec2(-0.13 + 0.26 * fi, gy + 0.13);
      float a = fill(min(sdBox(q + vec2(0., 0.03), vec2(0.085, 0.10)), length(q - vec2(0., 0.07)) - 0.085)) * uStones;
      put(f, mix(vec3(0.30, 0.33, 0.38), vec3(0.47, 0.50, 0.54), fbm(q * 14. + fi * 5.)) * (0.8 + 0.3 * smoothstep(-0.08, 0.08, q.x + q.y)), vec2(0., 0.006), 0.35, a);
      float leaf = fbm(p * 38. + fi * 3.), grow = uIvy * 1.25 - (p.y - gy) / 0.26 - 0.2 * fbm(p * 6.);
      float iv = smoothstep(0.0, 0.08, grow) * step(0.42, leaf) * max(a, step(p.y, gy + 0.02)) * uStones;
      put(f, mix(vec3(0.06, 0.22, 0.09), vec3(0.18, 0.40, 0.16), leaf), vec2(cos(leaf * 20.), sin(leaf * 20.)) * 0.01, 0.12, iv);
    }
  }
  addHalo(f, p, vec2(-0.02, 0.06), 0.022, uDot1, 0.1);
  vec4 h = halo(p, vec2(0.04, 0.05), 0.02, uDot2); f.c = mix(f.c, h.rgb * vec3(1.0, 0.78, 0.45), h.a); f.st = max(f.st, h.a);
  return f; }
`;

// ------------------------------------------------------------------ LETTERS (bridge: 600 letters become stars)
const LETTERS = `
F sLetters(vec2 p){
  F f; float t = uTime, psi = 0.; vec2 g = vec2(0.); f.st = 0.; f.vis = 1.; f.sz = 0.72;
  vortex(p, vec2(0., 0.25), 0.4, 0.03, psi, g);
  f.v = curl(g) + turbVel(p, 0.006) + vec2(0.0, 0.004);
  f.c = mix(vec3(0.10, 0.16, 0.36), vec3(0.03, 0.06, 0.18), smoothstep(-0.3, 0.45, p.y));
  f.c = mix(f.c, vec3(0.20, 0.28, 0.48), smoothstep(0.75, 1., 0.5 + 0.5 * sin(psi * 500. + fbm(p * 6.) * 2.)) * 0.4);
  float glow = (0.86 + 0.1 * sin(t * 8.3)) * exp(-length(p - vec2(0., -0.48)) * 2.2);
  f.c += vec3(0.55, 0.30, 0.08) * glow * (1. - uDim * 0.5);
  put(f, mix(vec3(0.10, 0.06, 0.03), vec3(0.22, 0.12, 0.05), 0.5 + 0.5 * sin(p.y * 220. + fbm(p * vec2(2., 20.)) * 5.)) * (0.6 + 1.2 * glow), vec2(0.01, 0.), 0.4, fill(p.y + 0.40));
  for (int i = 0; i < 36; i++){
    float fi = float(i), age = uLetT - hash12(vec2(fi, 1.)) * 12.;
    if (age < 0.) continue;
    vec2 c = vec2((hash12(vec2(fi, 2.)) - 0.5) * 1.5 + 0.04 * sin(age * 1.3 + fi), -0.42 + age * 0.07);
    if (c.y > 0.55) continue;
    float star = smoothstep(0.05, 0.30, c.y), sc = mix(1., 0.4, star);
    vec2 q = rot(0.3 * sin(age * 0.9 + fi)) * (p - c);
    vec3 pc = mix(vec3(0.90, 0.82, 0.62), mix(vec3(0.25, 0.45, 0.85), vec3(0.95, 0.70, 0.20), hash12(vec2(fi, 7.))), uPaint * 0.7);
    pc = mix(pc, vec3(0.3, 0.2, 0.1), step(0.5, fract(q.y * 90.)) * step(abs(q.x), 0.035 * sc) * 0.5 * (1. - star));
    put(f, pc * (0.7 + 0.6 * glow), vec2(0., 0.02), 0.12, fill(sdBox(q, vec2(0.045, 0.032) * sc)) * (1. - star));
    float b = star * (1. - uDim * 0.8) * (0.7 + 0.3 * sin(t * 3. + fi));
    if (b > 0.01) addHalo(f, p, c, 0.014 + 0.008 * hash12(vec2(fi, 8.)), b, 0.18);
  }
  float orbit = max(0., uLetT - 12.9), k = min(1., orbit / 2.);
  vec2 A = mix(vec2(-0.22, 0.27), vec2(-0.06, 0.29) + 0.03 * vec2(cos(orbit * 1.5), sin(orbit * 1.5)), k);
  vec2 B = mix(vec2(0.24, 0.30), vec2(0.06, 0.29) - 0.03 * vec2(cos(orbit * 1.5), sin(orbit * 1.5)), k);
  if (uPair > 0.){ addHalo(f, p, A, 0.035, uPair, 0.25); addHalo(f, p, B, 0.035, uPair, 0.25); }
  if (uLink > 0.){
    float la = smoothstep(0.004, -0.002, sdSeg(p, A, mix(A, B, uLink), 0.003)) * uPair;
    put(f, vec3(1., 0.88, 0.55), normalize(B - A) * 0.05, 0.08, la); f.st = max(f.st, la);
  }
  return f; }
`;

// ------------------------------------------------------------------ MODERN (outro: 100 years later)
const MODERN = `
void painting(inout F f, vec2 p, vec2 c, vec2 hs, float gold){   // a framed starry night
  vec2 d = abs(p - c) - hs;
  if (max(d.x, d.y) < 0.){ F n = sNight((p - c) / hs.y * 0.42 + vec2(0., 0.12)); f.c = n.c; f.v = n.v * 0.4; f.sz = min(n.sz, 0.35); f.st = n.st; }
  else put(f, mix(vec3(0.62, 0.46, 0.18), vec3(0.92, 0.76, 0.40), fbm(p * 40.)), vec2(0., 0.004), 0.1, gold * fill(sdBox(p - c, hs + 0.025)));
}
F sModern(vec2 p){
  float s = uShot, st = uShotT, t = uTime; F f; f.st = 0.; f.vis = 1.; f.sz = 0.7; f.v = vec2(0.004, 0.002);
#if SHOT == 0                                                          // 一百年后 排队看星
    f.c = mix(vec3(0.82, 0.82, 0.80), vec3(0.60, 0.61, 0.65), smoothstep(0.5, -0.4, p.y)) * (0.9 + 0.1 * fbm(p * 5.));
    painting(f, p, vec2(0., 0.20), vec2(0.10, 0.075), 1.);
    for (int r = 0; r < 4; r++) for (int i = 0; i < 12; i++){
      float fr = float(r), fi = float(i), z = 0.35 + 0.22 * fr;
      vec2 q = (p - vec2((fi - 5.5) * 0.15 * z * 1.6 + 0.015 * sin(t * 2. + fi + fr), -0.14 - 0.16 * fr)) / (0.30 * z);
      float d = min(length(q - vec2(0., 0.82)) - 0.12, sdRBox(q - vec2(0., 0.30), vec2(0.24, 0.36), 0.14));
      put(f, mix(vec3(0.22, 0.22, 0.26), vec3(0.08, 0.08, 0.10), fr / 3.), vec2(0., 0.003), 0.3, smoothstep(0.03, -0.03, d));
    }
#elif SHOT == 1                                                        // 闪光灯 刺我眼睛
    f.c = vec3(0.04, 0.04, 0.06) + 0.04 * fbm(p * 4.);
    for (int i = 0; i < 14; i++){
      float fi = float(i);
      vec2 c = vec2((fi - 6.5) * 0.13 + 0.03 * hash12(vec2(fi, 1.)), -0.20 + 0.10 * hash12(vec2(fi, 2.)) + 0.015 * sin(t * 3. + fi));
      vec2 q = rot(0.25 * (hash12(vec2(fi, 3.)) - 0.5)) * (p - c);
      put(f, vec3(0.05, 0.04, 0.05), vec2(0., 0.01), 0.2, smoothstep(0.01, -0.01, sdSeg(p, c - vec2(0., 0.08), c - vec2(0.03, 0.6), 0.025)));
      put(f, vec3(0.03, 0.03, 0.04), vec2(0., 0.004), 0.12, fill(sdRBox(q, vec2(0.045, 0.085), 0.012)));
      float sc = fill(sdRBox(q, vec2(0.038, 0.075), 0.008));
      put(f, mix(vec3(0.10, 0.22, 0.55), vec3(0.95, 0.85, 0.40), step(0.8, hash12(floor(q * 90.) + fi))), vec2(0., 0.01), 0.08, sc); f.st = max(f.st, sc * 0.6);
    }
    float slot = floor(t * 8.), fid = floor(hash12(vec2(slot, 5.)) * 14.), age = fract(t * 8.);
    float fl = exp(-length(p - vec2((fid - 6.5) * 0.13, -0.15)) * 5.) * (1. - age);
    f.c += vec3(1.) * fl * 1.6; f.st = max(f.st, min(1., fl));
#elif SHOT == 2                                                        // 拍卖锤响 全场安静
    f.c = mix(vec3(0.46, 0.25, 0.10), vec3(0.64, 0.38, 0.17), 0.5 + 0.5 * sin(p.y * 120. + fbm(p * vec2(3., 30.)) * 5.)); f.v = vec2(0.01, 0.);
    f.c *= 0.55 + 0.6 * exp(-length(p - vec2(-0.04, -0.10)) * 2.5);
    float imp = 0.66, a = st < imp ? mix(-1.1, 0.0, pow(st / imp, 2.)) : 0.;
    vec2 q = rot(-a) * (p - vec2(0.42, -0.02));
    float handle = sdSeg(q, vec2(0.), vec2(-0.42, 0.), 0.020), head = sdRBox(q - vec2(-0.46, 0.), vec2(0.055, 0.12), 0.02);
    put(f, vec3(0.06, 0.025, 0.015), vec2(0., 0.01), 0.08, fill(min(handle, head)));
    put(f, vec3(0.85, 0.66, 0.28), vec2(0., 0.01), 0.06, fill(max(head, abs(q.y) - 0.012)));   // brass band
    put(f, vec3(0.08, 0.04, 0.02), vec2(0.01, 0.), 0.12, fill(sdRBox(p - vec2(-0.04, -0.17), vec2(0.13, 0.04), 0.01)));
    if (st > imp){ float k = (st - imp) * 1.6; f.c += vec3(1., 0.9, 0.7) * smoothstep(0.02, 0., abs(length(p - vec2(-0.04, -0.12)) - k * 0.6)) * max(0., 1. - k) * 0.8; }
#elif SHOT == 3                                                        // 八千万 买我一命
    float psi = 0.; vec2 g = vec2(0.); vortex(p, vec2(0.), 0.45, 0.08, psi, g);
    f.c = mix(vec3(0.03, 0.07, 0.05), vec3(0.08, 0.14, 0.09), fbm(p * 4.)); f.v = curl(g);
    vec2 rp = rot(t * 0.4) * p, cell = floor(rp / 0.045);
    float gf = step(0.84, hash12(cell)) * smoothstep(0.014, 0.005, length(fract(rp / 0.045) - 0.5) * 0.045);
    put(f, vec3(1.0, 0.82, 0.35), f.v, 0.1, gf); f.st = max(f.st, gf);
#elif SHOT == 4                                                        // 印上帆布包 手机屏
    f.c = mix(vec3(0.95, 0.82, 0.80), vec3(0.88, 0.74, 0.76), fbm(p * 3.)); f.v = vec2(0.006, 0.);
    vec2 tq = p - vec2(-0.30, -0.08);
    float bag = sdRBox(tq, vec2(0.20, 0.22), 0.01), hd = max(abs(length((tq - vec2(0., 0.22)) * vec2(1., 1.2)) - 0.11) - 0.012, -(tq.y - 0.22));
    put(f, vec3(0.86, 0.80, 0.66), vec2(0., 0.004), 0.2, fill(min(bag, hd)));
    if (bag < -0.02){ F n = sNight(tq * 1.7 + vec2(0., 0.15)); put(f, n.c, n.v * 0.2, 0.15, 1.); f.st = n.st; }
    vec2 pq = rot(0.12) * (p - vec2(0.33, -0.05));
    put(f, vec3(0.08, 0.08, 0.10), vec2(0., 0.004), 0.12, fill(sdRBox(pq, vec2(0.11, 0.22), 0.03)));
    if (sdRBox(pq, vec2(0.095, 0.20), 0.02) < 0.){ F n = sNight(pq * 2.0 + vec2(0.1, 0.1)); put(f, n.c, n.v * 0.2, 0.15, 1.); f.st = max(f.st, n.st); }
#elif SHOT == 5                                                        // 九块九包邮 还要好评
    f.c = mix(vec3(1.0, 0.42, 0.10), vec3(1.0, 0.22, 0.30), smoothstep(-0.5, 0.5, p.x)) * (0.92 + 0.08 * step(0.5, fract((p.x + p.y) * 6. - t * 0.8)));
    f.v = vec2(0.02, 0.02);
    vec2 cq = p - vec2(-0.25, 0.02);
    put(f, vec3(0.98, 0.97, 0.95), vec2(0., 0.002), 0.25, fill(sdRBox(cq, vec2(0.22, 0.30), 0.02)));
    vec2 iq = cq - vec2(0., 0.08);
    if (sdBox(iq, vec2(0.19, 0.17)) < 0.){ F n = sNight(iq * 2.4 + vec2(0., 0.12)); put(f, n.c, n.v * 0.2, 0.15, 1.); f.st = n.st; }
#else                                                                  // 可你隔着玻璃 看清
    f.c = vec3(0.05, 0.05, 0.07) + 0.03 * fbm(p * 3.);
    vec2 c = vec2(0., 0.04), hs = vec2(0.40, 0.30);
    painting(f, p, c, hs, 1.);
    float inF = step(max(abs(p.x - c.x) - hs.x, abs(p.y - c.y) - hs.y), 0.);
    float band = smoothstep(0.03, 0.0, abs(fract((p.x * 0.8 + p.y) * 1.6 - st * 0.5) - 0.5) - 0.06);
    f.c += vec3(0.8, 0.85, 0.9) * band * 0.18 * inF;
    f.c = mix(f.c, f.c + vec3(0.25, 0.27, 0.30), smoothstep(0.05, -0.05, sdPerson((p - vec2(0.12, -0.45)) / 0.5, 0.)) * 0.35 * inF);
#endif
  return f; }
`;

// ------------------------------------------------------------------ MAIN: two scenes + painterly transition + screen overlays
const MAIN = `
F sceneA(vec2 p){
#if SA == 0
  return sLetter(p);
#elif SA == 1
  return sArles(p);
#elif SA == 2
  return sNight(p);
#elif SA == 3
  return sCrows(p);
#elif SA == 4
  return sGrave(p);
#elif SA == 5
  return sLetters(p);
#elif SA == 6
  return sModern(p);
#endif
}
#ifdef MIX
F sceneB(vec2 p){
#if SB == 0
  return sLetter(p);
#elif SB == 1
  return sArles(p);
#elif SB == 2
  return sNight(p);
#elif SB == 3
  return sCrows(p);
#elif SB == 4
  return sGrave(p);
#elif SB == 5
  return sLetters(p);
#elif SB == 6
  return sModern(p);
#endif
}
#endif
void main(){
  vec2 s = (vUv - 0.5) * vec2(uAspect, 1.0), ws = s - vec2(uWallPan, 0.);
  vec2 wHalf = mix(vec2(1.25, 0.8), vec2(0.52, 0.355), uWall);
  float panel = floor((ws.x + 0.3) / 0.2);
  vec2 cutOff = uCut * vec2(0.03 * (hash12(vec2(panel, 3.)) - 0.5), 0.10 * (hash12(vec2(panel, 7.)) - 0.5));
  vec2 p = uCam.xy + rot(uCam.w) * s / uCam.z + cutOff;
  F f = sceneA(p);
#ifdef MIX
  {
    {
      F g = sceneB(p);
      vec2 d = s - uMixC; float r = length(d), ang = atan(d.y, d.x);
      float edge = r * 0.9 + 0.08 * sin(ang * 3. + r * 14.) + 0.15 * fbm(s * 5.);
      float m = smoothstep(edge - 0.05, edge + 0.05, uMix * 1.7);
      f.c = mix(f.c, g.c, m); f.v = mix(f.v, g.v, m); f.sz = mix(f.sz, g.sz, m); f.st = mix(f.st, g.st, m); f.vis = mix(f.vis, g.vis, m);
    }
  }
#endif
  vec2 sv = rot(uCam.w) * vec2(0.0, 0.006) / uCam.z;          // world velocity that reads as "still" on screen
#ifdef WALL
  if (uWall > 0.){
    float md = max(abs(ws.x) - wHalf.x, abs(ws.y) - wHalf.y), outside = smoothstep(-0.003, 0.003, md);
    vec3 wallC = mix(vec3(0.40, 0.38, 0.26), vec3(0.60, 0.53, 0.36), fbm(s * 9. + 2.));
    wallC = mix(wallC, vec3(0.36, 0.42, 0.30), smoothstep(0.55, 0.8, fbm(s * 4. + 9.)) * 0.5) * (0.75 + 0.25 * smoothstep(0.9, 0.2, length(s)));
    float wa = 1.57 + 2.6 * (fbm(s * 3.5 + 5.) - 0.5);
    vec2 wv = rot(uCam.w) * vec2(cos(wa), sin(wa)) * 0.008 / uCam.z;
    put(f, wallC, wv, 0.85, outside);
    put(f, vec3(0.13, 0.10, 0.07), wv, 0.25, smoothstep(0.022, 0.018, abs(md)) * step(-0.03, md) * uWall);
  }
#endif
#ifdef BARS
  if (uBars > 0.){
    for (int i = 0; i < 4; i++){
      float fi = float(i), pr = clamp(uBars - fi, 0., 1.); if (pr <= 0.) continue;
      float bx = -0.3 + fi * 0.2, a = smoothstep(0.017, 0.012, abs(ws.x - bx)) * step(wHalf.y - pr * 2. * wHalf.y, ws.y) * step(ws.y, wHalf.y);
      put(f, mix(vec3(0.05, 0.05, 0.07), vec3(0.34, 0.36, 0.40), smoothstep(0.006, -0.010, ws.x - bx) * 0.7), rot(uCam.w) * vec2(0., -0.02) / uCam.z, 0.2, a);
    }
    float a = smoothstep(0.015, 0.011, abs(ws.y - 0.07)) * step(abs(ws.x), wHalf.x * clamp((uBars - 3.5) * 2., 0., 1.));
    put(f, vec3(0.09, 0.09, 0.11), rot(uCam.w) * vec2(0.02, 0.) / uCam.z, 0.2, a);
  }
#endif
#ifdef GALLERY
  if (uGallery > 0.){
    vec2 gh = mix(vec2(1.2, 0.75), vec2(0.40, 0.29), uGallery), gd = abs(s - vec2(0., 0.06)) - gh;
    float md = max(gd.x, gd.y), out_ = smoothstep(-0.003, 0.003, md);
    put(f, mix(vec3(0.30, 0.07, 0.08), vec3(0.44, 0.12, 0.12), fbm(s * 7.)) * (0.6 + 0.4 * smoothstep(1., 0.2, length(s))), sv, 0.8, out_);
    put(f, mix(vec3(0.62, 0.46, 0.18), vec3(0.95, 0.78, 0.40), fbm(s * 50.)), sv, 0.12, smoothstep(0.003, -0.003, md - 0.035) * out_);
  }
#endif
#ifdef CROWD
  if (uCrowd > 0.){
    for (int i = 0; i < 16; i++){
      float fi = float(i), hg = 0.30 + 0.07 * hash12(vec2(fi, 2.));
      vec2 q = (s - vec2(-0.95 + fi * 0.125 + 0.03 * hash12(vec2(fi, 1.)), -0.5 - 0.4 * (1. - uCrowd) + 0.012 * sin(uTime * 6. + fi) * uPulse)) / hg;
      float d = min(length(q - vec2(0., 0.82)) - 0.13, sdRBox(q - vec2(0., 0.25), vec2(0.28, 0.40), 0.16));
      bool phone = hash12(vec2(fi, 4.)) > 0.55;
      if (phone) d = min(d, sdSeg(q, vec2(0.18, 0.55), vec2(0.30, 1.05), 0.05));
      put(f, vec3(0.04, 0.03, 0.05), sv, 0.3, smoothstep(0.03, -0.03, d));
      if (phone){ float sa = smoothstep(0.02, -0.02, sdRBox(q - vec2(0.31, 1.16), vec2(0.07, 0.11), 0.02));
        put(f, vec3(0.80, 0.88, 1.0), sv, 0.08, sa); f.st = max(f.st, sa * 0.8); }
    }
  }
#endif
#ifdef FLASH
  if (uFlash > 0.){
    for (int k = 0; k < 3; k++){                       // small camera flashes popping in the crowd
      float fk = float(k), slot = floor(uTime * 7. + fk * 0.37), age = fract(uTime * 7. + fk * 0.37);
      vec2 fc = vec2(hash12(vec2(slot, 1. + fk)) * 1.7 - 0.85, -0.12 + 0.12 * hash12(vec2(slot, 2. + fk)));
      float r = length(s - fc), fl = (exp(-r * 22.) * 1.6 + exp(-r * 7.) * 0.25) * (1. - age) * (1. - age) * uFlash;
      f.c += vec3(1.) * fl; f.st = max(f.st, min(1., fl));
    }
  }
#endif
#ifdef TINT
  if (uTint.w > 0.) f.c = mix(f.c, f.c * uTint.rgb, uTint.w);
#endif
#ifdef DRAIN
  if (uDrain > 0.){ float l = dot(f.c, vec3(.3, .55, .15)); f.c = mix(f.c, vec3(l) * vec3(0.82, 0.88, 1.0) * 0.8, uDrain * (1. - f.st * 0.5)); }
#endif
  f.c += vec3(1.0, 0.85, 0.5) * uSpark * f.st * 0.35;
  oColor = vec4(max(f.c, 0.), f.st);
  oFlow = vec4(clamp(f.v * 2.0 + 0.5, 0., 1.), f.sz, f.vis);
}
`;
export const FIELD = { HEAD, NIGHT, LETTER, ARLES, CROWS, LETTERS, MODERN, MAIN };

// ------------------------------------------------------------------ brush strokes, underpainting, bloom, final
// one plain draw of N*6 vertices; per-stroke data lives in a float texture (2 texels per stroke):
// texel 0 = x_px, y_px (y down), dirx, diry; texel 1 = length_px, width_px, alpha, seed
export const STROKE_VS = `#version 300 es
precision highp float;
uniform vec2 uScreen; uniform sampler2D uColor; uniform highp sampler2D uData;
out vec2 vLocal; out vec3 vCol; out float vAlpha; out float vSeed;
float h1(float x){ return fract(sin(x * 12.9898) * 43758.5453); }
const vec2 CORNER[6] = vec2[](vec2(-1, -1), vec2(1, -1), vec2(-1, 1), vec2(-1, 1), vec2(1, -1), vec2(1, 1));
void main(){
  int id = gl_VertexID / 6, cn = gl_VertexID - id * 6, tx = (id * 2) % 1024, ty = (id * 2) / 1024;
  vec4 aA = texelFetch(uData, ivec2(tx, ty), 0), aB = texelFetch(uData, ivec2(tx + 1, ty), 0);
  vec2 aCorner = CORNER[cn];
  if (aB.z < 0.02){ gl_Position = vec4(2., 2., 2., 1.); vLocal = vec2(0.); vCol = vec3(0.); vAlpha = 0.; vSeed = 0.; return; }
  vec2 dir = aA.zw, nrm = vec2(-dir.y, dir.x);
  vec2 pos = aA.xy + dir * aCorner.x * aB.x * 0.5 + nrm * aCorner.y * aB.y * 0.5;
  vec3 c = texture(uColor, vec2(aA.x / uScreen.x, 1.0 - aA.y / uScreen.y)).rgb;
  c *= 1.0 + 0.26 * (h1(aB.w) - 0.5);
  c += 0.05 * (vec3(h1(aB.w + 1.3), h1(aB.w + 2.7), h1(aB.w + 4.1)) - 0.5);
  float l = dot(c, vec3(0.3, 0.55, 0.15)); c = mix(vec3(l), c, 1.12);
  vCol = c; vAlpha = aB.z; vSeed = aB.w; vLocal = aCorner;
  gl_Position = vec4(pos.x / uScreen.x * 2.0 - 1.0, 1.0 - pos.y / uScreen.y * 2.0, 0.0, 1.0);
}`;

export const STROKE_FS = `#version 300 es
precision highp float;
in vec2 vLocal; in vec3 vCol; in float vAlpha; in float vSeed;
out vec4 o;
void main(){
  float u = vLocal.x, v = vLocal.y, av = abs(v) / (1.0 - 0.32 * u * u);
  float bristle = 0.5 + 0.5 * sin(v * 11.0 + vSeed * 17.0);
  float shape = smoothstep(1.0, 0.86, av) * smoothstep(1.0, 0.86, abs(u));
  float tail = smoothstep(-1.0, -0.62, u + 0.35 * bristle * (1.0 - abs(v)));
  float streak = 0.88 + 0.16 * sin(v * 14.0 + vSeed * 31.0 + u * 1.7);
  float relief = 1.0 + 0.16 * (-v) + 0.06 * (1.0 - av) - 0.10 * smoothstep(0.7, 1.0, av);
  o = vec4(vCol * streak * relief, shape * mix(1.0, tail, 0.8) * vAlpha);
}`;

export const UNDER_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o; uniform sampler2D uColor, uFlow;
void main(){ vec3 c = texture(uColor, vUv).rgb; float vis = texture(uFlow, vUv).a; o = vec4(c * mix(1.0, 0.82, vis), 1.0); }`;

export const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o; uniform sampler2D uTex;
void main(){ vec3 c = texture(uTex, vUv).rgb; float l = dot(c, vec3(0.3, 0.55, 0.15)); o = vec4(c * smoothstep(0.55, 0.95, l), 1.0); }`;

export const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec3 c = texture(uTex, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++){ c += texture(uTex, vUv + uDir * float(i)).rgb * w[i]; c += texture(uTex, vUv - uDir * float(i)).rgb * w[i]; }
  o = vec4(c, 1.0);
}`;

// canvas weave + tooth are static (they compress well); no per-frame noise
export const FINAL_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPaint, uBloom, uText; uniform float uBloomAmt, uFade, uWhite;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 c = texture(uPaint, vUv).rgb + uBloomAmt * texture(uBloom, vUv).rgb;
  vec2 fc = gl_FragCoord.xy;
  c *= 1.0 + 0.022 * sin(fc.x * 1.85) * sin(fc.y * 1.85);
  c *= 0.975 + 0.05 * hash12(floor(fc / 3.0) + 17.0);
  vec2 q = (vUv - 0.5) * vec2(1.35, 1.0);
  c *= mix(1.0, smoothstep(1.05, 0.25, length(q)), 0.55);
  vec4 tx = texture(uText, vUv); c = c * (1.0 - tx.a) + tx.rgb;
  c = mix(c, vec3(1.0, 0.97, 0.90), uWhite);
  c *= uFade;
  o = vec4(pow(clamp(c, 0.0, 1.0), vec3(0.95)), 1.0);
}`;
