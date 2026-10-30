import { Hono } from 'hono';

/**
 * `POST /collection/logic/orders` — the example Logic page's Save: echoes the
 * submitted payload, so the page (and its network panel) shows which fields
 * the form sent (a field hidden by its condition is left out).
 */
export const logicRoutes = new Hono();

logicRoutes.post('/collection/logic/orders', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ data: body, status: 201, success: true, message: 'Order received' }, 201);
});
