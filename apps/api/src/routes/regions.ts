import { Hono } from 'hono';
import { countries } from '../data/countries.js';

/**
 * `/collection/regions` — the Repeater demo's nested resource: each region
 * carries the `countries[]` that belong to it (read live from the country
 * store, so a renamed or deleted country shows up here too). Read-only; the
 * reply uses the `{ data, status, success, message }` envelope.
 */
export const regionRoutes = new Hono();

const REGIONS: { _id: string; name: string; description: string; featured: boolean; codes: string[] }[] = [
  {
    _id: 'r-sea',
    name: 'Southeast Asia',
    description: 'ASEAN members on the mainland and the archipelago.',
    featured: true,
    codes: ['TH', 'SG', 'MY', 'ID', 'VN', 'PH'],
  },
  {
    _id: 'r-ea',
    name: 'East & South Asia',
    description: 'The largest economies of the continent.',
    featured: false,
    codes: ['JP', 'KR', 'CN', 'IN'],
  },
  {
    _id: 'r-eu',
    name: 'Europe',
    description: 'Western and southern Europe.',
    featured: false,
    codes: ['GB', 'FR', 'DE', 'IT', 'ES', 'PT'],
  },
  {
    _id: 'r-an',
    name: 'Antarctica',
    description: 'No countries — shows the nested repeater’s empty state.',
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
