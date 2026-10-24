/**
 * `/api/books` — the catalogue: paged list with filters, CRUD (plus `POST /:id/delete` for
 * forms that can only POST), each book's editions (a form list) and reviews.
 */
import { Hono, type Context } from 'hono';
import type { BookRec, Edition } from '../data.ts';
import { bool, dateText, HttpError, listResponse, matches, money, nonNegative, ok, readBody, str, type Row } from '../http.ts';
import type { Store } from '../store.ts';

const today = () => new Date().toISOString().slice(0, 10);

/** An edition as answered: the record plus its money string. */
const editionView = (e: Edition) => ({ ...e, priceText: money(e.price) });

/**
 * Validates and coerces the writable book fields present in `body`. On create, `title`,
 * `price`, `authorId` and `genreId` are required. Throws a 400 on the first problem.
 */
function bookFields(store: Store, body: Row, creating: boolean): Partial<BookRec> {
  const out: Partial<BookRec> = {};
  const has = (k: string) => creating || body[k] !== undefined;

  if (has('title')) {
    const title = str(body.title)?.trim() ?? '';
    if (!title) throw new HttpError(400, 'title is required');
    out.title = title;
  }
  if (has('price')) out.price = nonNegative(body.price, 'price');
  if (has('authorId')) {
    const id = str(body.authorId)?.trim() ?? '';
    if (!store.author(id)) throw new HttpError(400, `Unknown authorId "${id}"`);
    out.authorId = id;
  }
  if (has('genreId')) {
    const id = str(body.genreId)?.trim() ?? '';
    if (!store.genre(id)) throw new HttpError(400, `Unknown genreId "${id}"`);
    out.genreId = id;
  }
  if (body.isbn !== undefined) out.isbn = str(body.isbn)?.trim() ?? '';
  if (body.stock !== undefined && str(body.stock)?.trim() !== '') out.stock = nonNegative(body.stock, 'stock', { integer: true });
  if (body.pages !== undefined && str(body.pages)?.trim() !== '') out.pages = nonNegative(body.pages, 'pages', { integer: true });
  if (body.publishedAt !== undefined) {
    const date = str(body.publishedAt)?.trim() ?? '';
    if (date && !/^\d{4}-\d{2}-\d{2}/.test(date)) throw new HttpError(400, 'publishedAt must be YYYY-MM-DD');
    out.publishedAt = date.slice(0, 10);
  }
  // A blank cover means "the drawn one" (stored as '').
  if (body.cover !== undefined) out.cover = str(body.cover)?.trim() ?? '';
  if (body.description !== undefined) out.description = str(body.description) ?? '';
  if (body.featured !== undefined) out.featured = bool(body.featured) ?? false;
  return out;
}

export function bookRoutes(store: Store): Hono {
  const app = new Hono();

  const bookOr404 = (id: string) => {
    const book = store.book(id);
    if (!book) throw new HttpError(404, `Book ${id} not found`);
    return book;
  };

  app.get('/books', (c) => {
    const search = c.req.query('search') ?? '';
    const genre = c.req.query('genre')?.trim();
    const author = c.req.query('author')?.trim();
    const inStock = c.req.query('inStock')?.trim().toLowerCase();
    const featured = c.req.query('featured')?.trim().toLowerCase();
    const rows = store.db.books
      .map((b) => store.bookView(b))
      .filter((b) => matches(search, b.title, b.isbn, b.authorName))
      .filter((b) => !genre || b.genreId === genre)
      .filter((b) => !author || b.authorId === author)
      .filter((b) => (inStock === 'true' ? b.stock > 0 : inStock === 'false' ? b.stock === 0 : true))
      .filter((b) => featured !== 'true' || b.featured);
    return listResponse(c, rows, { sortBy: 'title' });
  });

  app.get('/books/:id', (c) => ok(c, store.bookView(bookOr404(c.req.param('id')))));

  app.post('/books', async (c) => {
    const fields = bookFields(store, await readBody(c), true);
    const book: BookRec = {
      _id: store.nextId('book'),
      title: '',
      isbn: '',
      authorId: '',
      genreId: '',
      price: 0,
      stock: 0,
      publishedAt: today(),
      pages: 0,
      cover: '',
      description: '',
      featured: false,
      ...fields,
      updatedAt: new Date().toISOString(),
    };
    store.db.books.push(book);
    store.db.editions.set(book._id, []);
    store.db.reviews.set(book._id, []);
    return ok(c, store.bookView(book), 201);
  });

  app.patch('/books/:id', async (c) => {
    const book = bookOr404(c.req.param('id'));
    Object.assign(book, bookFields(store, await readBody(c), false), { updatedAt: new Date().toISOString() });
    return ok(c, store.bookView(book));
  });

  const remove = (c: Context) => {
    const book = bookOr404(c.req.param('id')!);
    store.db.books.splice(store.db.books.indexOf(book), 1);
    store.db.editions.delete(book._id);
    store.db.reviews.delete(book._id);
    return ok(c, { _id: book._id });
  };
  app.delete('/books/:id', remove);
  // Form buttons can only POST / PATCH: same as DELETE, any body ignored.
  app.post('/books/:id/delete', remove);

  // ── Editions ───────────────────────────────────────────────────────────────

  const editionsOf = (bookId: string): Edition[] => {
    bookOr404(bookId);
    let list = store.db.editions.get(bookId);
    if (!list) store.db.editions.set(bookId, (list = []));
    return list;
  };
  const editionOr404 = (list: Edition[], id: string) => {
    const edition = list.find((e) => e._id === id);
    if (!edition) throw new HttpError(404, `Edition ${id} not found`);
    return edition;
  };

  app.get('/books/:bookId/editions', (c) => {
    const list = editionsOf(c.req.param('bookId'));
    return c.json({ data: list.map(editionView), total: list.length });
  });

  app.post('/books/:bookId/editions', async (c) => {
    const list = editionsOf(c.req.param('bookId'));
    const body = await readBody(c);
    const format = str(body.format)?.trim() ?? '';
    if (!format) throw new HttpError(400, 'format is required');
    const edition: Edition = {
      _id: store.nextId('edition'),
      format,
      isbn: str(body.isbn)?.trim() ?? '',
      price: nonNegative(body.price, 'price'),
    };
    list.push(edition);
    return ok(c, editionView(edition), 201);
  });

  app.patch('/books/:bookId/editions/:id', async (c) => {
    const edition = editionOr404(editionsOf(c.req.param('bookId')), c.req.param('id'));
    const body = await readBody(c);
    const next = { ...edition };
    if (body.format !== undefined) {
      next.format = str(body.format)?.trim() ?? '';
      if (!next.format) throw new HttpError(400, 'format is required');
    }
    if (body.isbn !== undefined) next.isbn = str(body.isbn)?.trim() ?? '';
    if (body.price !== undefined) next.price = nonNegative(body.price, 'price');
    Object.assign(edition, next);
    return ok(c, editionView(edition));
  });

  app.delete('/books/:bookId/editions/:id', (c) => {
    const list = editionsOf(c.req.param('bookId'));
    const edition = editionOr404(list, c.req.param('id'));
    list.splice(list.indexOf(edition), 1);
    return ok(c, { _id: edition._id });
  });

  // ── Reviews ────────────────────────────────────────────────────────────────

  app.get('/books/:bookId/reviews', (c) => {
    bookOr404(c.req.param('bookId'));
    const list = [...(store.db.reviews.get(c.req.param('bookId')) ?? [])].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    return c.json({ data: list.map((r) => ({ ...r, createdAtText: dateText(r.createdAt) })), total: list.length });
  });

  return app;
}
