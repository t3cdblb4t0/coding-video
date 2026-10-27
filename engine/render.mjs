// Render a scene to MP4, or render preview stills.
//   node engine/render.mjs videos/001-buffon-needle
//   node engine/render.mjs videos/001-buffon-needle --preview 0,2.5,10 [--scale 0.5]
//   node engine/render.mjs videos/004-random-walk --cover   (16:9, 4:3, 3:4 cover JPGs, if the scene has cover())
//   options: --out output/name.mp4   --no-silent (skip the extra copy without music)
import path from 'node:path';
import { ROOT, startServer, openPage, parseArgs } from './server.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args._[0]) {
  console.error('usage: node engine/render.mjs <scene-dir> [--preview t1,t2,...] [--scale 0.5] [--out file.mp4]');
  process.exit(2);
}
const sceneDir = path.resolve(args._[0]);
const id = path.basename(sceneDir);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sceneUrl = `/${rel(path.join(sceneDir, 'scene.js'))}`;

const { server, port } = await startServer();
const { browser, page } = await openPage();
let exitCode = 0;
try {
  await page.goto(`http://localhost:${port}/engine/page.html`);
  await page.waitForFunction(() => typeof window.runJob === 'function');
  const meta = await page.evaluate(async (u) => (await import(u)).default.meta ?? {}, sceneUrl);
  const outName = meta.output ?? `${id}.mp4`;
  const job = args.cover
    ? { mode: 'cover', scene: sceneUrl, outBase: `output/${outName.replace(/\.mp4$/i, '')}` }
    : args.preview
      ? { mode: 'preview', scene: sceneUrl, times: String(args.preview).split(',').map(Number), scale: Number(args.scale ?? 0.5), outDir: `previews/${id}` }
      : { mode: 'render', scene: sceneUrl, out: args.out ?? `output/${outName}`, silentCopy: !args['no-silent'] };
  const started = Date.now();
  const result = await page.evaluate((j) => window.runJob(j), job);
  console.log(JSON.stringify({ ...result, wallSeconds: (Date.now() - started) / 1000 }, null, 2));
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
process.exit(exitCode);
