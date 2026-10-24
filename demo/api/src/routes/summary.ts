/** `/api/summary` — the dashboard: counts, this month's revenue, 30 days of sales, low stock, recent orders. */
import { Hono } from 'hono';
import { addDays, round2 } from '../data.ts';
import { money, ok } from '../http.ts';
import { isSale, type Store } from '../store.ts';

export function summaryRoutes(store: Store): Hono {
  const app = new Hono();

  app.get('/summary', (c) => {
    const { db, anchorDate, settings } = store;
    const month = anchorDate.slice(0, 7);
    const thisMonth = db.orders.filter((o) => o.placedAt.slice(0, 7) === month);
    const revenueThisMonth = round2(thisMonth.filter(isSale).reduce((s, o) => s + store.totals(o).total, 0));

    const salesByDay = Array.from({ length: 30 }, (_, i) => {
      const date = addDays(anchorDate, i - 29);
      const placed = db.orders.filter((o) => o.placedAt.slice(0, 10) === date);
      return {
        date,
        total: round2(placed.filter(isSale).reduce((s, o) => s + store.totals(o).total, 0)),
        orders: placed.length,
      };
    });

    const low = db.books
      .filter((b) => b.stock <= settings.lowStockThreshold)
      .sort((x, y) => x.stock - y.stock || x.title.localeCompare(y.title));

    return ok(c, {
      bookCount: db.books.length,
      customerCount: db.customers.length,
      ordersThisMonth: thisMonth.length,
      revenueThisMonth,
      revenueThisMonthText: money(revenueThisMonth),
      lowStockCount: low.length,
      refundRequests: db.orders.filter((o) => o.status === 'refund_requested').length,
      salesByDay,
      lowStock: low.slice(0, 8).map((b) => store.bookView(b)),
      recentOrders: [...db.orders]
        .sort((x, y) => y.placedAt.localeCompare(x.placedAt))
        .slice(0, 8)
        .map((o) => store.orderView(o)),
    });
  });

  return app;
}
