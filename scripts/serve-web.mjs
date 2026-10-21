// Serve the built app with Pages-style SPA fallback, without any Cloudflare tooling.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/web/dist');
const originMode = process.argv.includes('--origin');
const prefix = originMode ? '' : '/cheatdb';
const port = originMode ? 18475 : 18473;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === prefix && prefix) { res.writeHead(308, { Location: `${prefix}/${url.search}` }); res.end(); return; }
  if (prefix && !url.pathname.startsWith(prefix + '/')) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const local = decodeURIComponent(url.pathname.slice(prefix.length));
    let path = resolve(dist, `.${local === '/' ? '/index.html' : local}`);
    if (!path.startsWith(dist + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    let body;
    try { body = await readFile(path); }
    catch {
      if (extname(local)) { res.writeHead(404); res.end('Not found'); return; }
      path = resolve(dist, 'index.html'); body = await readFile(path);
    }
    res.writeHead(200, {
      'Content-Type': mime[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; media-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Build unavailable. Run npm run build in apps/web first.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`CheatDB ${originMode ? 'Pages origin' : 'public path'}: http://127.0.0.1:${port}${prefix}/`));
