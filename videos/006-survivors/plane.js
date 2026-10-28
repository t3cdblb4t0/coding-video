// A generic four-engine bomber seen from above, in plane-local units: nose up (y < 0), wingspan
// 1180, length 690, origin at the wing root. The same functions define the outline that is drawn
// and the regions used for hit-testing, so the picture and the simulation always agree.
// It is a drawing of no particular aircraft.
export const SPAN = 590; // half wingspan
export const NOSE = -330;
export const TAIL = 360;
export const NACELLES = [-340, -170, 170, 340]; // engine centre lines (x)
const NAC = { hw: 23, y0: -152, y1: 42 };
export const COCKPIT_Y = -238; // fuselage ahead of this line is the cockpit

export function fuselageHalfWidth(y) {
  if (y < NOSE || y > TAIL) return 0;
  if (y < -262) return 37 * Math.sqrt(Math.max(0, 1 - ((-262 - y) / 68) ** 2)); // elliptical nose
  if (y < 140) return 37;
  return 37 - ((y - 140) / (TAIL - 140)) * 25;
}
const wingLead = (ax) => -70 + (ax / SPAN) * 58;
const wingTrail = (ax) => 66 - (ax / SPAN) * 32;
const stabLead = (ax) => 262 + (ax / 205) * 24;
const stabTrail = (ax) => 336 - (ax / 205) * 14;

// Region name at (x, y), or null outside the aircraft. Engines win over wings, cockpit over fuselage.
export function regionAt(x, y) {
  const ax = Math.abs(x);
  for (const cx of NACELLES) {
    if (Math.abs(x - cx) <= NAC.hw && y >= NAC.y0 && y <= NAC.y1) return 'engine';
  }
  if (ax <= fuselageHalfWidth(y)) return y < COCKPIT_Y ? 'cockpit' : 'fuselage';
  if (ax <= SPAN && y >= wingLead(ax) && y <= wingTrail(ax)) return 'wing';
  if (ax <= 205 && y >= stabLead(ax) && y <= stabTrail(ax)) return 'tail';
  return null;
}
export const VITAL = new Set(['engine', 'cockpit']);
export const BOX = { x0: -SPAN, x1: SPAN, y0: NOSE, y1: TAIL };

// Outline as Path2D pieces (separate shapes, stroked; overlaps are fine for line art).
export function planePaths() {
  // Fuselage: sampled densely around the nose (the ellipse is steep there), sparsely elsewhere.
  const ys = [];
  for (let k = 0; k <= 60; k++) ys.push(-262 - 68 * Math.cos((k / 60) * (Math.PI / 2)));
  for (let k = 1; k <= 60; k++) ys.push(-262 + ((TAIL + 262) * k) / 60);
  const fus = new Path2D();
  ys.forEach((y, k) => (k === 0 ? fus.moveTo(fuselageHalfWidth(y), y) : fus.lineTo(fuselageHalfWidth(y), y)));
  for (let k = ys.length - 1; k >= 0; k--) fus.lineTo(-fuselageHalfWidth(ys[k]), ys[k]);
  fus.closePath();
  const wing = new Path2D();
  for (const s of [1, -1]) {
    wing.moveTo(s * 37, wingLead(37));
    wing.lineTo(s * (SPAN - 14), wingLead(SPAN - 14));
    wing.quadraticCurveTo(s * (SPAN + 6), (wingLead(SPAN) + wingTrail(SPAN)) / 2, s * (SPAN - 14), wingTrail(SPAN - 14));
    wing.lineTo(s * 37, wingTrail(37));
  }
  const stab = new Path2D();
  for (const s of [1, -1]) {
    stab.moveTo(s * 22, stabLead(22));
    stab.lineTo(s * 196, stabLead(196));
    stab.quadraticCurveTo(s * 212, (stabLead(205) + stabTrail(205)) / 2, s * 196, stabTrail(196));
    stab.lineTo(s * 18, stabTrail(18));
  }
  const nac = new Path2D();
  const props = new Path2D();
  for (const cx of NACELLES) {
    nac.roundRect(cx - NAC.hw, NAC.y0, NAC.hw * 2, NAC.y1 - NAC.y0, [NAC.hw, NAC.hw, 8, 8]);
    props.moveTo(cx - 58, NAC.y0 - 6);
    props.lineTo(cx + 58, NAC.y0 - 6);
  }
  const details = new Path2D();
  details.moveTo(-30, COCKPIT_Y);
  details.quadraticCurveTo(0, COCKPIT_Y - 16, 30, COCKPIT_Y);
  details.moveTo(0, 150);
  details.lineTo(0, TAIL - 6); // fin, seen from above
  return { fus, wing, stab, nac, props, details };
}

// Region outlines used for highlighting (A wings / B fuselage / C engines).
export function regionPath(name) {
  const p = new Path2D();
  if (name === 'engine') for (const cx of NACELLES) p.roundRect(cx - NAC.hw - 6, NAC.y0 - 6, NAC.hw * 2 + 12, NAC.y1 - NAC.y0 + 12, 14);
  return p;
}

// Label anchors for the three choices, plane-local.
export const CHOICES = {
  A: { x: -470, y: 8, label: '机翼' },
  B: { x: 0, y: 40, label: '机身' },
  C: { x: 340, y: -120, label: '发动机' },
};
