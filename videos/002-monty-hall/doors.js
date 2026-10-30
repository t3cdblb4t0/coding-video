// Game-show doors with a car or a goat behind them. All drawing is vector (no images, no emoji).
import { clamp } from '../../engine/kit.js';
import { C, MONO } from './style.js';

// Car, side view facing right. (cx, base) = centre of the bottom of the wheels; s = width in px.
export function drawCar(g, cx, base, s, alpha = 1) {
  if (alpha <= 0) return;
  const k = s / 100;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(cx - 50 * k, base - 47.5 * k);
  g.scale(k, k);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(50, 47, 46, 3.2, 0, 0, Math.PI * 2);
  g.fill();
  const body = new Path2D('M3 38 L3 30 Q3 25 9 24 L24 22 Q33 10 46 10 L60 10 Q68 10 76 20 L90 23 Q97 24.5 97 31 L97 38 Q97 40 95 40 L5 40 Q3 40 3 38 Z');
  const grad = g.createLinearGradient(0, 10, 0, 40);
  grad.addColorStop(0, '#FFD98A');
  grad.addColorStop(0.55, '#FFB547');
  grad.addColorStop(1, '#E08A22');
  g.fillStyle = grad;
  g.fill(body);
  g.strokeStyle = '#8A4E0E';
  g.lineWidth = 1.4;
  g.stroke(body);
  g.fillStyle = '#1B2433';
  g.fill(new Path2D('M30 22 Q37 13.5 46 13.5 L49.5 13.5 L49.5 22 Z'));
  g.fill(new Path2D('M53 13.5 L60 13.5 Q66 13.5 72 21.5 L53 22 Z'));
  g.strokeStyle = 'rgba(138,78,14,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(51.5, 23);
  g.lineTo(51.5, 38);
  g.stroke();
  g.fillStyle = '#FFF6DE';
  g.fillRect(92, 27, 4.5, 3.5);
  g.fillStyle = '#E0563B';
  g.fillRect(3.5, 27, 3, 3.5);
  for (const wx of [24, 76]) {
    g.fillStyle = '#0B0F17';
    g.beginPath();
    g.arc(wx, 40, 7.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#C9D3E3';
    g.beginPath();
    g.arc(wx, 40, 3.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// Goat, side view facing right. (cx, base) = centre of the hooves line; s = width in px.
export function drawGoat(g, cx, base, s, alpha = 1) {
  if (alpha <= 0) return;
  const k = s / 100;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(cx - 50 * k, base - 78 * k);
  g.scale(k, k);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(46, 78, 34, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  const fur = '#E6EAF0';
  const shade = '#B9C2D1';
  const line = '#6E7B92';
  // Legs (behind the body), with dark hooves.
  for (const [x, top] of [[21, 46], [32, 48], [56, 48], [67, 46]]) {
    g.fillStyle = shade;
    g.fillRect(x, top, 5.5, 75 - top);
    g.fillStyle = '#4A5568';
    g.fillRect(x, 75, 5.5, 3);
  }
  // Tail.
  g.fillStyle = fur;
  g.beginPath();
  g.moveTo(15, 37);
  g.lineTo(8, 27);
  g.lineTo(19, 32);
  g.closePath();
  g.fill();
  // Body.
  g.fillStyle = fur;
  g.strokeStyle = line;
  g.lineWidth = 1.3;
  g.beginPath();
  g.ellipse(44, 41, 30, 15, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Neck.
  g.beginPath();
  g.moveTo(60, 33);
  g.quadraticCurveTo(69, 28, 73, 17);
  g.lineTo(84, 21);
  g.quadraticCurveTo(80, 34, 71, 46);
  g.closePath();
  g.fill();
  // Horns (curving back).
  g.strokeStyle = '#A89A7E';
  g.lineCap = 'round';
  g.lineWidth = 3.4;
  g.beginPath();
  g.moveTo(78, 12);
  g.quadraticCurveTo(73, 1, 63, 5);
  g.stroke();
  g.strokeStyle = '#C2B597';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(81, 12);
  g.quadraticCurveTo(78, 0, 69, 2);
  g.stroke();
  // Head and snout.
  g.fillStyle = fur;
  g.strokeStyle = line;
  g.lineWidth = 1.3;
  g.beginPath();
  g.ellipse(81, 18, 9.5, 7, 0.45, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.ellipse(89, 24, 6, 4.4, 0.55, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Ear (pointing back), beard, eye.
  g.fillStyle = shade;
  g.beginPath();
  g.ellipse(72, 17, 6.5, 2.6, -0.35, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#C9CFD9';
  g.beginPath();
  g.moveTo(88, 27);
  g.lineTo(90, 38);
  g.lineTo(84, 29);
  g.closePath();
  g.fill();
  g.fillStyle = '#1A202C';
  g.beginPath();
  g.arc(84, 16.5, 1.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// One door. (x, y) = top-left of the doorway; w, h = size. open in [0, 1] swings the leaf
// (hinged on the left) up to 80 degrees. content: 'car' | 'goat' | null. highlight in [0, 1].
export function drawDoor(g, d) {
  const { x, y, w, h, num, open = 0, content = null, highlight = 0, alpha = 1, frame = C.line, numColor = '#E9EEF6' } = d;
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  const pad = Math.max(4, w * 0.045);
  // Doorway (the opening behind the leaf), with a spotlight from above.
  g.fillStyle = '#05080D';
  g.beginPath();
  g.roundRect(x, y, w, h, [w * 0.06, w * 0.06, 0, 0]);
  g.fill();
  if (open > 0) {
    const spot = g.createRadialGradient(x + w / 2, y + h * 0.15, 4, x + w / 2, y + h * 0.55, h * 0.75);
    spot.addColorStop(0, `rgba(255,214,140,${0.22 * clamp(open * 2)})`);
    spot.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = spot;
    g.fillRect(x, y, w, h);
    const a = clamp(open * 1.6);
    if (content === 'car') drawCar(g, x + w / 2, y + h * 0.9, w * 0.84, a);
    else if (content === 'goat') drawGoat(g, x + w / 2, y + h * 0.9, w * 0.7, a);
  }
  // Leaf.
  const th = clamp(open) * (80 * Math.PI) / 180;
  const cw = Math.cos(th);
  const wp = w * cw;
  const dd = 0.06 * h * Math.sin(th);
  if (wp > 0.5) {
    const shadeK = 1 - 0.5 * Math.sin(th);
    const lg = g.createLinearGradient(x, y, x + wp, y + h);
    lg.addColorStop(0, `rgb(${Math.round(44 * shadeK)},${Math.round(58 * shadeK)},${Math.round(84 * shadeK)})`);
    lg.addColorStop(1, `rgb(${Math.round(27 * shadeK)},${Math.round(37 * shadeK)},${Math.round(56 * shadeK)})`);
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + wp, y - dd);
    g.lineTo(x + wp, y + h + dd);
    g.lineTo(x, y + h);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 1.5;
    g.stroke();
    if (cw > 0.25) {
      g.save();
      g.translate(x, y);
      g.scale(cw, 1);
      g.strokeStyle = 'rgba(255,255,255,0.09)';
      g.lineWidth = Math.max(1.5, w * 0.012);
      const ix = w * 0.13;
      g.beginPath();
      g.roundRect(ix, h * 0.1, w - 2 * ix, h * 0.36, w * 0.03);
      g.roundRect(ix, h * 0.54, w - 2 * ix, h * 0.36, w * 0.03);
      g.stroke();
      if (num !== undefined && num !== null) {
        g.fillStyle = numColor;
        g.font = `700 ${Math.round(h * 0.26)}px ${MONO}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(num), w / 2, h * 0.3);
      }
      g.fillStyle = C.amber;
      g.beginPath();
      g.arc(w * 0.86, h * 0.56, Math.max(2.5, w * 0.035), 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  // Frame, glowing amber when highlighted.
  g.save();
  if (highlight > 0) {
    g.shadowColor = `rgba(255,181,71,${0.9 * highlight})`;
    g.shadowBlur = 28 * highlight;
  }
  g.strokeStyle = highlight > 0 ? `rgba(255,181,71,${0.35 + 0.65 * highlight})` : frame;
  g.lineWidth = Math.max(2, w * 0.022) + 2 * highlight;
  g.beginPath();
  g.moveTo(x - pad, y + h);
  g.lineTo(x - pad, y - pad + w * 0.06);
  g.quadraticCurveTo(x - pad, y - pad, x - pad + w * 0.06, y - pad);
  g.lineTo(x + w + pad - w * 0.06, y - pad);
  g.quadraticCurveTo(x + w + pad, y - pad, x + w + pad, y - pad + w * 0.06);
  g.lineTo(x + w + pad, y + h);
  g.stroke();
  g.restore();
  g.restore();
}

// Stage floor line under a row of doors.
export function stageFloor(g, x0, x1, y, alpha = 1) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, 'rgba(150,170,200,0)');
  lg.addColorStop(0.15, 'rgba(150,170,200,0.45)');
  lg.addColorStop(0.85, 'rgba(150,170,200,0.45)');
  lg.addColorStop(1, 'rgba(150,170,200,0)');
  g.strokeStyle = lg;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  g.stroke();
  g.restore();
}
