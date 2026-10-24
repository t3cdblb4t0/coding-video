// Pipeline smoke test: moving shapes, CJK text, a 440 Hz beep every second, colour bars.
import { SANS, MONO } from '../../engine/fonts.js';

const W = 1080;
const H = 1920;
const BARS = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff', '#ffb547'];

export default {
  meta: { title: 'smoke test', output: '000-smoke-test.mp4' },
  width: W, height: H, fps: 30, duration: 3,
  draw(ctx, t) {
    ctx.fillStyle = '#101418';
    ctx.fillRect(0, 0, W, H);
    BARS.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * (W / BARS.length), 1500, W / BARS.length, 200);
    });
    ctx.fillStyle = '#ffb547';
    ctx.beginPath();
    ctx.arc(W / 2 + Math.sin(t * 3) * 300, 800, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `900 110px ${SANS}`;
    ctx.fillText('中文测试 π', W / 2, 400);
    ctx.font = `600 64px ${MONO}`;
    ctx.fillText(`t = ${t.toFixed(2)}`, W / 2, 1200);
  },
  audio(octx, { duration }) {
    for (let s = 0; s < duration; s++) {
      const o = octx.createOscillator();
      const g = octx.createGain();
      o.frequency.value = 440;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.5, s + 0.01);
      g.gain.linearRampToValueAtTime(0, s + 0.2);
      o.connect(g).connect(octx.destination);
      o.start(s);
      o.stop(s + 0.25);
    }
  },
};
