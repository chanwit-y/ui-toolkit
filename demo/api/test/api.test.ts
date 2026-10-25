/** Contract tests for the Book shop mock API (`README.md`), over `app.request()` with a pinned anchor date. */
import { beforeEach, describe, expect, test } from 'bun:test';
import { createApp } from '../src/app.ts';

const ANCHOR = '2026-10-24';
const PUBLIC = 'http://localhost:9100';

let app: ReturnType<typeof createApp>;
beforeEach(() => {
  app = createApp({ anchorDate: ANCHOR, publicUrl: PUBLIC });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: Json }> {
  const res = await app.request(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
const get = (path: string) => call('GET', path);

describe('basics', () => {
  test('health', async () => {
    expect(await get('/api/health')).toEqual({ status: 200, json: { ok: true } });
  });

  test('determinism: two apps with the same anchor produce the same data', async () => {
    const other = createApp({ anchorDate: ANCHOR, publicUrl: PUBLIC });
    const a = await (await app.request('/api/books?limit=1')).json();
    const b = await (await other.request('/api/books?limit=1')).json();
    expect(a).toEqual(b);
    const oa = await (await app.request('/api/orders?limit=5')).json();
    const ob = await (await other.request('/api/orders?limit=5')).json();
    expect(oa).toEqual(ob);
  });

  test('unknown route → 404 { message }', async () => {
    const r = await get('/api/nope');
    expect(r.status).toBe(404);
    expect(typeof r.json.message).toBe('string');
  });

  test('CORS is open', async () => {
    const res = await app.request('/api/books', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3400', 'access-control-request-method': 'PATCH' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('PATCH');
  });
});

describe('genres + authors', () => {
  test('genres: 8, sorted by name, hex colours', async () => {
    const { json } = await get('/api/genres');
    expect(json.total).toBe(8);
    expect(json.data.map((g: Json) => g.name)).toEqual([
      'Biography', 'Children', 'Cookery', 'Fantasy', 'History', 'Mystery', 'Romance', 'Science Fiction',
    ]);
    expect(json.data.find((g: Json) => g.name === 'Fantasy')._id).toBe('g-fantasy');
    for (const g of json.data) expect(g.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('authors: 30 with 2–7 books each, sorted by name', async () => {
    const { json } = await get('/api/authors');
    expect(json.total).toBe(30);
    const names = json.data.map((a: Json) => a.name);
    expect(names).toEqual([...names].sort((x: string, y: string) => x.localeCompare(y)));
    for (const a of json.data) {
      expect(a.bookCount).toBeGreaterThanOrEqual(2);
      expect(a.bookCount).toBeLessThanOrEqual(7);
      expect(a.avatar).toStartWith(`${PUBLIC}/api/avatars/`);
      expect(typeof a.born).toBe('number');
    }
    expect(json.data.reduce((s: number, a: Json) => s + a.bookCount, 0)).toBe(120);
  });

  test('authors?genre keeps authors with a book in it; search matches the name', async () => {
    const { json } = await get('/api/authors?genre=g-cookery');
    expect(json.total).toBeGreaterThan(0);
    expect(json.total).toBeLessThan(30);
    for (const a of json.data) {
      const detail = await get(`/api/authors/${a._id}`);
      expect(detail.json.data.books.some((b: Json) => b.genreId === 'g-cookery')).toBe(true);
    }
    const first = json.data[0].name as string;
    const search = await get(`/api/authors?search=${encodeURIComponent(first.slice(1, 5).toUpperCase())}`);
    expect(search.json.data.some((a: Json) => a.name === first)).toBe(true);
  });

  test('genres/:genre/authors = authors?genre=; unknown genre ⇒ empty 200', async () => {
    const viaQuery = await get('/api/authors?genre=g-fantasy');
    const viaParam = await get('/api/genres/g-fantasy/authors');
    expect(viaParam.status).toBe(200);
    expect(viaParam.json).toEqual(viaQuery.json);
    expect(await get('/api/genres/g-nope/authors')).toEqual({ status: 200, json: { data: [], total: 0 } });
  });

  test('author detail with books; 404 unknown', async () => {
    const { json } = await get('/api/authors/a-01');
    expect(json.data._id).toBe('a-01');
    expect(json.data.books.length).toBe(json.data.bookCount);
    expect((await get('/api/authors/a-99')).status).toBe(404);
  });

  test('author links CRUD', async () => {
    const list = await get('/api/authors/a-01/links');
    expect(list.json.total).toBe(2);
    expect(list.json.data[0]).toEqual({ _id: expect.any(String), label: expect.any(String), url: expect.any(String) });

    expect((await call('POST', '/api/authors/a-01/links', { label: '  ', url: 'https://x' })).status).toBe(400);
    const created = await call('POST', '/api/authors/a-01/links', { label: 'Blog', url: 'https://blog.example.com' });
    expect(created.status).toBe(201);
    const id = created.json.data._id;
    expect((await get('/api/authors/a-01/links')).json.total).toBe(3);

    const patched = await call('PATCH', `/api/authors/a-01/links/${id}`, { url: 'https://new.example.com' });
    expect(patched.json.data).toEqual({ _id: id, label: 'Blog', url: 'https://new.example.com' });

    expect(await call('DELETE', `/api/authors/a-01/links/${id}`)).toEqual({ status: 200, json: { data: { _id: id } } });
    expect((await get('/api/authors/a-01/links')).json.total).toBe(2);
    expect((await call('DELETE', `/api/authors/a-01/links/${id}`)).status).toBe(404);
    expect((await get('/api/authors/a-99/links')).status).toBe(404);
  });
});

describe('books', () => {
  test('list: 120, default title asc, shape', async () => {
    const { json } = await get('/api/books');
    expect(json.total).toBe(120);
    expect(json.data).toHaveLength(120);
    const titles = json.data.map((b: Json) => b.title);
    expect(titles).toEqual([...titles].sort((x: string, y: string) => x.localeCompare(y, 'en', { sensitivity: 'base', numeric: true })));
    const b = json.data[0];
    expect(Object.keys(b)).toEqual([
      '_id', 'title', 'isbn', 'authorId', 'authorName', 'genreId', 'genreName', 'genreColor', 'price', 'priceText',
      'stock', 'publishedAt', 'publishedAtText', 'pages', 'cover', 'description', 'featured', 'rating', 'reviewCount', 'updatedAt',
    ]);
    expect(b.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(b.cover).toBe(`${PUBLIC}/api/covers/${b._id}.svg`);
    expect(b.description).not.toContain('<');
    for (const book of json.data) {
      expect(book.price).toBeGreaterThanOrEqual(189);
      expect(book.price).toBeLessThanOrEqual(1450);
      expect(book.stock).toBeGreaterThanOrEqual(0);
      expect(book.stock).toBeLessThanOrEqual(40);
    }
    expect(json.data.filter((x: Json) => x.stock === 0).length).toBe(15);
    expect(json.data.filter((x: Json) => x.featured).length).toBe(15);
  });

  test('priceText formats the price', async () => {
    const { json } = await get('/api/books?sortBy=price&sortDir=desc&limit=1');
    const b = json.data[0];
    expect(b.priceText).toBe(`฿${b.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    expect(b.priceText).toMatch(/^฿\d,\d{3}\.\d{2}$/);
  });

  test('paging: offset / limit keep the total', async () => {
    const all = (await get('/api/books')).json.data;
    const page = await get('/api/books?offset=10&limit=5');
    expect(page.json.total).toBe(120);
    expect(page.json.data.map((b: Json) => b._id)).toEqual(all.slice(10, 15).map((b: Json) => b._id));
  });

  test('search matches title, ISBN or author name', async () => {
    const all = (await get('/api/books')).json.data;
    const target = all[42];
    const byIsbn = await get(`/api/books?search=${target.isbn}`);
    expect(byIsbn.json.data.map((b: Json) => b._id)).toContain(target._id);
    const byAuthor = await get(`/api/books?search=${encodeURIComponent(target.authorName.toLowerCase())}`);
    expect(byAuthor.json.data.every((b: Json) => b.authorName === target.authorName || b.title.toLowerCase().includes(target.authorName.toLowerCase()))).toBe(true);
    expect(byAuthor.json.total).toBeGreaterThanOrEqual(2);
    const byTitle = await get(`/api/books?search=${encodeURIComponent(target.title.toUpperCase())}`);
    expect(byTitle.json.data.map((b: Json) => b._id)).toContain(target._id);
  });

  test('genre / author / inStock / featured filters', async () => {
    const genre = await get('/api/books?genre=g-mystery');
    expect(genre.json.total).toBeGreaterThan(0);
    expect(genre.json.data.every((b: Json) => b.genreId === 'g-mystery' && b.genreName === 'Mystery')).toBe(true);

    const author = await get('/api/books?author=a-03');
    expect(author.json.data.every((b: Json) => b.authorId === 'a-03')).toBe(true);

    const inStock = await get('/api/books?inStock=true');
    const outOfStock = await get('/api/books?inStock=false');
    expect(inStock.json.data.every((b: Json) => b.stock > 0)).toBe(true);
    expect(outOfStock.json.data.every((b: Json) => b.stock === 0)).toBe(true);
    expect(inStock.json.total + outOfStock.json.total).toBe(120);

    const featured = await get('/api/books?featured=true');
    expect(featured.json.total).toBe(15);
    expect(featured.json.data.every((b: Json) => b.featured)).toBe(true);
  });

  test('sortBy / sortDir', async () => {
    const asc = (await get('/api/books?sortBy=price')).json.data.map((b: Json) => b.price);
    expect(asc).toEqual([...asc].sort((x: number, y: number) => x - y));
    const desc = (await get('/api/books?sortBy=stock&sortDir=desc')).json.data.map((b: Json) => b.stock);
    expect(desc).toEqual([...desc].sort((x: number, y: number) => y - x));
  });

  test('detail + 404', async () => {
    const { json } = await get('/api/books/b-001');
    expect(json.data._id).toBe('b-001');
    expect((await get('/api/books/b-999')).status).toBe(404);
  });

  test('create: coercion, names filled, drawn cover; 400s', async () => {
    const created = await call('POST', '/api/books', {
      title: 'A Test Volume',
      authorId: 'a-02',
      genreId: 'g-history',
      price: '450.5',
      stock: '7',
      pages: '300',
      featured: 'true',
      cover: '',
      description: 'Plain text.',
      bogus: 'ignored',
    });
    expect(created.status).toBe(201);
    const b = created.json.data;
    expect(b._id).toBe('b-121');
    expect(b.price).toBe(450.5);
    expect(b.priceText).toBe('฿450.50');
    expect(b.stock).toBe(7);
    expect(b.pages).toBe(300);
    expect(b.featured).toBe(true);
    expect(b.genreName).toBe('History');
    expect(b.genreColor).toMatch(/^#/);
    expect(b.authorName).toBe((await get('/api/authors/a-02')).json.data.name);
    expect(b.cover).toBe(`${PUBLIC}/api/covers/b-121.svg`);
    expect(b.description).toBe('Plain text.');
    expect(b).not.toHaveProperty('bogus');
    expect((await get('/api/books')).json.total).toBe(121);

    const base = { title: 'X', authorId: 'a-02', genreId: 'g-history', price: 100 };
    expect((await call('POST', '/api/books', { ...base, title: '   ' })).status).toBe(400);
    expect((await call('POST', '/api/books', { ...base, price: -1 })).status).toBe(400);
    expect((await call('POST', '/api/books', { ...base, price: '-0.5' })).status).toBe(400);
    expect((await call('POST', '/api/books', { ...base, authorId: 'a-99' })).status).toBe(400);
    expect((await call('POST', '/api/books', { ...base, genreId: 'g-nope' })).status).toBe(400);
    const bad = await call('POST', '/api/books', { ...base, title: '' });
    expect(typeof bad.json.message).toBe('string');
  });

  test('patch: partial, coercion, 400 / 404', async () => {
    const patched = await call('PATCH', '/api/books/b-001', { stock: '0', featured: 'false', genreId: 'g-romance' });
    expect(patched.status).toBe(200);
    expect(patched.json.data.stock).toBe(0);
    expect(patched.json.data.featured).toBe(false);
    expect(patched.json.data.genreName).toBe('Romance');
    expect((await get('/api/books/b-001')).json.data.stock).toBe(0);

    expect((await call('PATCH', '/api/books/b-001', { title: '' })).status).toBe(400);
    expect((await call('PATCH', '/api/books/b-001', { price: -5 })).status).toBe(400);
    expect((await call('PATCH', '/api/books/b-001', { authorId: 'a-99' })).status).toBe(400);
    expect((await call('PATCH', '/api/books/b-999', { title: 'Y' })).status).toBe(404);

    const cover = await call('PATCH', '/api/books/b-001', { cover: 'http://localhost:9100/api/uploads/u-1-x.png' });
    expect(cover.json.data.cover).toBe('http://localhost:9100/api/uploads/u-1-x.png');
    const reset = await call('PATCH', '/api/books/b-001', { cover: '' });
    expect(reset.json.data.cover).toBe(`${PUBLIC}/api/covers/b-001.svg`);
  });

  test('delete + 404', async () => {
    expect(await call('DELETE', '/api/books/b-002')).toEqual({ status: 200, json: { data: { _id: 'b-002' } } });
    expect((await get('/api/books/b-002')).status).toBe(404);
    expect((await call('DELETE', '/api/books/b-002')).status).toBe(404);
  });

  test('POST /books/:id/delete behaves like DELETE, body ignored', async () => {
    const r = await call('POST', '/api/books/b-003/delete', { title: 'whatever', price: -1 });
    expect(r).toEqual({ status: 200, json: { data: { _id: 'b-003' } } });
    expect((await get('/api/books/b-003')).status).toBe(404);
    expect((await call('POST', '/api/books/b-003/delete')).status).toBe(404);
  });

  test('editions CRUD', async () => {
    const list = await get('/api/books/b-001/editions');
    expect(list.json.total).toBeGreaterThanOrEqual(1);
    expect(list.json.total).toBeLessThanOrEqual(3);
    for (const e of list.json.data) expect(['Hardcover', 'Paperback', 'Ebook', 'Audiobook']).toContain(e.format);

    const created = await call('POST', '/api/books/b-001/editions', { format: 'Audiobook', price: '399' });
    expect(created.status).toBe(201);
    expect(created.json.data).toEqual({ _id: expect.any(String), format: 'Audiobook', isbn: '', price: 399, priceText: '฿399.00' });
    const id = created.json.data._id;

    const patched = await call('PATCH', `/api/books/b-001/editions/${id}`, { price: '349.00', isbn: '9780000000002' });
    expect(patched.json.data).toEqual({ _id: id, format: 'Audiobook', isbn: '9780000000002', price: 349, priceText: '฿349.00' });

    expect(await call('DELETE', `/api/books/b-001/editions/${id}`)).toEqual({ status: 200, json: { data: { _id: id } } });
    expect((await get('/api/books/b-001/editions')).json.total).toBe(list.json.total);
    expect((await get('/api/books/b-999/editions')).status).toBe(404);
  });

  test('reviews: 2–6, newest first; rating is their average', async () => {
    const { json } = await get('/api/books/b-005/reviews');
    expect(json.total).toBeGreaterThanOrEqual(2);
    expect(json.total).toBeLessThanOrEqual(6);
    const dates = json.data.map((r: Json) => r.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    const avg = Math.round((json.data.reduce((s: number, r: Json) => s + r.rating, 0) / json.total) * 10) / 10;
    const book = (await get('/api/books/b-005')).json.data;
    expect(book.rating).toBe(avg);
    expect(book.reviewCount).toBe(json.total);
  });
});

describe('customers', () => {
  test('list, search, city, detail with orders', async () => {
    const { json } = await get('/api/customers');
    expect(json.total).toBe(60);
    const c = json.data[0];
    expect(c.totalSpentText).toBe(`฿${c.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    expect(c.avatar).toStartWith(`${PUBLIC}/api/avatars/`);

    const byEmail = await get(`/api/customers?search=${encodeURIComponent(c.email)}`);
    expect(byEmail.json.data[0]._id).toBe(c._id);
    const city = await get('/api/customers?city=bangkok');
    expect(city.json.total).toBeGreaterThan(0);
    expect(city.json.data.every((x: Json) => x.city === 'Bangkok')).toBe(true);

    const busy = json.data.find((x: Json) => x.orderCount > 1);
    const detail = await get(`/api/customers/${busy._id}`);
    expect(detail.json.data.orders).toHaveLength(busy.orderCount);
    const placed = detail.json.data.orders.map((o: Json) => o.placedAt);
    expect(placed).toEqual([...placed].sort().reverse());
    expect((await get('/api/customers/c-999')).status).toBe(404);
  });

  test('create: 201, 400 blank, 409 taken email', async () => {
    const created = await call('POST', '/api/customers', { name: 'New Reader', email: 'new.reader@example.com', city: 'Bangkok' });
    expect(created.status).toBe(201);
    expect(created.json.data).toMatchObject({ _id: 'c-061', name: 'New Reader', orderCount: 0, totalSpent: 0, phone: '' });
    expect((await call('POST', '/api/customers', { name: '', email: 'a@b.c' })).status).toBe(400);
    expect((await call('POST', '/api/customers', { name: 'A', email: ' ' })).status).toBe(400);
    const dup = await call('POST', '/api/customers', { name: 'Other', email: 'NEW.READER@example.com' });
    expect(dup.status).toBe(409);
    expect(typeof dup.json.message).toBe('string');
  });
});

describe('orders', () => {
  test('list: 300, default placedAt desc, shape, money text', async () => {
    const { json } = await get('/api/orders');
    expect(json.total).toBe(300);
    const placed = json.data.map((o: Json) => o.placedAt);
    expect(placed).toEqual([...placed].sort().reverse());
    expect(placed[0].slice(0, 10) <= ANCHOR).toBe(true);
    const o = json.data[0];
    expect(o.number).toMatch(/^SO-\d{4}$/);
    expect(o.totalText).toBe(`฿${o.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    expect(o.subtotalText).toBe(`฿${o.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    expect(o.shippingText).toBe(o.shipping === 0 ? '฿0.00' : '฿50.00');
    expect(o.total).toBeCloseTo(o.subtotal + o.shipping, 2);
    expect(json.data.filter((x: Json) => x.status === 'refund_requested').length).toBe(8);
  });

  test('status: one or a comma list', async () => {
    const one = await get('/api/orders?status=refund_requested');
    expect(one.json.total).toBe(8);
    const many = await get('/api/orders?status=refunded,cancelled');
    expect(many.json.total).toBeGreaterThan(0);
    expect(many.json.data.every((o: Json) => o.status === 'refunded' || o.status === 'cancelled')).toBe(true);
    expect(many.json.data.find((o: Json) => o.status === 'refunded').statusLabel).toBe('Refunded');
  });

  test('from / to are inclusive calendar dates', async () => {
    const r = await get('/api/orders?from=2026-10-01&to=2026-10-10');
    expect(r.json.total).toBeGreaterThan(0);
    for (const o of r.json.data) {
      expect(o.placedAt.slice(0, 10) >= '2026-10-01').toBe(true);
      expect(o.placedAt.slice(0, 10) <= '2026-10-10').toBe(true);
    }
    const all = (await get('/api/orders')).json.data;
    const expected = all.filter((o: Json) => o.placedAt.slice(0, 10) >= '2026-10-01' && o.placedAt.slice(0, 10) <= '2026-10-10');
    expect(r.json.total).toBe(expected.length);
  });

  test('search by number or customer name; customer filter', async () => {
    const byNumber = await get('/api/orders?search=so-1001');
    expect(byNumber.json.data.map((o: Json) => o._id)).toContain('o-1001');
    const first = (await get('/api/orders?limit=1')).json.data[0];
    const byCustomer = await get(`/api/orders?customer=${first.customerId}`);
    expect(byCustomer.json.data.every((o: Json) => o.customerId === first.customerId)).toBe(true);
    const byName = await get(`/api/orders?search=${encodeURIComponent(first.customerName)}`);
    expect(byName.json.data.map((o: Json) => o._id)).toContain(first._id);
  });

  test('detail: items + refund steps', async () => {
    const plain = (await get('/api/orders?status=delivered&limit=1')).json.data[0];
    const detail = (await get(`/api/orders/${plain._id}`)).json.data;
    expect(detail.refund).toBeNull();
    expect(detail.items.length).toBeGreaterThanOrEqual(1);
    expect(detail.items.length).toBeLessThanOrEqual(4);
    const item = detail.items[0];
    expect(Object.keys(item)).toEqual(['_id', 'bookId', 'title', 'authorName', 'cover', 'qty', 'price', 'priceText', 'lineTotal', 'lineTotalText']);
    expect(item.lineTotal).toBeCloseTo(item.qty * item.price, 2);
    expect(item.lineTotalText).toBe(`฿${item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    expect(detail.itemCount).toBe(detail.items.reduce((s: number, i: Json) => s + i.qty, 0));

    const requested = (await get('/api/orders?status=refund_requested&limit=1')).json.data[0];
    const rd = (await get(`/api/orders/${requested._id}`)).json.data;
    expect(rd.refund.steps).toHaveLength(2);
    expect(rd.refund.steps[0]).toMatchObject({ sequence: 1, status: 5 });
    expect(rd.refund.steps[1]).toMatchObject({ sequence: 2, status: 2, name: 'Chanwit Yimneam', actionDate: null });
    expect(typeof rd.refund.reason).toBe('string');
    expect((await get('/api/orders/o-9999')).status).toBe(404);
  });

  test('refund: success, then 409; 404 unknown', async () => {
    const requested = (await get('/api/orders?status=refund_requested&limit=1')).json.data[0];
    const r = await call('POST', `/api/orders/${requested._id}/refund`, { remark: 'OK by manager' });
    expect(r.status).toBe(200);
    expect(r.json.data.status).toBe('refunded');
    expect(r.json.data.statusLabel).toBe('Refunded');
    const step = r.json.data.refund.steps[1];
    expect(step.status).toBe(5);
    expect(step.remark).toBe('OK by manager');
    expect(Date.parse(step.actionDate)).not.toBeNaN();
    expect((await get('/api/orders?status=refund_requested')).json.total).toBe(7);

    expect((await call('POST', `/api/orders/${requested._id}/refund`, {})).status).toBe(409);
    const delivered = (await get('/api/orders?status=delivered&limit=1')).json.data[0];
    expect((await call('POST', `/api/orders/${delivered._id}/refund`)).status).toBe(409);
    expect((await call('POST', '/api/orders/o-9999/refund')).status).toBe(404);
  });
});

describe('staff', () => {
  test('list: active only, sorted by name', async () => {
    const { json } = await get('/api/staff');
    expect(json.total).toBe(5);
    expect(json.data.map((s: Json) => s.name)).toEqual([
      'Arthit Wongsa', 'Chanwit Yimneam', 'Kanokwan Srisuk', 'Pimchanok Saelim', 'Thanapat Rattanakul',
    ]);
  });

  test('by-email: 200 / 400 / 403 / 404', async () => {
    const ok = await get('/api/staff/by-email?email=Chanwit_Y@gummay.co.th');
    expect(ok.status).toBe(200);
    expect(ok.json.data).toMatchObject({
      _id: 's-1',
      email: 'chanwit_y@gummay.co.th',
      firstNameEn: 'Chanwit',
      lastNameEN: 'Yimneam',
      name: 'Chanwit Yimneam',
      jobTitle: 'Store Manager',
      role: 'manager',
      companyModel: { name: 'Gummy Books' },
      active: true,
    });
    expect(ok.json.data.avatar).toStartWith(`${PUBLIC}/api/avatars/`);
    expect((await get('/api/staff/by-email?email=')).status).toBe(400);
    expect((await get('/api/staff/by-email')).status).toBe(400);
    expect((await get('/api/staff/by-email?email=nadia_s@gummay.co.th')).status).toBe(403);
    expect((await get('/api/staff/by-email?email=nobody@gummay.co.th')).status).toBe(404);
  });
});

describe('settings', () => {
  test('defaults', async () => {
    const { json } = await get('/api/settings');
    expect(json.data).toMatchObject({
      currency: 'THB',
      notifyOrders: true,
      notifyLowStock: true,
      lowStockDaily: false,
      lowStockThreshold: 5,
    });
    const line = json.data.refundLine;
    expect(line.map((s: Json) => [s.sequence, s.actionType])).toEqual([[1, 'Reviewer'], [2, 'Approver']]);
    expect(line[0].inchargeUsers[0].name).toBe('Kanokwan Srisuk');
    expect(line[1].inchargeUsers[0].name).toBe('Chanwit Yimneam');
    expect(line[1].ccUsers[0].name).toBe('Pimchanok Saelim');
  });

  test('patch: coercion, refundLine validation + renumbering', async () => {
    const r = await call('PATCH', '/api/settings', { lowStockDaily: 'true', lowStockThreshold: '8', notifyOrders: 'false' });
    expect(r.status).toBe(200);
    expect(r.json.data).toMatchObject({ lowStockDaily: true, lowStockThreshold: 8, notifyOrders: false, currency: 'THB' });
    expect((await call('PATCH', '/api/settings', { lowStockThreshold: '-3' })).json.data.lowStockThreshold).toBe(0);
    expect((await call('PATCH', '/api/settings', { lowStockThreshold: 'abc' })).status).toBe(400);

    const user = { _id: 's-3', name: 'Thanapat Rattanakul' };
    const bad = await call('PATCH', '/api/settings', {
      refundLine: [{ sequence: 1, actionType: 'Reviewer', inchargeUsers: [user] }, { sequence: 2, actionType: 'Approver', inchargeUsers: [] }],
    });
    expect(bad.status).toBe(400);
    expect((await get('/api/settings')).json.data.refundLine).toHaveLength(2);

    const good = await call('PATCH', '/api/settings', {
      refundLine: [
        { sequence: 7, actionType: 'Reviewer', inchargeUsers: [user], ccUsers: [] },
        { sequence: 3, actionType: 'Approver', inchargeUsers: [user] },
        { sequence: 9, actionType: 'Approver', inchargeUsers: [user], ccUsers: [user] },
      ],
    });
    expect(good.status).toBe(200);
    expect(good.json.data.refundLine.map((s: Json) => s.sequence)).toEqual([1, 2, 3]);
    expect(good.json.data.refundLine[1].ccUsers).toEqual([]);
  });
});

describe('summary', () => {
  test('shape', async () => {
    const { json } = await get('/api/summary');
    const s = json.data;
    expect(s.bookCount).toBe(120);
    expect(s.customerCount).toBe(60);
    expect(s.refundRequests).toBe(8);
    expect(s.ordersThisMonth).toBeGreaterThan(0);
    expect(s.revenueThisMonthText).toBe(
      `฿${s.revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );

    expect(s.salesByDay).toHaveLength(30);
    expect(s.salesByDay[29].date).toBe(ANCHOR);
    expect(s.salesByDay[0].date).toBe('2026-09-25');
    for (const d of s.salesByDay) expect(Object.keys(d).sort()).toEqual(['date', 'orders', 'total']);

    expect(s.lowStock.length).toBeLessThanOrEqual(8);
    const stocks = s.lowStock.map((b: Json) => b.stock);
    expect(stocks).toEqual([...stocks].sort((x: number, y: number) => x - y));
    expect(stocks.every((n: number) => n <= 5)).toBe(true);
    expect(s.lowStockCount).toBeGreaterThanOrEqual(s.lowStock.length);

    expect(s.recentOrders).toHaveLength(8);
    expect(s.recentOrders[0]._id).toBe((await get('/api/orders?limit=1')).json.data[0]._id);
  });

  test('revenue follows a refund', async () => {
    const requested = (await get(`/api/orders?status=refund_requested&from=${ANCHOR.slice(0, 7)}-01`)).json.data[0];
    const before = (await get('/api/summary')).json.data.revenueThisMonth;
    if (!requested) return; // none this month with this seed
    await call('POST', `/api/orders/${requested._id}/refund`);
    const after = (await get('/api/summary')).json.data.revenueThisMonth;
    expect(after).toBeCloseTo(before - requested.total, 2);
  });
});

describe('images', () => {
  test('covers: SVG, escaped, 404 unknown', async () => {
    await call('PATCH', '/api/books/b-001', { title: 'Salt & Smoke <The Very Long Title That Keeps Going On And On Forever>' });
    const res = await app.request('/api/covers/b-001.svg');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    const svg = await res.text();
    expect(svg).toStartWith('<svg');
    expect(svg).toContain('width="300" height="450"');
    expect(svg).toContain('Salt &amp; Smoke');
    expect(svg).not.toContain('<The');
    expect((svg.match(/font-size="30"/g) ?? []).length).toBeLessThanOrEqual(3);
    expect((await app.request('/api/covers/b-999.svg')).status).toBe(404);
  });

  test('avatars: SVG with initials', async () => {
    const res = await app.request('/api/avatars/chanwit-yimneam.svg');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    const svg = await res.text();
    expect(svg).toContain('width="128" height="128"');
    expect(svg).toContain('>CY<');
  });

  test('upload: 201, GET bytes, DELETE; 415 text/plain', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const form = new FormData();
    form.append('file', new File([bytes], 'My Cover.png', { type: 'image/png' }));
    const res = await app.request('/api/upload', { method: 'POST', body: form });
    expect(res.status).toBe(201);
    const { data } = (await res.json()) as Json;
    expect(data).toMatchObject({ size: bytes.length, type: 'image/png' });
    expect(data.url).toBe(`${PUBLIC}/api/uploads/${data.name}`);

    const got = await app.request(`/api/uploads/${data.name}`);
    expect(got.status).toBe(200);
    expect(got.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(bytes);

    expect(await call('DELETE', `/api/uploads/${data.name}`)).toEqual({ status: 200, json: { data: { name: data.name } } });
    expect((await app.request(`/api/uploads/${data.name}`)).status).toBe(404);

    const text = new FormData();
    text.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    const rejected = await app.request('/api/upload', { method: 'POST', body: text });
    expect(rejected.status).toBe(415);
    expect(typeof ((await rejected.json()) as Json).message).toBe('string');
  });

  test('upload: 413 over 5 MB', async () => {
    const form = new FormData();
    form.append('file', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }));
    expect((await app.request('/api/upload', { method: 'POST', body: form })).status).toBe(413);
  });
});

describe('display dates', () => {
  test('orders, refunds, reviews, books and customers carry shop-time date strings', async () => {
    const app = createApp({ anchorDate: '2026-10-24' });
    const orders = await (await app.request('/api/orders?status=refund_requested&limit=1')).json();
    const row = orders.data[0];
    expect(row.placedAtText).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/);
    const detail = await (await app.request(`/api/orders/${row._id}`)).json();
    expect(detail.data.refund.requestedAtText).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/);
    const books = await (await app.request('/api/books?limit=1')).json();
    expect(books.data[0].publishedAtText).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    const reviews = await (await app.request(`/api/books/${books.data[0]._id}/reviews`)).json();
    expect(reviews.data[0].createdAtText).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    const customers = await (await app.request('/api/customers?limit=1')).json();
    expect(customers.data[0].joinedAtText).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
  });

  test('a calendar date stays on its day in shop time', async () => {
    const { dateText } = await import('../src/http.ts');
    expect(dateText('2002-09-21')).toBe('21 Sep 2002');
  });
});

describe('cors', () => {
  test('a preflight allows the headers the engine client sends', async () => {
    const res = await createApp({ anchorDate: '2026-10-24' }).request('/api/staff/by-email?email=chanwit_y@gummay.co.th', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3300',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'access-control-allow-origin,app-version,authorization,content-type',
      },
    });
    expect(res.status).toBe(204);
    const allowed = (res.headers.get('access-control-allow-headers') ?? '').toLowerCase();
    for (const h of ['app-version', 'authorization', 'content-type', 'access-control-allow-origin']) expect(allowed).toContain(h);
  });
});
