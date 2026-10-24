/** `/api/genres` — the eight genres, plus `/api/genres/:genre/authors` for dependent selects. */
import { Hono } from 'hono';
import { listResponse } from '../http.ts';
import type { Store } from '../store.ts';
import { authorsInGenre } from './authors.ts';

export function genreRoutes(store: Store): Hono {
  const app = new Hono();

  app.get('/genres', (c) => listResponse(c, store.db.genres.map((g) => ({ ...g })), { sortBy: 'name' }));

  // Same answer as `/api/authors?genre=:genre` — the parent's value arrives as a URL param.
  app.get('/genres/:genre/authors', (c) =>
    listResponse(c, authorsInGenre(store, c.req.param('genre'), c.req.query('search')), { sortBy: 'name' }),
  );

  return app;
}
