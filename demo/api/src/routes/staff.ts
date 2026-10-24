/** `/api/staff` — the active staff list (workflow user list) and the sign-in profile lookup. */
import { Hono } from 'hono';
import { HttpError, listResponse, ok } from '../http.ts';
import type { Store } from '../store.ts';

export function staffRoutes(store: Store): Hono {
  const app = new Hono();

  app.get('/staff', (c) =>
    listResponse(c, store.db.staff.filter((s) => s.active).map((s) => store.staffView(s)), { sortBy: 'name' }),
  );

  app.get('/staff/by-email', (c) => {
    const email = c.req.query('email')?.trim().toLowerCase() ?? '';
    if (!email) throw new HttpError(400, 'email is required');
    const person = store.db.staff.find((s) => s.email.toLowerCase() === email);
    if (!person) throw new HttpError(404, `No staff member with the email ${email}`);
    if (!person.active) throw new HttpError(403, `${person.name} no longer has access`);
    return ok(c, store.staffView(person));
  });

  return app;
}
