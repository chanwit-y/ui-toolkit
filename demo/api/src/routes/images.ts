/** Images: drawn covers and avatars (SVG), and in-memory image uploads. */
import { Hono } from 'hono';
import { HttpError, ok } from '../http.ts';
import type { Store } from '../store.ts';
import { avatarSvg, coverSvg } from '../svg.ts';

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
const MAX_UPLOAD = 5 * 1024 * 1024;

const svgHeaders = { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-cache' };

/** `b-001.svg` → `b-001`; anything else → null. */
const stripSvg = (file: string): string | null => (file.toLowerCase().endsWith('.svg') ? file.slice(0, -4) : null);

export function imageRoutes(store: Store): Hono {
  const app = new Hono();

  app.get('/covers/:file', (c) => {
    const id = stripSvg(c.req.param('file'));
    const book = id ? store.book(id) : undefined;
    if (!book) throw new HttpError(404, 'Cover not found');
    const view = store.bookView(book);
    return c.body(coverSvg(view), 200, svgHeaders);
  });

  app.get('/avatars/:file', (c) => {
    const seed = stripSvg(c.req.param('file'));
    if (!seed) throw new HttpError(404, 'Avatar not found');
    return c.body(avatarSvg(seed), 200, svgHeaders);
  });

  app.post('/upload', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody();
    } catch {
      throw new HttpError(400, 'Expected a multipart form with a "file" field');
    }
    const file = body.file;
    if (!(file instanceof File)) throw new HttpError(400, 'Expected a multipart form with a "file" field');
    const type = file.type.toLowerCase().split(';')[0]!.trim();
    const ext = IMAGE_TYPES[type];
    if (!ext) throw new HttpError(415, `Only PNG, JPEG, GIF or WebP images can be uploaded (got ${type || 'unknown'})`);
    if (file.size > MAX_UPLOAD) throw new HttpError(413, 'The image is larger than 5 MB');

    const base = (file.name || 'image').replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    const name = `${store.nextId('upload')}-${base || 'image'}.${ext}`;
    store.uploads.set(name, { name, type, bytes: new Uint8Array(await file.arrayBuffer()) });
    return ok(c, { url: store.uploadUrl(name), name, size: file.size, type }, 201);
  });

  app.get('/uploads/:name', (c) => {
    const upload = store.uploads.get(c.req.param('name'));
    if (!upload) throw new HttpError(404, 'Upload not found');
    return c.body(upload.bytes, 200, { 'content-type': upload.type, 'content-length': String(upload.bytes.byteLength) });
  });

  app.delete('/uploads/:name', (c) => {
    const name = c.req.param('name');
    if (!store.uploads.delete(name)) throw new HttpError(404, 'Upload not found');
    return ok(c, { name });
  });

  return app;
}
