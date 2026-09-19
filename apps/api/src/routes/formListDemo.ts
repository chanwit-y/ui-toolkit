import { Hono } from 'hono';
import { contactService, noteService } from '../data/formListDemo.js';

/**
 * `/collection/contacts` and `/collection/notes` — the Form list demo's
 * resources. GET lists, POST creates, PATCH `/:id` updates, DELETE `/:id`
 * removes; every reply uses the `{ data, status, success, message }` envelope.
 */
export const formListDemoRoutes = new Hono();

type Service = {
  list: () => unknown[];
  create: (data: any) => unknown;
  update: (id: string, data: any) => unknown | null;
  delete: (id: string) => boolean;
};

function mount(path: string, label: string, service: Service, validate: (body: any) => string | null, decorate?: (body: any) => any) {
  formListDemoRoutes.get(path, (c) =>
    c.json({ data: service.list(), status: 200, success: true, message: `${label}s retrieved successfully` }),
  );
  formListDemoRoutes.post(path, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const problem = validate(body);
    if (problem) return c.json({ data: null, status: 400, success: false, message: problem }, 400);
    const row = service.create(decorate ? decorate(body) : body);
    return c.json({ data: row, status: 201, success: true, message: `${label} created successfully` }, 201);
  });
  formListDemoRoutes.patch(`${path}/:id`, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const row = service.update(c.req.param('id'), body ?? {});
    if (!row) return c.json({ data: null, status: 404, success: false, message: `${label} not found` }, 404);
    return c.json({ data: row, status: 200, success: true, message: `${label} updated successfully` });
  });
  formListDemoRoutes.delete(`${path}/:id`, (c) => {
    if (!service.delete(c.req.param('id')))
      return c.json({ data: null, status: 404, success: false, message: `${label} not found` }, 404);
    return c.json({ data: null, status: 200, success: true, message: `${label} deleted successfully` });
  });
}

mount(
  '/collection/contacts',
  'Contact',
  contactService,
  (b) => (typeof b?.name === 'string' && b.name.trim() ? null : 'Name is required'),
  (b) => ({ name: b.name, email: b.email ?? '', role: b.role ?? 'viewer' }),
);

mount(
  '/collection/notes',
  'Note',
  noteService,
  (b) => (typeof b?.text === 'string' && b.text.trim() ? null : 'Text is required'),
  (b) => ({ text: b.text, createdAt: new Date().toISOString() }),
);
