/** `/api/authors` — the author list / detail and each author's links (a form list). */
import { Hono } from 'hono';
import { HttpError, listResponse, matches, ok, readBody, str } from '../http.ts';
import type { Store } from '../store.ts';

/** Authors (as views) with at least one book in `genreId` (any when blank), matching `search`. */
export function authorsInGenre(store: Store, genreId: string | undefined, search: string | undefined) {
  return store.db.authors
    .filter((a) => !genreId || store.db.books.some((b) => b.authorId === a._id && b.genreId === genreId))
    .filter((a) => matches(search ?? '', a.name))
    .map((a) => store.authorView(a));
}

export function authorRoutes(store: Store): Hono {
  const app = new Hono();

  const authorOr404 = (id: string) => {
    const author = store.author(id);
    if (!author) throw new HttpError(404, `Author ${id} not found`);
    return author;
  };

  app.get('/authors', (c) =>
    listResponse(c, authorsInGenre(store, c.req.query('genre')?.trim(), c.req.query('search')), { sortBy: 'name' }),
  );

  app.get('/authors/:id', (c) => {
    const author = authorOr404(c.req.param('id'));
    const books = store.db.books
      .filter((b) => b.authorId === author._id)
      .map((b) => store.bookView(b))
      .sort((x, y) => x.title.localeCompare(y.title));
    return ok(c, { ...store.authorView(author), books });
  });

  // ── Links ──────────────────────────────────────────────────────────────────

  const linksOf = (authorId: string) => {
    authorOr404(authorId);
    let list = store.db.links.get(authorId);
    if (!list) store.db.links.set(authorId, (list = []));
    return list;
  };

  app.get('/authors/:authorId/links', (c) => {
    const list = linksOf(c.req.param('authorId'));
    return c.json({ data: list.map((l) => ({ ...l })), total: list.length });
  });

  app.post('/authors/:authorId/links', async (c) => {
    const list = linksOf(c.req.param('authorId'));
    const body = await readBody(c);
    const label = str(body.label)?.trim() ?? '';
    if (!label) throw new HttpError(400, 'label is required');
    const link = { _id: store.nextId('link'), label, url: str(body.url)?.trim() ?? '' };
    list.push(link);
    return ok(c, { ...link }, 201);
  });

  app.patch('/authors/:authorId/links/:id', async (c) => {
    const list = linksOf(c.req.param('authorId'));
    const link = list.find((l) => l._id === c.req.param('id'));
    if (!link) throw new HttpError(404, `Link ${c.req.param('id')} not found`);
    const body = await readBody(c);
    const label = str(body.label);
    if (label !== undefined && !label.trim()) throw new HttpError(400, 'label is required');
    if (label !== undefined) link.label = label.trim();
    const url = str(body.url);
    if (url !== undefined) link.url = url.trim();
    return ok(c, { ...link });
  });

  app.delete('/authors/:authorId/links/:id', (c) => {
    const list = linksOf(c.req.param('authorId'));
    const idx = list.findIndex((l) => l._id === c.req.param('id'));
    if (idx < 0) throw new HttpError(404, `Link ${c.req.param('id')} not found`);
    const [removed] = list.splice(idx, 1);
    return ok(c, { _id: removed!._id });
  });

  return app;
}
