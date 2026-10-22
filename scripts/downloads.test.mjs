import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serveDownload } from '../apps/web/functions/download/[file].ts';

test('downloads stream original bytes with attachment headers and no client credentials', async () => {
  const bytes = new TextEncoder().encode('SQLite format 3\0');
  const response = await serveDownload(new Request('https://db.riyo.me/download/cheatdb.db', {
    headers: { Cookie: 'private=value', Authorization: 'Bearer private', Range: 'bytes=0-15' },
  }), async request => {
    assert.equal(request.url, 'https://raw.githubusercontent.com/Riyoway/CheatDB/main/data/cheatdb.db');
    assert.equal(request.headers.get('Cookie'), null);
    assert.equal(request.headers.get('Authorization'), null);
    assert.equal(request.headers.get('Accept-Encoding'), 'identity');
    assert.equal(request.headers.get('Range'), 'bytes=0-15');
    return new Response(bytes, { status: 206, headers: { 'Content-Length': '16', 'Content-Range': 'bytes 0-15/63660032' } });
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="cheatdb.db"');
  assert.equal(response.headers.get('Content-Range'), 'bytes 0-15/63660032');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

test('only allowlisted files and read methods can reach the download origin', async () => {
  const unused = () => { throw new Error('Must not fetch'); };
  assert.equal((await serveDownload(new Request('https://db.riyo.me/download/README.md'), unused)).status, 404);
  const denied = await serveDownload(new Request('https://db.riyo.me/download/all.jsonl', { method: 'POST' }), unused);
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get('Allow'), 'GET, HEAD');
  const head = await serveDownload(new Request('https://db.riyo.me/download/all.jsonl', { method: 'HEAD' }), async request => {
    assert.equal(request.method, 'HEAD');
    assert(request.url.endsWith('/exports/JSON/Nintendo/all.jsonl'));
    return new Response(null, { headers: { 'Content-Length': '50033090' } });
  });
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('Content-Length'), '50033090');
});

test('origin errors never become successful downloadable files', async () => {
  for (const fetcher of [async () => new Response('<html>Error</html>', { status: 503 }), async () => { throw new Error('offline'); }]) {
    const response = await serveDownload(new Request('https://db.riyo.me/download/3ds.json'), fetcher);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Content-Disposition'), null);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});
