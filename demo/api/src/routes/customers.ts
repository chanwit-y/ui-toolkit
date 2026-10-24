/** `/api/customers` — the customer list, detail (with their orders) and create. */
import { Hono } from 'hono';
import type { CustomerRec } from '../data.ts';
import { HttpError, listResponse, matches, ok, readBody, str } from '../http.ts';
import type { Store } from '../store.ts';

export function customerRoutes(store: Store): Hono {
  const app = new Hono();

  app.get('/customers', (c) => {
    const search = c.req.query('search') ?? '';
    const city = c.req.query('city')?.trim().toLowerCase();
    const rows = store.db.customers
      .filter((cu) => matches(search, cu.name, cu.email))
      .filter((cu) => !city || cu.city.toLowerCase() === city)
      .map((cu) => store.customerView(cu));
    return listResponse(c, rows, { sortBy: 'name' });
  });

  app.get('/customers/:id', (c) => {
    const customer = store.customer(c.req.param('id'));
    if (!customer) throw new HttpError(404, `Customer ${c.req.param('id')} not found`);
    const orders = store.db.orders
      .filter((o) => o.customerId === customer._id)
      .sort((x, y) => y.placedAt.localeCompare(x.placedAt))
      .map((o) => store.orderView(o));
    return ok(c, { ...store.customerView(customer), orders });
  });

  app.post('/customers', async (c) => {
    const body = await readBody(c);
    const name = str(body.name)?.trim() ?? '';
    const email = str(body.email)?.trim() ?? '';
    if (!name) throw new HttpError(400, 'name is required');
    if (!email) throw new HttpError(400, 'email is required');
    if (store.db.customers.some((cu) => cu.email.toLowerCase() === email.toLowerCase())) {
      throw new HttpError(409, `The email ${email} is already taken`);
    }
    const customer: CustomerRec = {
      _id: store.nextId('customer'),
      name,
      email,
      phone: str(body.phone)?.trim() ?? '',
      city: str(body.city)?.trim() ?? '',
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    store.db.customers.push(customer);
    return ok(c, store.customerView(customer), 201);
  });

  return app;
}
