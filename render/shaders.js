// GLSL sources. World coords: screen height = 1, y up, origin at the horizon-ish centre.

export const FULLSCREEN_VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// ---------------------------------------------------------------------------
// Scene field: per texel -> colour (rgb) and flow (world velocity, stroke size, visibility)
// ---------------------------------------------------------------------------
export const FIELD_FS = `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oFlow;

uniform float uAspect, uTime;
uniform vec4  uCam;                       // cx, cy, zoom, rot
uniform float uNight, uSun, uSwirl, uTurb, uYellow, uMany, uStarGlow, uBright, uMoon;
uniform float uGround, uFigure, uVillage, uCypress, uCold, uWall, uBars, uCut, uPulse, uSpark;
uniform vec2  uMorphC;
uniform vec4  uStars[12];                 // x, y, R, brightness

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2  hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdSeg(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }

// Gaussian vortex: accumulates stream function and its gradient
void vortex(vec2 p, vec2 c, float R, float s, inout float psi, inout vec2 g){
  vec2 d = p - c; float e = exp(-dot(d, d) / (R * R));
  psi += s * R * e; g += s * R * e * (-2.0 * d / (R * R));
}
vec2 curl(vec2 g){ return vec2(g.y, -g.x); }

float turbPsi(vec2 p){ return fbm(p * 3.2 + vec2(0.0, uTime * 0.04)); }

// Starry-night halo colours
vec4 halo(vec2 p, vec2 c, float R, float b){
  float d = length(p - c) / R;
  if (d > 1.25) return vec4(0.);
  vec3 core = vec3(1.0, 0.98, 0.86), ringY = vec3(0.98, 0.83, 0.30), ringP = vec3(0.93, 0.95, 0.80), ringB = vec3(0.50, 0.70, 0.86);
  float rings = 0.5 + 0.5 * cos(d * 21.0 - uTime * 0.6);
  vec3 col = mix(ringY, ringP, rings);
  col = mix(col, ringB, smoothstep(0.55, 1.05, d) * 0.65);
  col = mix(core, col, smoothstep(0.10, 0.30, d));
  float a = clamp(b, 0., 1.) * (1.0 - smoothstep(0.62, 1.2, d));
  return vec4(col * (0.85 + 0.25 * b), a);
}

float hillBack(float x){ return -0.135 + 0.032 * sin(2.1 * x + 0.7) + 0.018 * sin(5.3 * x + 2.0); }
float hillFront(float x){ return -0.235 + 0.055 * sin(1.4 * x - 0.4) + 0.022 * sin(3.7 * x + 1.1); }
float dHill(float x, int which){ float e = 0.002; return which == 0 ? (hillBack(x + e) - hillBack(x - e)) / (2. * e) : (hillFront(x + e) - hillFront(x - e)) / (2. * e); }

// layer composite helper
void over(inout vec3 c, inout vec2 v, inout float sz, vec3 c2, vec2 v2, float sz2, float a){
  c = mix(c, c2, a); v = mix(v, v2, a); sz = mix(sz, sz2, a);
}

void main(){
  // ---- screen -> world (with "cut into pieces" offsets per window panel)
  vec2 s = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec2 wHalf = mix(vec2(1.25, 0.8), vec2(0.52, 0.355), uWall);
  float panel = floor((s.x + 0.3) / 0.2);
  vec2 cutOff = uCut * vec2(0.03 * (hash12(vec2(panel, 3.)) - 0.5), 0.10 * (hash12(vec2(panel, 7.)) - 0.5));
  vec2 p = uCam.xy + rot(uCam.w) * s / uCam.z + cutOff;
  float t = uTime;

  // ======================= NIGHT SKY =======================
  float psi = 0.; vec2 g = vec2(0.);
  float sw = uSwirl;
  vec2 c1 = vec2(-0.13 + 0.015 * sin(t * 0.11), 0.19), c2 = vec2(0.10, 0.14 + 0.01 * sin(t * 0.13)), c3 = vec2(-0.52, 0.14);
  vortex(p, c1, 0.17, 0.070 * sw, psi, g);
  vortex(p, c2, 0.12, 0.060 * sw, psi, g);
  vortex(p, c3, 0.10, -0.045 * sw, psi, g);
  vortex(p, vec2(0.60, 0.05), 0.11, 0.035 * sw, psi, g);
  // the "river" band crossing the sky
  float yc = 0.12 + 0.07 * sin(2.4 * p.x + 0.3), ycp = 0.07 * 2.4 * cos(2.4 * p.x + 0.3), wv = 0.075;
  float th = tanh((p.y - yc) / wv), sech2 = 1. - th * th, A = 0.05 * sw;
  psi += A * wv * th; g += vec2(-A * sech2 * ycp, A * sech2);
  // stars and moon swirl
  vec2 moonC = vec2(0.63, 0.33);
  for (int i = 0; i < 12; i++){ vec4 st = uStars[i]; if (st.w <= 0.) continue; vortex(p, st.xy, st.z * 1.6, 0.05 * sw, psi, g); }
  vortex(p, moonC, 0.13, 0.045 * sw * uMoon, psi, g);
  // morph swirl (day -> night)
  float morphK = uNight * (1. - uNight) * 4.;
  vortex(p, uMorphC, 0.35, 0.22 * morphK, psi, g);
  // turbulence (numeric gradient)
  float e = 0.004, T = 0.016 * uTurb;
  psi += T * turbPsi(p);
  g += T * vec2(turbPsi(p + vec2(e, 0)) - turbPsi(p - vec2(e, 0)), turbPsi(p + vec2(0, e)) - turbPsi(p - vec2(0, e))) / (2. * e);
  vec2 vSky = curl(g) + vec2(0.006, 0.0);

  float hgt = smoothstep(-0.15, 0.48, p.y);
  vec3 deep = vec3(0.035, 0.085, 0.27), mid = vec3(0.10, 0.25, 0.56), light = vec3(0.33, 0.55, 0.78), pale = vec3(0.70, 0.83, 0.82);
  vec3 sky = mix(mix(light, mid, 0.55), deep, hgt);
  float band = 0.5 + 0.5 * sin(psi * 420. + fbm(p * 7.) * 2.2);
  sky = mix(sky, mix(mid, pale, smoothstep(0.62, 1.0, band)), 0.55 * smoothstep(0.25, 0.95, band));
  // yellow streams ("黄是倔强")
  float yb = smoothstep(0.78, 0.95, 0.5 + 0.5 * sin(psi * 210. + 1.3 + fbm(p * 5. + 3.) * 2.));
  sky = mix(sky, vec3(0.93, 0.80, 0.36), yb * (0.18 + 0.75 * uYellow));
  float szSky = 0.72, starMask = 0.;

  vec3 col = sky; vec2 vel = vSky; float sz = szSky;

  // many small stars ("万人")
  if (uMany > 0.){
    vec2 cell = floor(p / 0.055);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
      vec2 cc = cell + vec2(i, j);
      if (hash12(cc + 7.1) > uMany * 0.48) continue;
      vec2 sp = (cc + 0.2 + 0.6 * hash22(cc)) * 0.055;
      if (sp.y < -0.05) continue;
      float tw = 0.65 + 0.35 * sin(t * (2. + 3. * hash12(cc + 1.)) + 20. * hash12(cc)) + 0.4 * uPulse;
      vec4 h = halo(p, sp, 0.008 + 0.009 * hash12(cc + 2.), tw * smoothstep(0., 0.6, uMany * 0.48 - hash12(cc + 7.1) + 0.3));
      if (h.a > 0.){ col = mix(col, h.rgb, h.a); sz = mix(sz, 0.18, h.a); starMask = max(starMask, h.a); }
    }
  }
  // big stars
  for (int i = 0; i < 12; i++){
    vec4 st = uStars[i]; if (st.w <= 0.) continue;
    float b = st.w * uStarGlow * (1. + 0.35 * uPulse);
    vec4 h = halo(p, st.xy, st.z * (1. + 0.12 * uPulse), b);
    if (h.a > 0.){ col = mix(col, h.rgb, h.a); sz = mix(sz, 0.3, h.a); starMask = max(starMask, h.a); }
  }
  // moon
  if (uMoon > 0.){
    vec4 h = halo(p, moonC, 0.15, 0.9 * uMoon);
    col = mix(col, mix(h.rgb, vec3(0.97, 0.72, 0.25), 0.35), h.a); sz = mix(sz, 0.32, h.a); starMask = max(starMask, h.a);
    float dm = length(p - moonC), cres = step(dm, 0.052) * step(0.045, length(p - moonC - vec2(0.022, 0.014)));
    col = mix(col, vec3(1.0, 0.80, 0.30), cres * uMoon); sz = mix(sz, 0.15, cres); starMask = max(starMask, cres);
  }

  // ---- ground: hills
  float hb = hillBack(p.x), hf = hillFront(p.x);
  if (p.y < hb + 0.004){
    float a = smoothstep(hb + 0.004, hb - 0.004, p.y) * uGround;
    vec2 tdir = normalize(vec2(1., dHill(p.x, 0)));
    float bb = 0.5 + 0.5 * sin((p.y - hb) * 160. + fbm(p * 9.) * 3.);
    vec3 hc = mix(vec3(0.10, 0.20, 0.32), vec3(0.20, 0.36, 0.48), bb * 0.7);
    over(col, vel, sz, hc, tdir * 0.012, 0.55, a); starMask *= 1. - a;
  }
  if (p.y < hf + 0.004){
    float a = smoothstep(hf + 0.004, hf - 0.004, p.y) * uGround;
    vec2 tdir = normalize(vec2(1., dHill(p.x, 1)));
    float bb = 0.5 + 0.5 * sin((p.y - hf) * 120. + fbm(p * 8. + 4.) * 3.);
    vec3 hc = mix(vec3(0.05, 0.11, 0.18), vec3(0.13, 0.24, 0.30), bb * 0.6);
    over(col, vel, sz, hc, tdir * 0.010, 0.6, a); starMask *= 1. - a;
  }
  // ---- village under the back hill
  if (uVillage > 0. && p.y < hb + 0.10 && p.y > hb - 0.04 && p.x > -0.34 && p.x < 0.82){
    for (int i = 0; i < 17; i++){
      float fi = float(i), hx = -0.31 + fi * 0.068 + 0.022 * hash12(vec2(fi, 1.));
      float bw = 0.010 + 0.009 * hash12(vec2(fi, 2.)), bh = 0.005 + 0.007 * hash12(vec2(fi, 3.));
      bool church = (i == 7);
      if (church){ bw = 0.010; bh = 0.020; }
      float by = hillBack(hx) - 0.006;
      vec2 q = p - vec2(hx, by + bh);
      float dWall = sdBox(q, vec2(bw, bh));
      float roofH = church ? 0.070 : 0.010 + 0.008 * hash12(vec2(fi, 5.));
      vec2 rq = p - vec2(hx, by + 2. * bh);
      float roof = (rq.y > 0. && rq.y < roofH && abs(rq.x) < (bw + 0.004) * (1. - rq.y / roofH)) ? 1. : 0.;
      float wallA = smoothstep(0.002, -0.001, dWall) * uVillage;
      if (wallA > 0.){
        vec3 wc = mix(vec3(0.16, 0.24, 0.36), vec3(0.30, 0.38, 0.48), hash12(vec2(fi, 4.)));
        vec2 cellW = vec2(0.0075, 0.0068);
        vec2 wq = fract((q + vec2(bw, bh)) / cellW) - 0.5;
        float win = step(abs(wq.x), 0.24) * step(abs(wq.y), 0.26) * step(0.55, hash12(floor((q + vec2(bw, bh)) / cellW) + fi * 9.));
        wc = mix(wc, vec3(1.0, 0.80, 0.30), win);
        over(col, vel, sz, wc, vec2(0., 0.004), 0.12, wallA);
        starMask = max(starMask * (1. - wallA), win * wallA);
      }
      if (roof > 0.) over(col, vel, sz, vec3(0.08, 0.13, 0.22), vec2(0.006, 0.), 0.14, roof * uVillage);
    }
  }
  // ---- lone painter with easel on the front hill
  if (uFigure > 0.){
    float fx = 0.16, H = 0.075; vec2 b0 = vec2(fx, hillFront(fx) - 0.004);
    vec2 q = (p - b0) / H;
    float d = sdSeg(q, vec2(-0.05, 0.), vec2(-0.02, 0.45), 0.06);
    d = min(d, sdSeg(q, vec2(0.07, 0.), vec2(0.03, 0.45), 0.06));
    d = min(d, sdSeg(q, vec2(0.0, 0.45), vec2(0.0, 0.78), 0.12));
    d = min(d, length(q - vec2(0.0, 0.9)) - 0.085);
    d = min(d, sdSeg(q, vec2(-0.16, 0.97), vec2(0.16, 0.97), 0.025));            // straw hat brim
    d = min(d, sdSeg(q, vec2(0.0, 0.7), vec2(0.30, 0.62), 0.04));                // arm with brush
    float easel = min(sdSeg(q, vec2(0.36, 0.0), vec2(0.50, 0.95), 0.02), sdSeg(q, vec2(0.66, 0.0), vec2(0.52, 0.95), 0.02));
    float canv = sdBox(q - vec2(0.51, 0.62), vec2(0.13, 0.16));
    float a = smoothstep(0.03, -0.01, d) * uFigure, ae = smoothstep(0.03, -0.01, easel) * uFigure, ac = smoothstep(0.02, -0.01, canv) * uFigure;
    over(col, vel, sz, vec3(0.025, 0.04, 0.08), vec2(0., 0.002), 0.05, max(a, ae));
    over(col, vel, sz, vec3(0.95, 0.78, 0.32), vec2(0., 0.002), 0.05, ac);
    float candle = smoothstep(0.12, 0.0, length(q - vec2(0.0, 1.06))) * uFigure;   // candle on the hat
    col += vec3(1.0, 0.75, 0.3) * candle * 0.8; starMask = max(starMask, max(ac, candle));
  }
  // ---- cypress, left foreground, flame-like
  if (uCypress > 0.){
    float x0 = -0.60, top = 0.43, y = p.y;
    float k = clamp((top - y) / 1.05, 0., 1.);
    float cx = x0 + 0.045 * sin(y * 5. + t * 0.45) * (y + 0.6) + 0.02 * (fbm(vec2(y * 3., t * 0.1)) - 0.5);
    float w = 0.085 * pow(k, 0.7) * (0.72 + 0.55 * fbm(vec2(y * 6., t * 0.2))) + 0.02 * sin(y * 26. + t * 1.2 + 3. * fbm(vec2(y * 4., 1.))) * k;
    float d = abs(p.x - cx) - w;
    float a = smoothstep(0.006, -0.004, d) * step(y, top) * uCypress;
    if (a > 0.){
      float bb = 0.5 + 0.5 * sin((p.x - cx) * 110. + fbm(p * 10.) * 4.);
      vec3 cc = mix(vec3(0.05, 0.10, 0.07), vec3(0.17, 0.30, 0.17), bb);
      cc = mix(cc, vec3(0.33, 0.27, 0.13), smoothstep(0.85, 1.0, bb) * 0.6);
      vec2 cv = vec2(0.35 * sin(y * 12. + t * 1.3 + (p.x - cx) * 40.), 1.) * 0.045;
      over(col, vel, sz, cc, cv, 0.5, a); starMask *= 1. - a;
    }
  }

  // ======================= DAY (Arles wheat field + sun) =======================
  if (uSun > 0.){
    float dpsi = 0.; vec2 dg = vec2(0.);
    vec2 sunC = uMorphC;
    vortex(p, sunC, 0.22, 0.09, dpsi, dg);
    vortex(p, vec2(-0.45, 0.28), 0.18, -0.04, dpsi, dg);
    vec2 vDay = curl(dg) + vec2(0.012, 0.);
    vec3 dsky = mix(vec3(0.42, 0.72, 0.74), vec3(0.24, 0.52, 0.70), smoothstep(-0.1, 0.5, p.y));
    float db = 0.5 + 0.5 * sin(dpsi * 300. + fbm(p * 6.) * 2.);
    dsky = mix(dsky, vec3(0.80, 0.90, 0.78), smoothstep(0.7, 1.0, db) * 0.6);
    vec3 dc = dsky; float dsz = 0.75;
    float dsun = length(p - sunC);
    vec3 sunCol = mix(vec3(1.0, 0.88, 0.35), vec3(0.97, 0.64, 0.18), 0.5 + 0.5 * cos(dsun * 70. - t * 1.5));
    sunCol = mix(vec3(1.0, 0.95, 0.62), sunCol, smoothstep(0.04, 0.09, dsun));
    float sa = 1. - smoothstep(0.16, 0.30, dsun);
    dc = mix(dc, sunCol, sa); dsz = mix(dsz, 0.35, sa);
    float hd = -0.07 + 0.02 * sin(2.6 * p.x + 1.0);
    float fa = smoothstep(hd + 0.004, hd - 0.004, p.y);
    if (fa > 0.){
      float wb = 0.5 + 0.5 * sin(p.y * 90. + sin(p.x * 6. + t * 0.8) * 2. + fbm(p * 8.) * 3.);
      vec3 wc = mix(vec3(0.80, 0.55, 0.12), vec3(0.97, 0.80, 0.25), wb);
      wc = mix(wc, vec3(1.0, 0.92, 0.55), smoothstep(0.9, 1.0, wb) * 0.7);
      vec2 wvv = vec2(1., 0.35 * sin(p.x * 6. + t * 0.8 + p.y * 10.)) * 0.05;
      dc = mix(dc, wc, fa); vDay = mix(vDay, wvv, fa); dsz = mix(dsz, 0.62, fa);
    }
    // spiral-shaped boundary where night eats the day
    vec2 dd = p - uMorphC; float r = length(dd), ang = atan(dd.y, dd.x);
    float edge = 0.09 + r * 0.85 + 0.10 * sin(ang * 2. + r * 16.) * min(1., r * 6.) + 0.18 * fbm(p * 5.);
    float nightA = smoothstep(edge - 0.06, edge + 0.06, (1. - uSun) * 2.3);
    float dayA = 1. - nightA;
    col = mix(col, dc, dayA); vel = mix(vel, vDay, dayA); sz = mix(sz, dsz, dayA); starMask *= nightA;
  }

  // ---- colder palette after 1889 (keep the stars warm)
  if (uCold > 0.){
    float l = dot(col, vec3(0.3, 0.55, 0.15));
    vec3 cold = mix(vec3(l), col, 0.6) * vec3(0.82, 0.92, 1.12);
    col = mix(col, cold, uCold * (1. - starMask * 0.85));
  }

  // ======================= SCREEN-SPACE: asylum wall + window bars =======================
  float vis = 1.;
  if (uWall > 0.){
    vec2 ws = abs(s) - wHalf;
    float outside = smoothstep(-0.003, 0.003, max(ws.x, ws.y));
    float frame = smoothstep(0.022, 0.018, abs(max(ws.x, ws.y) + 0.0)) * step(-0.03, max(ws.x, ws.y));
    float wn = fbm(s * 9. + 2.);
    vec3 wallC = mix(vec3(0.40, 0.38, 0.26), vec3(0.60, 0.53, 0.36), wn);
    wallC = mix(wallC, vec3(0.36, 0.42, 0.30), smoothstep(0.55, 0.8, fbm(s * 4. + 9.)) * 0.5);   // greenish asylum plaster
    wallC *= 0.75 + 0.25 * smoothstep(0.9, 0.2, length(s));
    float wa = 1.57 + 1.3 * (fbm(s * 3.5 + 5.) - 0.5) * 2.;                                        // patchy, cross-hatched directions
    vec2 wvel = rot(uCam.w) * vec2(cos(wa), sin(wa)) * 0.008 / uCam.z;
    over(col, vel, sz, wallC, wvel, 0.85, outside);
    over(col, vel, sz, vec3(0.13, 0.10, 0.07), wvel, 0.25, frame * uWall);
  }
  if (uBars > 0.){
    for (int i = 0; i < 4; i++){
      float fi = float(i), pr = clamp(uBars - fi, 0., 1.);
      if (pr <= 0.) continue;
      float bx = -0.3 + fi * 0.2;
      float topY = wHalf.y, botY = wHalf.y - pr * 2. * wHalf.y;
      float a = smoothstep(0.017, 0.012, abs(s.x - bx)) * step(botY, s.y) * step(s.y, topY);
      vec3 bc = mix(vec3(0.05, 0.05, 0.07), vec3(0.34, 0.36, 0.40), smoothstep(0.006, -0.010, s.x - bx) * 0.7);
      over(col, vel, sz, bc, rot(uCam.w) * vec2(0., -0.02) / uCam.z, 0.2, a); starMask *= 1. - a;
    }
    float cb = clamp((uBars - 3.5) * 2., 0., 1.);
    float a = smoothstep(0.015, 0.011, abs(s.y - 0.07)) * step(abs(s.x), wHalf.x * cb);
    over(col, vel, sz, vec3(0.09, 0.09, 0.11), rot(uCam.w) * vec2(0.02, 0.) / uCam.z, 0.2, a);
  }

  col += vec3(1.0, 0.85, 0.5) * uSpark * starMask * 0.35;
  oColor = vec4(max(col, 0.), starMask);
  oFlow = vec4(clamp(vel * 2.0 + 0.5, 0., 1.), sz, vis);
}`;

