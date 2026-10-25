// Time how long a scene's soundtrack takes to render offline, for the first N seconds.
//   node engine/audio-bench.mjs videos/001-buffon-needle 10,30
import path from 'node:path';
import { ROOT, startServer, openPage, parseArgs } from './server.mjs';

const args = parseArgs(process.argv.slice(2));
const sceneUrl = `/${path.relative(ROOT, path.resolve(args._[0], 'scene.js')).split(path.sep).join('/')}`;
const spans = String(args._[1] ?? '10').split(',').map(Number);
const { server, port } = await startServer();
const { browser, page } = await openPage();
try {
  await page.goto(`http://localhost:${port}/engine/page.html`);
  await page.waitForFunction(() => typeof window.runJob === 'function');
  const res = await page.evaluate(
    async ({ sceneUrl, spans }) => {
      const { loadFonts } = await import('/engine/fonts.js');
      await loadFonts();
      const scene = (await import(sceneUrl)).default;
      const canvas = document.createElement('canvas');
      canvas.width = scene.width;
      canvas.height = scene.height;
      if (scene.setup) await scene.setup({ canvas, ctx: canvas.getContext('2d') });
      const out = [];
      for (const s of spans) {
        const octx = new OfflineAudioContext(2, Math.ceil(s * 48000), 48000);
        await scene.audio(octx, { duration: scene.duration });
        const t0 = performance.now();
        await octx.startRendering();
        out.push({ seconds: s, renderMs: Math.round(performance.now() - t0) });
      }
      return out;
    },
    { sceneUrl, spans },
  );
  console.log(JSON.stringify(res));
} finally {
  await browser.close();
  server.close();
}
