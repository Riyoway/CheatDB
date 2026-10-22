import { downloads } from '../../src/downloads.ts';

export async function serveDownload(request: Request, upstreamFetch: typeof fetch = fetch) {
  const file = downloads.find(file => new URL(request.url).pathname.endsWith(`/download/${file.filename}`));
  if (!file) return new Response('Download not found.', { status: 404 });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const headers = new Headers({ 'Accept-Encoding': 'identity' });
  if (request.headers.has('Range')) headers.set('Range', request.headers.get('Range')!);
  try {
    const upstream = await upstreamFetch(new Request(`https://raw.githubusercontent.com/Riyoway/CheatDB/main/${file.path}`, { method: request.method, headers }));
    if (![200, 206].includes(upstream.status)) {
      await upstream.body?.cancel();
      return new Response('This download is temporarily unavailable. Please go back and try again.', { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    const responseHeaders = new Headers({
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    });
    for (const name of ['Content-Length', 'Content-Range', 'Accept-Ranges', 'ETag', 'Last-Modified']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response('This download is temporarily unavailable. Please go back and try again.', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const onRequest = ({ request }: { request: Request }) => serveDownload(request);