// ---------------------------------------------------------------------------
// Brush strokes (instanced quads)
// ---------------------------------------------------------------------------
export const STROKE_VS = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aA;           // x_px, y_px (y down), dirx, diry
layout(location=2) in vec4 aB;           // length_px, width_px, alpha, seed
uniform vec2 uScreen;
uniform sampler2D uColor;
out vec2 vLocal; out vec3 vCol; out float vAlpha; out float vSeed;
float h1(float x){ return fract(sin(x * 12.9898) * 43758.5453); }
void main(){
  vec2 dir = aA.zw, nrm = vec2(-dir.y, dir.x);
  vec2 pos = aA.xy + dir * aCorner.x * aB.x * 0.5 + nrm * aCorner.y * aB.y * 0.5;
  vec2 uv = vec2(aA.x / uScreen.x, 1.0 - aA.y / uScreen.y);
  vec3 c = texture(uColor, uv).rgb;
  float j = h1(aB.w) - 0.5;
  c *= 1.0 + 0.26 * j;
  c += 0.05 * (vec3(h1(aB.w + 1.3), h1(aB.w + 2.7), h1(aB.w + 4.1)) - 0.5);
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(vec3(l), c, 1.12);                                   // a touch more saturated than the field
  vCol = c; vAlpha = aB.z; vSeed = aB.w; vLocal = aCorner;
  gl_Position = vec4(pos.x / uScreen.x * 2.0 - 1.0, 1.0 - pos.y / uScreen.y * 2.0, 0.0, 1.0);
}`;

export const STROKE_FS = `#version 300 es
precision highp float;
in vec2 vLocal; in vec3 vCol; in float vAlpha; in float vSeed;
out vec4 o;
void main(){
  float u = vLocal.x, v = vLocal.y;
  float taper = 1.0 - 0.32 * u * u;
  float av = abs(v) / taper;
  float bristle = 0.5 + 0.5 * sin(v * 11.0 + vSeed * 17.0);
  float shape = smoothstep(1.0, 0.86, av) * smoothstep(1.0, 0.86, abs(u));
  float tail = smoothstep(-1.0, -0.62, u + 0.35 * bristle * (1.0 - abs(v)));
  float a = shape * mix(1.0, tail, 0.8) * vAlpha;
  float streak = 0.88 + 0.16 * sin(v * 14.0 + vSeed * 31.0 + u * 1.7);
  float relief = 1.0 + 0.16 * (-v) + 0.06 * (1.0 - av) - 0.10 * smoothstep(0.7, 1.0, av);   // impasto: lit ridge, dark rim
  o = vec4(vCol * streak * relief, a);
}`;

// Underpainting: the field colour, slightly darker, so gaps between strokes read as depth
export const UNDER_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uColor;
void main(){ vec3 c = texture(uColor, vUv).rgb; o = vec4(c * 0.82, 1.0); }`;

