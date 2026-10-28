import { Hono } from 'hono';
import { fileCollectionService as svc } from '../data/fileCollections.js';

/**
 * The File collection demo's resources (see
 * `spec/gummy-file-collection-spec.md`): `/collection/file-collections`
 * (GET nested list, POST `{ name }`, PATCH / DELETE `/:id`) and
 * `/collection/file-items` (POST `{ collectionId, parentId, name, type, kind }`,
 * PATCH `/:id` `{ name }`, PATCH `/:id/move` `{ collectionId, parentId }`,
 * POST `/:id/duplicate`, DELETE `/:id` — 409 on a non-empty folder). Every
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
