/**
 * `/api/analytics/*` — the Charts showcase's aggregates over the generated shop data (see
 * `README.md` → Analytics): sales by period with a target, revenue by genre / author / city,
 * orders by status, a weekday × hour heat, KPIs, the order funnel and a genre scorecard.
 * Read-only, derived from the current records on every call.
 */
import { Hono } from 'hono';
import { addDays, round2, STATUS_LABELS, type OrderRec, type OrderStatus } from '../data.ts';
import { money } from '../http.ts';
import { isSale, type Store } from '../store.ts';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_ORDER: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'refund_requested', 'refunded', 'cancelled'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monday of the week holding `date` (`YYYY-MM-DD`). */
function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sun
  return addDays(date, -((day + 6) % 7));
}

export function analyticsRoutes(store: Store): Hono {
  const app = new Hono();
  const { db } = store;
  const total = (o: OrderRec) => store.totals(o).total;
  const sales = () => db.orders.filter(isSale);
  const list = (c: Parameters<Hono['get']>[1] extends (c: infer C) => unknown ? C : never, rows: unknown[], extra: Record<string, unknown> = {}) =>
    c.json({ data: rows, total: rows.length, ...extra });

  /** Sales by day / week / month over the 90-day history, with a target (10% over the mean). */
  app.get('/analytics/sales', (c) => {
    const by = c.req.query('by') === 'day' ? 'day' : c.req.query('by') === 'month' ? 'month' : 'week';
    const keyOf = (date: string) => (by === 'day' ? date : by === 'month' ? `${date.slice(0, 7)}-01` : weekStart(date));
    const labelOf = (period: string) => {
      const d = new Date(`${period}T00:00:00Z`);
      return by === 'month' ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
    };
    const buckets = new Map<string, { orders: number; items: number; revenue: number }>();
    // Every period present, zeros included, from the first history day to the anchor.
    const first = db.orders.reduce((min, o) => (o.placedAt < min ? o.placedAt : min), store.anchorDate).slice(0, 10);
    for (let d = first; d <= store.anchorDate; d = addDays(d, 1)) if (!buckets.has(keyOf(d))) buckets.set(keyOf(d), { orders: 0, items: 0, revenue: 0 });
    for (const o of db.orders) {
      const b = buckets.get(keyOf(o.placedAt.slice(0, 10)))!;
      b.orders += 1;
      if (isSale(o)) {
        const t = store.totals(o);
        b.items += t.itemCount;
        b.revenue += t.total;
      }
    }
    const rows = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, b]) => ({ period, label: labelOf(period), orders: b.orders, items: b.items, revenue: round2(b.revenue), revenueText: money(round2(b.revenue)) }));
    const mean = rows.length ? rows.reduce((s, r) => s + r.revenue, 0) / rows.length : 0;
    const target = { revenue: round2(mean * 1.1), orders: Math.round((rows.reduce((s, r) => s + r.orders, 0) / Math.max(1, rows.length)) * 1.1) };
    return list(c, rows, { by, target });
  });

  /** Per genre: books, copies sold, revenue, average rating / price, stock. */
  app.get('/analytics/genres', (c) => {
    const rows = db.genres.map((g) => {
      const books = db.books.filter((b) => b.genreId === g._id);
      const views = books.map((b) => store.bookView(b));
      let copies = 0;
      let revenue = 0;
      for (const o of sales()) for (const it of o.items) if (books.some((b) => b._id === it.bookId)) (copies += it.qty), (revenue += it.qty * it.price);
      const rated = views.filter((v) => v.reviewCount > 0);
      return {
        genreId: g._id,
        genre: g.name,
        color: g.color,
        books: books.length,
        copies,
        revenue: round2(revenue),
        revenueText: money(round2(revenue)),
        avgRating: rated.length ? round2(rated.reduce((s, v) => s + v.rating, 0) / rated.length) : 0,
        avgPrice: books.length ? round2(books.reduce((s, b) => s + b.price, 0) / books.length) : 0,
        stock: books.reduce((s, b) => s + b.stock, 0),
      };
    });
    return list(c, rows);
  });

  /** Orders and revenue per status, in pipeline order. */
  app.get('/analytics/statuses', (c) => {
    const rows = STATUS_ORDER.map((status) => {
      const own = db.orders.filter((o) => o.status === status);
      const revenue = round2(own.reduce((s, o) => s + total(o), 0));
      return { status, label: STATUS_LABELS[status], orders: own.length, revenue, revenueText: money(revenue) };
    });
    return list(c, rows);
  });

  /** The best-selling authors by revenue (`?limit=`, default 8). */
  app.get('/analytics/authors', (c) => {
    const limit = Math.max(1, Math.min(30, Number(c.req.query('limit') ?? 8) || 8));
    const byAuthor = new Map<string, { copies: number; revenue: number }>();
    for (const o of sales()) {
      for (const it of o.items) {
        const authorId = store.book(it.bookId)?.authorId;
        if (!authorId) continue;
        const a = byAuthor.get(authorId) ?? { copies: 0, revenue: 0 };
        a.copies += it.qty;
        a.revenue += it.qty * it.price;
        byAuthor.set(authorId, a);
      }
    }
    const rows = [...byAuthor.entries()]
      .map(([authorId, a]) => ({
        authorId,
        author: store.author(authorId)?.name ?? authorId,
        books: db.books.filter((b) => b.authorId === authorId).length,
        copies: a.copies,
        revenue: round2(a.revenue),
        revenueText: money(round2(a.revenue)),
      }))
      .sort((x, y) => y.revenue - x.revenue || x.author.localeCompare(y.author))
      .slice(0, limit);
    return list(c, rows);
  });

  /** Customers, orders and revenue per city. */
  app.get('/analytics/cities', (c) => {
    const cities = [...new Set(db.customers.map((cu) => cu.city))].sort();
    const rows = cities.map((city) => {
      const ids = new Set(db.customers.filter((cu) => cu.city === city).map((cu) => cu._id));
      const orders = db.orders.filter((o) => ids.has(o.customerId));
      const revenue = round2(orders.filter(isSale).reduce((s, o) => s + total(o), 0));
      return { city, customers: ids.size, orders: orders.length, revenue, revenueText: money(revenue) };
    });
    return list(c, rows);
  });

  /** Orders placed per weekday × hour of day (the hours the shop takes orders in). */
  app.get('/analytics/order-heat', (c) => {
    const hours = [...new Set(db.orders.map((o) => Number(o.placedAt.slice(11, 13))))].sort((a, b) => a - b);
    const rows: { weekday: string; hour: string; orders: number; revenue: number }[] = [];
    for (const weekday of WEEKDAYS) {
      for (const h of hours) {
        const own = db.orders.filter((o) => {
          const d = new Date(o.placedAt);
          return WEEKDAYS[(d.getUTCDay() + 6) % 7] === weekday && d.getUTCHours() === h;
        });
        rows.push({ weekday, hour: `${String(h).padStart(2, '0')}:00`, orders: own.length, revenue: round2(own.filter(isSale).reduce((s, o) => s + total(o), 0)) });
      }
    }
    return list(c, rows);
  });

  /** The shop's KPIs as gauge rows (`?key=` picks one). */
  app.get('/analytics/kpis', (c) => {
    const orders = db.orders.length || 1;
    const delivered = db.orders.filter((o) => o.status === 'delivered' || o.status === 'refund_requested' || o.status === 'refunded').length;
    const refunds = db.orders.filter((o) => o.status === 'refund_requested' || o.status === 'refunded').length;
    const inStock = db.books.filter((b) => b.stock > 0).length;
    const rated = db.books.map((b) => store.bookView(b)).filter((v) => v.reviewCount > 0);
    const all = [
      { key: 'fulfilment', label: 'Fulfilment rate', value: round2((delivered / orders) * 100), min: 0, max: 100, target: 85, unit: '%' },
      { key: 'refunds', label: 'Refund rate', value: round2((refunds / orders) * 100), min: 0, max: 20, target: 5, unit: '%' },
      { key: 'inStock', label: 'Titles in stock', value: round2((inStock / Math.max(1, db.books.length)) * 100), min: 0, max: 100, target: 90, unit: '%' },
      { key: 'rating', label: 'Average rating', value: rated.length ? round2(rated.reduce((s, v) => s + v.rating, 0) / rated.length) : 0, min: 0, max: 5, target: 4, unit: '' },
    ];
    const key = c.req.query('key');
    const picked = key ? all.filter((k) => k.key === key) : all;
    return list(c, picked.length ? picked : all);
  });

  /** The order pipeline: placed → paid → shipped → delivered (each stage counts the orders that reached it). */
  app.get('/analytics/funnel', (c) => {
    const reached = (statuses: OrderStatus[]) => db.orders.filter((o) => statuses.includes(o.status)).length;
    const rows = [
      { stage: 'Placed', orders: db.orders.length },
      { stage: 'Paid', orders: reached(['paid', 'shipped', 'delivered', 'refund_requested', 'refunded']) },
      { stage: 'Shipped', orders: reached(['shipped', 'delivered', 'refund_requested', 'refunded']) },
      { stage: 'Delivered', orders: reached(['delivered', 'refund_requested', 'refunded']) },
    ];
    return list(c, rows);
  });

  /** A 0–100 score per genre and metric (rating, stock, sales, price, reviews) — the radar. */
  app.get('/analytics/genre-scores', (c) => {
    const stats = db.genres.map((g) => {
      const books = db.books.filter((b) => b.genreId === g._id);
      const views = books.map((b) => store.bookView(b));
      let copies = 0;
      for (const o of sales()) for (const it of o.items) if (books.some((b) => b._id === it.bookId)) copies += it.qty;
      return {
        genre: g.name,
        rating: views.length ? views.reduce((s, v) => s + v.rating, 0) / views.length : 0,
        stock: books.length ? books.filter((b) => b.stock > 0).length / books.length : 0,
        copies,
        price: books.length ? books.reduce((s, b) => s + b.price, 0) / books.length : 0,
        reviews: views.reduce((s, v) => s + v.reviewCount, 0),
      };
    });
    const maxCopies = Math.max(1, ...stats.map((s) => s.copies));
    const maxPrice = Math.max(1, ...stats.map((s) => s.price));
    const maxReviews = Math.max(1, ...stats.map((s) => s.reviews));
    const rows = stats.flatMap((s) => [
      { genre: s.genre, metric: 'Rating', score: Math.round((s.rating / 5) * 100) },
      { genre: s.genre, metric: 'In stock', score: Math.round(s.stock * 100) },
      { genre: s.genre, metric: 'Sales', score: Math.round((s.copies / maxCopies) * 100) },
      { genre: s.genre, metric: 'Price', score: Math.round((s.price / maxPrice) * 100) },
      { genre: s.genre, metric: 'Reviews', score: Math.round((s.reviews / maxReviews) * 100) },
    ]);
    return list(c, rows);
  });

  return app;
}
