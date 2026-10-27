// Print how every caption of a scene wraps for a narrow caption column, using the real fonts.
//   node engine/caption-check.mjs videos/004-random-walk-vertical
// The scene module must export captionLayout(ctx, cap) -> { zh: { size, lines }, en: { size, lines } }.
import path from 'node:path';
import { ROOT, startServer, openPage, parseArgs } from './server.mjs';

const args = parseArgs(process.argv.slice(2));
const sceneUrl = `/${path.relative(ROOT, path.resolve(args._[0], 'scene.js')).split(path.sep).join('/')}`;
const { server, port } = await startServer();
const { browser, page } = await openPage();
try {
  await page.goto(`http://localhost:${port}/engine/page.html`);
  await page.waitForFunction(() => typeof window.runJob === 'function');
  const rows = await page.evaluate(async (url) => {
    const { loadFonts } = await import('/engine/fonts.js');
    await loadFonts();
    const mod = await import(url);
    const scene = mod.default;
    const c = document.createElement('canvas');
    c.width = scene.width;
    c.height = scene.height;
    const ctx = c.getContext('2d');
    await scene.setup({ canvas: c, ctx });
    const text = (ln) => ln.map(([s]) => s).join('');
    return mod.allCaptions().map((cap) => {
      const L = mod.captionLayout(ctx, cap);
      return { t0: cap.t0, zh: `${L.zh.size}px ${L.zh.lines.map(text).join(' | ')}`, en: `${L.en.size}px ${L.en.lines.length} lines` };
    });
  }, sceneUrl);
  for (const r of rows) console.log(String(r.t0).padStart(6), ' ', r.zh, '   ', r.en);
} finally {
  await browser.close();
  server.close();
}
