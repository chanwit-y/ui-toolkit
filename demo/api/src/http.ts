/**
 * Request / response helpers shared by the route modules: the `{ data }` / `{ message }`
 * envelopes, body reading, form-value coercion and the paged-list query (`offset`, `limit`,
 * `sortBy`, `sortDir`).
 */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type Row = Record<string, unknown>;

/** `{ data }` with a status (200 by default). */
export const ok = (c: Context, data: unknown, status: ContentfulStatusCode = 200) => c.json({ data }, status);

/** `{ message }` with an error status. */
export const fail = (c: Context, status: ContentfulStatusCode, message: string) => c.json({ message }, status);

/** Thrown by validators; the route turns it into `{ message }` with its status. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The request body as a plain object: JSON, urlencoded or multipart. An empty body is `{}`;
 * a malformed one (or a JSON array / scalar) throws a 400.
 */
export async function readBody(c: Context): Promise<Row> {
  const type = c.req.header('content-type') ?? '';
  try {
    if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
      return (await c.req.parseBody()) as Row;
    }
    const text = await c.req.text();
    if (!text.trim()) return {};
    const value: unknown = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Row;
  } catch {
    // fall through
  }
  throw new HttpError(400, 'The request body must be a JSON object or a form');
}

// ── Coercion (form values arrive as strings) ─────────────────────────────────

/** A string, or `undefined` when absent. Numbers / booleans are stringified. */
export function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

/** A number, `undefined` when absent or blank, `NaN` when unparseable. */
export function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = v.trim().replace(/,/g, '');
    return t === '' ? undefined : Number(t);
  }
  return Number.NaN;
}

/** A boolean from `true` / `"true"` / `"1"` / `"on"` …; `undefined` when absent or unrecognised. */
export function bool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(t)) return true;
    if (['false', '0', 'no', 'off', ''].includes(t)) return false;
  }
  return undefined;
}

/** A required non-negative number field (`price`, `stock` …); throws 400 otherwise. */
export function nonNegative(v: unknown, field: string, opts: { integer?: boolean } = {}): number {
  const n = num(v);
  if (n === undefined || Number.isNaN(n)) throw new HttpError(400, `${field} must be a number`);
  if (n < 0) throw new HttpError(400, `${field} must be 0 or more`);
  return opts.integer ? Math.round(n) : Math.round(n * 100) / 100;
}

/** `฿1,250.00` — the display string shipped beside every money field. */
export const money = (n: number): string =>
  `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The shop's clock: dates are shown in Bangkok time. */
const SHOP_TZ = 'Asia/Bangkok';

/** `16 Oct 2026, 13:38` — a timestamp as the screens show it (config can't format dates). */
export const dateTimeText = (iso: string): string =>
  iso ? `${dateText(iso)}, ${new Date(iso).toLocaleTimeString('en-GB', { timeZone: SHOP_TZ, hour: '2-digit', minute: '2-digit', hour12: false })}` : '';

/** `21 Sep 2002` — a calendar date (`YYYY-MM-DD`) or the date of a timestamp. */
export const dateText = (value: string): string =>
  value
    ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString('en-GB', { timeZone: SHOP_TZ, day: 'numeric', month: 'short', year: 'numeric' })
    : '';

// ── Lists ────────────────────────────────────────────────────────────────────

/** Case-insensitive "contains" over several values. */
export const matches = (needle: string, ...hay: unknown[]): boolean => {
  const n = needle.trim().toLowerCase();
  return !n || hay.some((h) => h != null && String(h).toLowerCase().includes(n));
};

/** Every value of a query key, repeated keys and comma lists alike. */
export function queryList(c: Context, key: string): string[] {
  return (c.req.queries(key) ?? [])
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

const readPath = (row: Row, path: string): unknown =>
  path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Row)[k] : undefined), row);

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'en', { sensitivity: 'base', numeric: true });
}

/**
 * Sorts (blank values last in either direction) and pages `rows` per the query, answering
 * `{ data, total }` where `total` counts the matches before paging.
 */
export function listResponse(c: Context, rows: Row[], defaults: { sortBy: string; sortDir?: 'asc' | 'desc' }) {
  const sortBy = c.req.query('sortBy')?.trim() || defaults.sortBy;
  const explicitDir = c.req.query('sortDir')?.trim().toLowerCase();
  const dir = (c.req.query('sortBy')?.trim() ? explicitDir : explicitDir || defaults.sortDir) === 'desc' ? -1 : 1;
  const sorted = [...rows].sort((x, y) => {
    const a = readPath(x, sortBy);
    const b = readPath(y, sortBy);
    const blankA = a == null || a === '';
    const blankB = b == null || b === '';
    if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
    return compare(a, b) * dir;
  });
  const offset = Math.max(0, Math.floor(num(c.req.query('offset')) || 0));
  const limitRaw = num(c.req.query('limit'));
  const limit = limitRaw === undefined || Number.isNaN(limitRaw) || limitRaw < 0 ? undefined : Math.floor(limitRaw);
  const data = sorted.slice(offset, limit === undefined ? undefined : offset + limit);
  return c.json({ data, total: rows.length });
}
