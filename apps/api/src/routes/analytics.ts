import { Hono } from 'hono';

/**
 * `/collection/analytics/*` — the Charts demo's resources (see
 * `spec/gummy-chart-spec.md` §8): plain row arrays under the usual
 * `{ data, status, success, message }` envelope, deterministic (a seeded
 * generator, so a refresh draws the same picture), plus one `DataReport`-shaped
 * reply (`production`: `{ data, crossline, targets }`) for the
 * reference-line-by-path case. `?year=` scales `production` so a mapped
 * request visibly refetches.
 */
export const analyticsRoutes = new Hono();

const ok = <T>(data: T, extra: Record<string, unknown> = {}) => ({ data, ...extra, status: 200, success: true, message: 'ok' });

/** mulberry32: a tiny seeded PRNG so every reply is stable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}-01`);
const SITES = ['Chiang Mai', 'Rayong', 'Khon Kaen'];
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/** Monthly production per site: `{ month, site, tonnes, cost }`, 36 rows, with a target crossline. */
analyticsRoutes.get('/collection/analytics/production', (c) => {
  const year = Number(c.req.query('year') ?? 2026);
  const scale = Number.isFinite(year) ? 1 + ((year - 2026) % 5) * 0.08 : 1;
  const next = rng(7 + year);
  const base = [420, 310, 260];
  const data = MONTHS.flatMap((month, mi) =>
    SITES.map((site, si) => {
      const season = 1 + 0.18 * Math.sin((mi / 12) * Math.PI * 2);
      const tonnes = round(base[si] * season * scale * (0.9 + next() * 0.2));
      return { month, site, tonnes, cost: round(tonnes * (38 + next() * 6), 2) };
    }),
  );
  return c.json(ok(data, { crossline: [{ label: 'Target', value: round(1050 * scale) }], targets: [{ label: 'Stretch', value: round(1180 * scale) }] }));
});

/** Monthly sales: `{ month, revenue, orders, margin }` — revenue + orders on the left, margin (a ratio) on the right axis. */
analyticsRoutes.get('/collection/analytics/sales', (c) => {
  const next = rng(11);
  const data = MONTHS.map((month, i) => {
    const orders = round(180 + i * 9 + next() * 40);
    const revenue = round(orders * (520 + next() * 90), 2);
    return { month, revenue, orders, margin: round(0.22 + 0.08 * Math.sin(i / 2) + next() * 0.03, 3) };
  });
  return c.json(ok(data));
});

/** Revenue share by channel: `{ channel, amount }`. */
analyticsRoutes.get('/collection/analytics/share', (c) => {
  const data = [
    { channel: 'Online store', amount: 418200 },
    { channel: 'Marketplaces', amount: 265900 },
    { channel: 'Retail partners', amount: 198400 },
    { channel: 'Direct sales', amount: 121700 },
    { channel: 'Wholesale', amount: 64300 },
  ];
  return c.json(ok(data));
});

/** One KPI row per gauge: `{ name, value, min, max }`; `?name=` picks one (default availability). */
analyticsRoutes.get('/collection/analytics/kpi', (c) => {
  const all = [
    { name: 'availability', label: 'Plant availability', value: 86.4, min: 0, max: 100 },
    { name: 'oee', label: 'OEE', value: 61.2, min: 0, max: 100 },
    { name: 'nps', label: 'Net promoter score', value: 32, min: -100, max: 100 },
  ];
  const name = c.req.query('name');
  const picked = name ? all.filter((k) => k.name === name) : all;
  return c.json(ok(picked.length ? picked : all));
});

/** Activity by weekday × hour: `{ day, hour, count }`, 7 × 12 cells. */
analyticsRoutes.get('/collection/analytics/activity', (c) => {
  const next = rng(23);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = days.flatMap((day, di) =>
    Array.from({ length: 12 }, (_, h) => {
      const hour = 8 + h;
      const weekend = di >= 5 ? 0.35 : 1;
      const peak = Math.exp(-((hour - 14) ** 2) / 18);
      return { day, hour: `${hour}:00`, count: round(weekend * (12 + 70 * peak) * (0.8 + next() * 0.4)) };
    }),
  );
  return c.json(ok(data));
});

/** Sales funnel stages: `{ stage, count }` (unsorted on purpose — the chart sorts). */
analyticsRoutes.get('/collection/analytics/funnel', (c) => {
  const data = [
    { stage: 'Qualified', count: 1620 },
    { stage: 'Visits', count: 8400 },
    { stage: 'Won', count: 390 },
    { stage: 'Proposals', count: 940 },
    { stage: 'Sign-ups', count: 3100 },
  ];
  return c.json(ok(data));
});

/** Per-site stats for scatter / bubble: `{ site, region, output, cost, headcount }`, 24 rows. */
analyticsRoutes.get('/collection/analytics/sites', (c) => {
  const next = rng(31);
  const regions = ['North', 'East', 'Northeast'];
  const data = Array.from({ length: 24 }, (_, i) => {
    const headcount = round(40 + next() * 260);
    const output = round(headcount * (2.2 + next() * 1.6), 1);
    return { site: `Site ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`, region: regions[i % 3], output, cost: round(output * (30 + next() * 25), 2), headcount };
  });
  return c.json(ok(data));
});

/** Scorecard for radar: `{ metric, site, score }`, 6 metrics × 3 sites. */
analyticsRoutes.get('/collection/analytics/scores', (c) => {
  const next = rng(41);
  const metrics = ['Safety', 'Quality', 'Delivery', 'Cost', 'Morale', 'Innovation'];
  const data = SITES.flatMap((site, si) => metrics.map((metric, mi) => ({ metric, site, score: round(55 + 30 * next() + (si === 0 ? 8 : 0) - (mi === 3 ? 10 : 0)) })));
  return c.json(ok(data));
});
