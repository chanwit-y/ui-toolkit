/**
 * `createApp({ anchorDate?, publicUrl? })` — the Book shop mock API as a Hono app with fresh
 * in-memory data per call (so tests are isolated). Every route lives under `/api`.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HttpError } from './http.ts';
import { authorRoutes } from './routes/authors.ts';
import { bookRoutes } from './routes/books.ts';
import { customerRoutes } from './routes/customers.ts';
import { genreRoutes } from './routes/genres.ts';
import { imageRoutes } from './routes/images.ts';
import { orderRoutes } from './routes/orders.ts';
import { settingsRoutes } from './routes/settings.ts';
import { staffRoutes } from './routes/staff.ts';
import { summaryRoutes } from './routes/summary.ts';
import { Store } from './store.ts';

export interface AppOptions {
  /** Last day of the generated 90-day order history (`YYYY-MM-DD`); default today (UTC). */
  anchorDate?: string;
  /** Prefix of every asset URL; default `http://localhost:9100`. */
  publicUrl?: string;
}

export const DEFAULT_PUBLIC_URL = 'http://localhost:9100';

export function createApp(options: AppOptions = {}) {
  const anchorDate = options.anchorDate?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate) || Number.isNaN(Date.parse(`${anchorDate}T00:00:00Z`))) {
    throw new Error(`anchorDate must be YYYY-MM-DD (got "${anchorDate}")`);
  }
  const publicUrl = (options.publicUrl?.trim() || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');
  const store = new Store({ anchorDate, publicUrl });

  const app = new Hono();
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      // No allowHeaders: every requested header is allowed (Hono echoes the
      // preflight's list). The engine's HTTP client sends `app-version` too,
      // and a fixed list failed every cross-origin call — the studio's Live
      // Preview calls this API from another origin.
    }),
  );

  app.get('/api/health', (c) => c.json({ ok: true }));
  for (const routes of [genreRoutes, authorRoutes, bookRoutes, customerRoutes, orderRoutes, staffRoutes, settingsRoutes, summaryRoutes, imageRoutes]) {
    app.route('/api', routes(store));
  }

  app.notFound((c) => c.json({ message: `Not found: ${c.req.method} ${c.req.path}` }, 404));
  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ message: err.message }, err.status);
    console.error(err);
    return c.json({ message: err.message || 'Internal server error' }, 500);
  });

  return app;
}
