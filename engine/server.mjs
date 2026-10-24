// Shared Node helpers: a tiny static server rooted at the repo (with Range support so
// <video> can seek), a file-upload endpoint for the page, and a headless Chrome launcher.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg',
};

function inRepo(rel) {
  const p = path.resolve(ROOT, rel.replace(/^\/+/, ''));
  if (p !== ROOT && !p.startsWith(ROOT + path.sep)) throw new Error(`path escapes repo: ${rel}`);
  return p;
}

function serveFile(req, res, file) {
  const { size } = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const m = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  if (!m) {
    res.writeHead(200, { ...headers, 'Content-Length': size });
    fs.createReadStream(file).pipe(res);
    return;
  }
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] !== '' && m[2] !== '' ? Number(m[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(end, size - 1);
  if (start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }
  res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
  fs.createReadStream(file, { start, end }).pipe(res);
}

// extraFiles: { '/ext/name.mp4': '/abs/path' } lets inspect.mjs open files outside the repo.
export function startServer({ extraFiles = {} } = {}) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && url.pathname === '/api/file') {
        const dest = inRepo(url.searchParams.get('path'));
        const parts = [];
        req.on('data', (c) => parts.push(c));
        req.on('end', () => {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, Buffer.concat(parts));
          res.writeHead(200);
          res.end('ok');
        });
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      const file = extraFiles[pathname] ?? inRepo(pathname);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      serveFile(req, res, file);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function findPlaywrightCore() {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_CORE, 'playwright-core'].filter(Boolean);
  try {
    const g = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    candidates.push(
      path.join(g, 'playwright-core'),
      path.join(g, '@playwright/mcp/node_modules/playwright-core'),
      path.join(g, 'playwright/node_modules/playwright-core'),
    );
  } catch {}
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error('playwright-core not found (set PLAYWRIGHT_CORE to its directory)');
}

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH, '/inner_container/opt/playwright', '/opt/playwright',
    path.join(os.homedir(), '.cache/ms-playwright'),
  ].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
    for (const d of dirs) {
      const bin = path.join(root, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
      if (fs.existsSync(bin)) return bin;
    }
  }
  throw new Error('chrome-headless-shell not found (set CHROME_BIN)');
}

export async function openPage() {
  const { chromium } = findPlaywrightCore();
  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ['--no-sandbox', '--no-zygote', '--autoplay-policy=no-user-gesture-required', '--js-flags=--max-old-space-size=6144'],
  });
  const page = await browser.newPage();
  page.on('console', (m) => console.log(m.text()));
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('crash', () => console.error('[page crashed]'));
  return { browser, page };
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}
