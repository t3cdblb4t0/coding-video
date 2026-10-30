// Caption density of a scene, against the numbers measured on the #vibe知识大赏 films that took off
// (运营/爆款拆解.md): <= 18 Chinese characters a line, 140-240 a minute, and stretches with none.
//   node engine/caption-density.mjs videos/006-survivors
// The scene module must export getCaptions() -> [{ t0, t1, zh, vzh? }] (zh: string or rich text).
import path from 'node:path';
import { ROOT, startServer, openPage, parseArgs } from './server.mjs';

const args = parseArgs(process.argv.slice(2));
const sceneUrl = `/${path.relative(ROOT, path.resolve(args._[0], 'scene.js')).split(path.sep).join('/')}`;
const { server, port } = await startServer();
const { browser, page } = await openPage();
try {
  await page.goto(`http://localhost:${port}/engine/page.html`);
  await page.waitForFunction(() => typeof window.runJob === 'function');
  const res = await page.evaluate(async (url) => {
    const { loadFonts } = await import('/engine/fonts.js');
    await loadFonts();
    const mod = await import(url);
    const scene = mod.default;
    const c = document.createElement('canvas');
    c.width = scene.width;
    c.height = scene.height;
    await scene.setup({ canvas: c, ctx: c.getContext('2d') });
    const text = (z) => (typeof z === 'string' ? z : (z || []).map((s) => s[0]).join(''));
    const count = (s) => [...s].filter((ch) => /[\u4e00-\u9fff0-9A-Za-z%]/.test(ch)).length;
    const dur = scene.duration;
    const rows = mod.getCaptions().map((cap) => ({ t0: cap.t0, n: count(text(cap.zh) || text(cap.vzh)), on: Math.min(cap.t1, dur) - Math.max(0, cap.t0) }));
    return { dur, rows };
  }, sceneUrl);
  const { dur, rows } = res;
  const chars = rows.reduce((s, r) => s + r.n, 0);
  const on = rows.reduce((s, r) => s + r.on, 0);
  const long = rows.filter((r) => r.n > 18);
  console.log(`${rows.length} captions in ${dur.toFixed(1)} s`);
  console.log(`  ${Math.round(chars / (dur / 60))} characters a minute   (target 140-240)`);
  console.log(`  ${(chars / rows.length).toFixed(1)} a line on average, longest ${Math.max(...rows.map((r) => r.n))}   (target <= 18)`);
  console.log(`  captions on screen ${Math.round((100 * on) / dur)}% of the time   (films measured: 58-74%)`);
  for (const r of long) console.log(`  over 18: ${r.t0}s (${r.n})`);
} finally {
  await browser.close();
  server.close();
}
