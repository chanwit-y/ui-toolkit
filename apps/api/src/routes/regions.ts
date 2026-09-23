import { Hono } from 'hono';
import { countries, countryService } from '../data/countries.js';
import { pageInput } from './countries.js';

/**
 * `/collection/regions` — the Repeater demo's nested resource: each region
 * carries the `countries[]` that belong to it (read live from the country
 * store, so a renamed or deleted country shows up here too). Read-only; the
 * reply uses the `{ data, status, success, message }` envelope.
 */
export const regionRoutes = new Hono();

// `about` is a paragraph on purpose: the data table's line-clamp demo cuts it.
const REGIONS: { _id: string; name: string; description: string; about: string; featured: boolean; codes: string[] }[] = [
  {
    _id: 'r-sea',
    name: 'Southeast Asia',
    description: 'ASEAN members on the mainland and the archipelago.',
    about:
      'Ten member states of the Association of Southeast Asian Nations, stretching from the Indochinese peninsula to the islands of the Malay archipelago. The region mixes fast-growing manufacturing hubs, financial centres such as Singapore, and some of the busiest shipping lanes in the world, with tropical climates and monsoon seasons that shape agriculture and tourism alike.',
    featured: true,
    codes: ['TH', 'SG', 'MY', 'ID', 'VN', 'PH'],
  },
  {
    _id: 'r-ea',
    name: 'East & South Asia',
    description: 'The largest economies of the continent.',
    about:
      'Japan, South Korea, China and India between them hold more than a third of the world’s population and several of its largest economies. Dense megacities sit beside mountain ranges and river deltas; the region leads in electronics, automotive and software, and its trade ties with Southeast Asia and Europe make it the anchor of most Asia-Pacific supply chains.',
    featured: false,
    codes: ['JP', 'KR', 'CN', 'IN'],
  },
  {
    _id: 'r-eu',
    name: 'Europe',
    description: 'Western and southern Europe.',
    about:
      'Six countries of western and southern Europe, most of them members of the European Union and the Schengen area, sharing a single market and, for four of them, the euro. Old industrial heartlands and Mediterranean coastlines alike depend on cross-border trade, high-speed rail and a dense network of regional airports.',
    featured: false,
    codes: ['GB', 'FR', 'DE', 'IT', 'ES', 'PT'],
  },
  {
    _id: 'r-an',
    name: 'Antarctica',
    description: 'No countries — shows the nested repeater’s empty state.',
    about: 'A continent without countries.',
    featured: false,
    codes: [],
  },
];

regionRoutes.get('/collection/regions', (c) => {
  const data = REGIONS.map(({ codes, ...region }) => ({
    ...region,
    countries: countries
      .filter((country) => codes.includes(country.code))
      .map(({ _id, name, code, avatar }) => ({ _id, name, code, avatar })),
  }));
  return c.json({ data, status: 200, success: true, message: 'Regions retrieved successfully' });
});

// GET /collection/region/:region/page?offset&limit&name&sortBy&sortDir — the
// countries page of one region, for a data table filter mapped to a URL param.
// `:region` is a region id (`r-sea`, …) or `all`.
regionRoutes.get('/collection/region/:region/page', (c) => {
  const region = c.req.param('region');
  const found = REGIONS.find((r) => r._id === region);
  if (region !== 'all' && !found) {
    return c.json({ data: [], total: 0, status: 404, success: false, message: `Unknown region "${region}"` }, 404);
  }
  const input = Object.fromEntries(Object.entries(c.req.queries()).map(([k, v]) => [k, v.length > 1 ? v : v[0]]));
  const { rows, total } = countryService.getPage({ ...pageInput(input), codes: found?.codes });
  return c.json({ data: rows, total, status: 200, success: true, message: 'Region countries retrieved successfully' });
});

// GET /collection/region-countries — one flat row per country with its region
// (the Table layout demo: the region repeats down the rows, so a `mergeRows`
// column merges it; `created_by_name` equals `updated_by_name` on most rows,
// so two `mergeColumns` columns merge sideways). Ordered by region, then name.
regionRoutes.get('/collection/region-countries', (c) => {
  const data = REGIONS.flatMap((region, r) =>
    countries
      .filter((country) => region.codes.includes(country.code))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country, i) => ({
        _id: country._id,
        region: region.name,
        regionId: region._id,
        name: country.name,
        code: country.code,
        // Every third row was created by someone else.
        created_by_name: (r + i) % 3 === 2 ? 'System' : country.updated_by_name,
        updated_by_name: country.updated_by_name,
        created_at: '2024-12-01T09:00:00Z',
        updated_at: country.updated_at,
      })),
  );
  return c.json({ data, status: 200, success: true, message: 'Region countries retrieved successfully' });
});
