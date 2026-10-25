/**
 * The Book shop project (gummy/projects/book-shop, what the demo renders) against this mock API:
 * every endpoint the project names is a route the API answers, and a GET returns the fields its
 * response model declares. Catches a studio edit (or an API change) that breaks the contract.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../src/app.ts';

type Model = Record<string, unknown>;
type Endpoint = { url: string; methods: string; response?: string; query?: string; parameter?: string; body?: string };
type Project = { model: Record<string, Model>; api: Record<string, Endpoint>; env?: Record<string, string> };

const project = JSON.parse(readFileSync(join(import.meta.dir, '..', '..', 'gummy', 'projects', 'book-shop', 'project.json'), 'utf8')) as Project;

/** A real id for every `:param` the project's URLs use. */
const PARAMS: Record<string, string> = { id: '', bookId: 'b-001', authorId: 'a-01', genre: 'g-fantasy' };
/** `:id` depends on the resource. */
const ID_BY_PREFIX: [RegExp, string][] = [
  [/^\/api\/books\/:bookId\/editions\/:id/, 'unknown-edition'],
  [/^\/api\/authors\/:authorId\/links\/:id/, 'unknown-link'],
  [/^\/api\/books/, 'b-001'],
  [/^\/api\/authors/, 'a-01'],
  [/^\/api\/orders/, 'o-1001'],
  [/^\/api\/customers/, 'c-001'],
];

function fill(url: string): string {
  const id = ID_BY_PREFIX.find(([re]) => re.test(url))?.[1] ?? 'x';
  return url.replace(/:(\w+)/g, (_, name: string) => (name === 'id' ? id : PARAMS[name] ?? 'x'));
}

/** The field names of a model level: `{ data: { ... } }` → its keys, an array collection → the row's keys. */
function fieldsOf(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as { type?: string; collection?: unknown };
  if ((n.type === 'array' || n.type === 'object') && n.collection && typeof n.collection === 'object') return Object.keys(n.collection);
  return Object.keys(node);
}

describe('book-shop project ↔ mock API', () => {
  test('the project points at this API', () => {
    expect(project.env?.API_URL).toBe('http://localhost:9100');
    expect(Object.keys(project.api).length).toBeGreaterThan(20);
  });

  for (const [name, ep] of Object.entries(project.api)) {
    test(`${name}: ${ep.methods} ${ep.url}`, async () => {
      const app = createApp({ anchorDate: '2026-10-24' });
      const query = ep.url === '/api/staff/by-email' ? '?email=chanwit_y@gummay.co.th' : '';
      const res = await app.request(fill(ep.url) + query, {
        method: ep.methods,
        headers: ep.methods === 'GET' || ep.methods === 'DELETE' ? undefined : { 'content-type': 'application/json' },
        body: ep.methods === 'GET' || ep.methods === 'DELETE' ? undefined : JSON.stringify({}),
      });
      const json = (await res.json()) as { message?: string; data?: unknown };
      // The route exists (a validation 400 / unknown-record 404 is fine for a write with an empty body).
      expect(json.message ?? '').not.toStartWith('Not found:');
      if (ep.methods !== 'GET') return;

      expect(res.status).toBe(200);
      const model = project.model[ep.response ?? ''];
      expect(model).toBeDefined();
      // Every field the response model declares at the top and under `data` is in the answer.
      for (const key of Object.keys(model)) expect(json).toHaveProperty(key);
      const declared = fieldsOf((model as Model).data);
      const data = json.data;
      const sample = Array.isArray(data) ? data[0] : data;
      expect(sample).toBeDefined();
      for (const key of declared) expect({ [name]: Object.keys(sample as object) }).toEqual({ [name]: expect.arrayContaining([key]) });
    });
  }
});