export const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex;
void main(){ vec3 c = texture(uTex, vUv).rgb; float l = dot(c, vec3(0.3, 0.55, 0.15)); o = vec4(c * smoothstep(0.55, 0.95, l), 1.0); }`;

export const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec3 c = texture(uTex, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++){ c += texture(uTex, vUv + uDir * float(i)).rgb * w[i]; c += texture(uTex, vUv - uDir * float(i)).rgb * w[i]; }
  o = vec4(c, 1.0);
}`;

export const FINAL_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPaint, uBloom, uText;
uniform float uFrame, uBloomAmt, uFade, uTextOn;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 c = texture(uPaint, vUv).rgb + uBloomAmt * texture(uBloom, vUv).rgb;
  vec2 fc = gl_FragCoord.xy;
  c *= 1.0 + 0.028 * sin(fc.x * 1.85) * sin(fc.y * 1.85);                 // canvas weave
  c *= 0.97 + 0.06 * hash12(floor(fc / 3.0) + 17.0);                        // canvas tooth
  c += (hash12(fc + uFrame * 13.17) - 0.5) * 0.03;                          // grain
  vec2 q = (vUv - 0.5) * vec2(1.35, 1.0);
  c *= mix(1.0, smoothstep(1.05, 0.25, length(q)), 0.55);                   // vignette
  if (uTextOn > 0.5){ vec4 tx = texture(uText, vUv); c = c * (1.0 - tx.a) + tx.rgb; }
  c *= uFade;
  o = vec4(pow(clamp(c, 0.0, 1.0), vec3(0.95)), 1.0);
}`;
