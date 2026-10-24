/** `/api/settings` — the shop settings, read and partially updated (incl. the refund approval line). */
import { Hono } from 'hono';
import { bool, HttpError, num, ok, readBody, str, type Row } from '../http.ts';
import type { RefundLineStep, Settings, Store } from '../store.ts';

/** Validates a refund line: an array of steps, each with at least one person in charge; renumbers 1…n. */
function refundLine(value: unknown): RefundLineStep[] {
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      throw new HttpError(400, 'refundLine must be an array of steps');
    }
  }
  if (!Array.isArray(v)) throw new HttpError(400, 'refundLine must be an array of steps');
  return v.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new HttpError(400, `refundLine step ${i + 1} must be an object`);
    const step = raw as Row;
    if (!Array.isArray(step.inchargeUsers) || step.inchargeUsers.length === 0) {
      throw new HttpError(400, `refundLine step ${i + 1} needs at least one person in charge`);
    }
    return {
      ...step,
      sequence: i + 1,
      actionType: str(step.actionType) ?? '',
      inchargeUsers: step.inchargeUsers,
      ccUsers: Array.isArray(step.ccUsers) ? step.ccUsers : [],
    };
  });
}

export function settingsRoutes(store: Store): Hono {
  const app = new Hono();

  app.get('/settings', (c) => ok(c, store.settings));

  app.patch('/settings', async (c) => {
    const body = await readBody(c);
    const next: Settings = { ...store.settings };
    if (body.currency !== undefined) {
      const currency = str(body.currency)?.trim();
      if (!currency) throw new HttpError(400, 'currency must be a non-empty string');
      next.currency = currency;
    }
    for (const key of ['notifyOrders', 'notifyLowStock', 'lowStockDaily'] as const) {
      if (body[key] === undefined) continue;
      const value = bool(body[key]);
      if (value === undefined) throw new HttpError(400, `${key} must be a boolean`);
      next[key] = value;
    }
    if (body.lowStockThreshold !== undefined) {
      const n = num(body.lowStockThreshold);
      if (n === undefined || Number.isNaN(n)) throw new HttpError(400, 'lowStockThreshold must be a number');
      next.lowStockThreshold = Math.max(0, n);
    }
    if (body.refundLine !== undefined) next.refundLine = refundLine(body.refundLine);
    store.settings = next;
    return ok(c, store.settings);
  });

  return app;
}
