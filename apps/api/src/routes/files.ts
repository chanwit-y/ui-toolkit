import { Hono } from 'hono';
import { fileService as svc } from '../data/files.js';

/**
 * The File preview demo's files (see `data/files.ts`): `GET /collection/files`
 * (records with a `url`), `GET /collection/files/:id` (one record with its bytes
 * inline as a data URL) and `GET /collection/files/:id/:name` (the raw bytes;
 * `:name` is free, so a URL can carry the file name its preview needs; `?delay=`
 * slows it down). Images carry a `blurhash`. Same
 * `{ data, status, success, message }` envelope as the other routes.
 */
export const fileRoutes = new Hono();

const ok = (c: any, data: unknown, message: string) => c.json({ data, status: 200, success: true, message });

fileRoutes.get('/collection/files', (c) => ok(c, svc.list(), 'Files retrieved successfully'));

fileRoutes.get('/collection/files/:id', (c) => {
  const file = svc.detail(c.req.param('id') ?? '');
  return file ? ok(c, file, 'File retrieved successfully') : c.json({ data: null, status: 404, success: false, message: 'File not found' }, 404);
});

fileRoutes.get('/collection/files/:id/:name', async (c) => {
  const file = svc.content(c.req.param('id') ?? '');
  if (!file) return c.text('File not found', 404);
  const headers: Record<string, string> = { 'Content-Type': file.type, 'Content-Length': String(file.bytes.length) };
  // `?delay=` (ms, at most 5 s) stands in for a slow network, so a placeholder can be seen.
  const delay = Math.min(Number(c.req.query('delay')) || 0, 5000);
  if (delay > 0) {
    headers['Cache-Control'] = 'no-store';
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  // An `<img>` needs the real SVG type; sandboxed, so opening the URL runs nothing.
  if (file.type === 'image/svg+xml') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  return c.body(file.bytes, 200, headers);
});
