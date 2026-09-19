import { Hono } from 'hono';
import { languageService } from '../data/languages.js';

/**
 * Languages of a country — the sub-resource behind the FormList demo. The
 * `:country` segment accepts a country `_id` or ISO code. Same envelope as
 * the country routes (`{ data, status, success, message }`).
 */
export const languageRoutes = new Hono();

const notFound = (c: any, message: string) =>
  c.json({ data: null, status: 404, success: false, message }, 404);

// GET /collection/languages/:country
languageRoutes.get('/collection/languages/:country', (c) => {
  const country = c.req.param('country');
  if (!languageService.resolveCountryId(country)) return notFound(c, 'Country not found');
  return c.json({
    data: languageService.listByCountry(country),
    status: 200,
    success: true,
    message: 'Languages retrieved successfully',
  });
});

// POST /collection/languages/:country  { country?, name }
languageRoutes.post('/collection/languages/:country', async (c) => {
  const country = c.req.param('country');
  const body = await c.req.json().catch(() => ({}));
  if (!body?.name || typeof body.name !== 'string') {
    return c.json({ data: null, status: 400, success: false, message: 'Name is required' }, 400);
  }
  const row = languageService.create(country, body);
  if (!row) return notFound(c, 'Country not found');
  return c.json({ data: row, status: 201, success: true, message: 'Language created successfully' }, 201);
});

// PATCH /collection/languages/:country/:id  { country?, name? }
languageRoutes.patch('/collection/languages/:country/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const row = languageService.update(c.req.param('country'), c.req.param('id'), body ?? {});
  if (!row) return notFound(c, 'Language not found');
  return c.json({ data: row, status: 200, success: true, message: 'Language updated successfully' });
});

// DELETE /collection/languages/:country/:id
languageRoutes.delete('/collection/languages/:country/:id', (c) => {
  const ok = languageService.delete(c.req.param('country'), c.req.param('id'));
  if (!ok) return notFound(c, 'Language not found');
  return c.json({ data: null, status: 200, success: true, message: 'Language deleted successfully' });
});
