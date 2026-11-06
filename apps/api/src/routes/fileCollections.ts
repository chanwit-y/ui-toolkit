import { Hono } from 'hono';
import { fileCollectionService as svc } from '../data/fileCollections.js';
import { fileService } from '../data/files.js';
import { imageMeta } from '../data/imageMeta.js';

/**
 * The File collection demo's resources (see
 * `spec/gummy-file-collection-spec.md`): `/collection/file-collections`
 * (GET nested list, POST `{ name }`, PATCH / DELETE `/:id`) and
 * `/collection/file-items` (POST `{ collectionId, parentId, name, type, kind }`,
 * PATCH `/:id` `{ name }`, PATCH `/:id/move` `{ collectionId, parentId }`,
 * POST `/:id/duplicate`, DELETE `/:id` — 409 on a non-empty folder, and
 * POST `/upload` multipart `file` + `collectionId` + `parentId?` + `name?` +
 * `kind?` — spec §11: creates the file node and keeps the bytes in the files
 * store under its id, so `/collection/files/:id/...` previews it; a raster
 * image also gets its `blurhash` + `width` / `height`, see `data/imageMeta.ts`). Every
 * reply uses the `{ data, status, success, message }` envelope.
 */
export const fileCollectionRoutes = new Hono();

const ok = (c: any, data: unknown, message: string, status = 200) => c.json({ data, status, success: true, message }, status as 200);
const fail = (c: any, message: string, status: number) => c.json({ data: null, status, success: false, message }, status as 400);
const nameOf = (body: any): string | null => (typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null);

fileCollectionRoutes.get('/collection/file-collections', (c) => ok(c, svc.list(), 'Collections retrieved successfully'));

fileCollectionRoutes.post('/collection/file-collections', async (c) => {
  const name = nameOf(await c.req.json().catch(() => ({})));
  if (!name) return fail(c, 'Name is required', 400);
  return ok(c, svc.createCollection(name), 'Collection created successfully', 201);
});

fileCollectionRoutes.patch('/collection/file-collections/:id', async (c) => {
  const name = nameOf(await c.req.json().catch(() => ({})));
  if (!name) return fail(c, 'Name is required', 400);
  const row = svc.renameCollection(c.req.param('id') ?? '', name);
  return row ? ok(c, row, 'Collection renamed successfully') : fail(c, 'Collection not found', 404);
});

fileCollectionRoutes.delete('/collection/file-collections/:id', (c) =>
  svc.deleteCollection(c.req.param('id') ?? '') ? ok(c, null, 'Collection deleted successfully') : fail(c, 'Collection not found', 404),
);

fileCollectionRoutes.post('/collection/file-items', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = nameOf(body);
  if (!name) return fail(c, 'Name is required', 400);
  if (typeof body.collectionId !== 'string') return fail(c, 'collectionId is required', 400);
  if (body.type !== 'folder' && body.type !== 'file') return fail(c, 'type must be "folder" or "file"', 400);
  const result = svc.createItem({ collectionId: body.collectionId, parentId: body.parentId ?? null, name, type: body.type, kind: body.kind ?? null });
  return 'error' in result ? fail(c, String(result.error), 404) : ok(c, result.node, 'Item created successfully', 201);
});

const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_BLOCKED_TYPES = new Set(['application/x-msdownload', 'application/x-executable']);
/** The engine sends its preset kind; this backend speaks the demo's vocabulary. */
const demoKind = (kind: string, name: string): string => {
  if (kind === 'spreadsheet') return 'sheet';
  if (kind === 'text' && /\.(md|markdown)$/i.test(name)) return 'markdown';
  if (kind === 'pdf' || kind === 'document' || kind === 'presentation') return 'document';
  return kind;
};
/** What the bytes are served as: never a document type that would run on this origin. */
const servedType = (file: File): string => {
  const type = file.type || 'application/octet-stream';
  if (type === 'text/html' || /\.html?$/i.test(file.name)) return 'text/plain';
  if (type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return 'image/svg+xml';
  return type;
};

fileCollectionRoutes.post('/collection/file-items/upload', async (c) => {
  const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
  const file = body.file;
  if (!(file instanceof File)) return fail(c, 'file is required', 400);
  if (typeof body.collectionId !== 'string' || !body.collectionId) return fail(c, 'collectionId is required', 400);
  if (UPLOAD_BLOCKED_TYPES.has(file.type)) return fail(c, 'This file type is not allowed.', 400);
  if (file.size > UPLOAD_MAX_BYTES) return fail(c, `File exceeds the ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB limit.`, 413);
  const name = nameOf(body) ?? file.name;
  const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;
  const kind = demoKind(typeof body.kind === 'string' ? body.kind : '', name) || null;
  const type = servedType(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  // An image's blurhash + size come with its node and record, so a selection-bound preview has its placeholder.
  const meta = await imageMeta(bytes, type);
  const result = svc.createItem({ collectionId: body.collectionId, parentId, name, type: 'file', kind, ...meta });
  if ('error' in result) return fail(c, String(result.error), 404);
  fileService.add({ _id: result.node.id, name, type, bytes, ...meta });
  return ok(c, result.node, 'File uploaded successfully', 201);
});

fileCollectionRoutes.patch('/collection/file-items/:id/move', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (typeof body.collectionId !== 'string') return fail(c, 'collectionId is required', 400);
  const result = svc.moveItem(c.req.param('id') ?? '', body.collectionId, body.parentId ?? null);
  return 'error' in result ? fail(c, String(result.error), Number(result.status)) : ok(c, result.node, 'Item moved successfully');
});

fileCollectionRoutes.patch('/collection/file-items/:id', async (c) => {
  const name = nameOf(await c.req.json().catch(() => ({})));
  if (!name) return fail(c, 'Name is required', 400);
  const row = svc.renameItem(c.req.param('id') ?? '', name);
  return row ? ok(c, row, 'Item renamed successfully') : fail(c, 'Item not found', 404);
});

fileCollectionRoutes.post('/collection/file-items/:id/duplicate', (c) => {
  const result = svc.duplicateItem(c.req.param('id') ?? '');
  return 'error' in result ? fail(c, String(result.error), Number(result.status)) : ok(c, result.node, 'Item duplicated successfully', 201);
});

fileCollectionRoutes.delete('/collection/file-items/:id', (c) => {
  const result = svc.deleteItem(c.req.param('id') ?? '');
  return 'error' in result ? fail(c, String(result.error), Number(result.status)) : ok(c, null, 'Item deleted successfully');
});
