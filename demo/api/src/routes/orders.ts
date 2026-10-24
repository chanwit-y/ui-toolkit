/** `/api/orders` — the order list with filters, the detail (items + refund line) and refund approval. */
import { Hono } from 'hono';
import { HttpError, listResponse, matches, ok, queryList, readBody, str } from '../http.ts';
import type { Store } from '../store.ts';

export function orderRoutes(store: Store): Hono {
  const app = new Hono();

  const orderOr404 = (id: string) => {
    const order = store.order(id);
    if (!order) throw new HttpError(404, `Order ${id} not found`);
    return order;
  };

  app.get('/orders', (c) => {
    const search = c.req.query('search') ?? '';
    const statuses = queryList(c, 'status');
    const from = c.req.query('from')?.trim().slice(0, 10);
    const to = c.req.query('to')?.trim().slice(0, 10);
    const customer = c.req.query('customer')?.trim();
    const rows = store.db.orders
      .map((o) => store.orderView(o))
      .filter((o) => matches(search, o.number, o.customerName))
      .filter((o) => statuses.length === 0 || statuses.includes(o.status))
      .filter((o) => !from || o.placedAt.slice(0, 10) >= from)
      .filter((o) => !to || o.placedAt.slice(0, 10) <= to)
      .filter((o) => !customer || o.customerId === customer);
    return listResponse(c, rows, { sortBy: 'placedAt', sortDir: 'desc' });
  });

  app.get('/orders/:id', (c) => ok(c, store.orderDetail(orderOr404(c.req.param('id')))));

  app.post('/orders/:id/refund', async (c) => {
    const order = orderOr404(c.req.param('id'));
    const body = await readBody(c);
    if (order.status !== 'refund_requested' || !order.refund) {
      throw new HttpError(409, `Order ${order.number} has no pending refund request (status: ${order.status})`);
    }
    const step = order.refund.steps.find((s) => s.status === 2);
    if (step) {
      step.status = 5;
      step.actionDate = new Date().toISOString();
      step.remark = str(body.remark) ?? '';
    }
    order.status = 'refunded';
    return ok(c, store.orderDetail(order));
  });

  return app;
}
