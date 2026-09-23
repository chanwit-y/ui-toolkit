import { Hono, type Context } from 'hono';
import { countryService } from '../data/countries.js';

export const countryRoutes = new Hono();

// Search countries - GET /collection/search?search=...
countryRoutes.get('/collection/search', async (c) => {
  try {
    const search = c.req.query('search') ?? '';
    const results = countryService.search(search);

    return c.json({
      data: results,
      status: 200,
      success: true,
      message: 'Countries retrieved successfully',
    });
  } catch (error) {
    return c.json({
      data: [],
      status: 500,
      success: false,
      message: 'Failed to search countries',
    }, 500);
  }
});

// GET all countries - matches existing API contract: POST /collection/get-all
countryRoutes.post('/collection/get-all', async (c) => {
  try {
    const countries = countryService.getAll();
    return c.json({
      data: countries,
      status: 200,
      success: true,
      message: 'Countries retrieved successfully'
    });
  } catch (error) {
    return c.json({
      data: [],
      status: 500,
      success: false,
      message: 'Failed to retrieve countries'
    }, 500);
  }
});

// Paginated countries - POST /collection/page  { offset, limit, search, ... }
// and GET /collection/page?offset&limit&search&... (the DataTable's "query"
// placement). Both return one page of rows plus the total matching count.
// Custom filters: `name` (contains), `code` (equals), `updatedBy` (one of — an
// array, repeated query keys or a comma list). Sort: `sortBy` + `sortDir`.
// Without `limit` every matching row comes back (a table paging in memory).
const list = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .map((v) => String(v).trim())
    .filter(Boolean);

export const pageInput = (input: Record<string, unknown>) => ({
  offset: Number(input.offset ?? 0),
  limit: input.limit === undefined || input.limit === '' ? undefined : Number(input.limit),
  search: typeof input.search === 'string' ? input.search : '',
  name: typeof input.name === 'string' ? input.name : '',
  code: typeof input.code === 'string' ? input.code : '',
  updatedBy: list(input.updatedBy),
  // Restrict to these codes (the Filter via API demo's country picker); an
  // empty list means "no restriction", not "nothing".
  ...(list(input.codes).length ? { codes: list(input.codes) } : {}),
  sortBy: typeof input.sortBy === 'string' ? input.sortBy : '',
  // "asc" / "desc", or 1 / -1 (a table's `api.sort.orderValues`).
  sortDir: String(input.sortDir ?? 'asc'),
});

const pageResponse = (c: Context, input: Record<string, unknown>) => {
  try {
    const { rows, total } = countryService.getPage(pageInput(input));

    return c.json({
      data: rows,
      total,
      status: 200,
      success: true,
      message: 'Countries page retrieved successfully',
    });
  } catch (error) {
    return c.json({
      data: [],
      total: 0,
      status: 500,
      success: false,
      message: 'Failed to retrieve countries page',
    }, 500);
  }
};

countryRoutes.post('/collection/page', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return pageResponse(c, body ?? {});
});

// `queries()` keeps repeated keys (?updatedBy=a&updatedBy=b) as arrays.
countryRoutes.get('/collection/page', (c) => {
  const input = Object.fromEntries(Object.entries(c.req.queries()).map(([k, v]) => [k, v.length > 1 ? v : v[0]]));
  return pageResponse(c, input);
});

// Country detail by id - GET /collection/detail/:id
// Returns a SINGLE country object (not an array) for the state-loader demo.
countryRoutes.get('/collection/detail/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const country = countryService.getById(id);

    if (!country) {
      return c.json({
        data: null,
        status: 404,
        success: false,
        message: 'Country not found',
      }, 404);
    }

    return c.json({
      data: country,
      status: 200,
      success: true,
      message: 'Country detail retrieved successfully',
    });
  } catch (error) {
    return c.json({
      data: null,
      status: 500,
      success: false,
      message: 'Failed to retrieve country detail',
    }, 500);
  }
});

// Create country - matches existing API contract: POST /collection/create/691e9963992636eb1560eadb
countryRoutes.post('/collection/create/691e9963992636eb1560eadb', async (c) => {
  try {
    const body = await c.req.json();
    const { name, code } = body;
    
    if (!name || !code) {
      return c.json({
        data: null,
        status: 400,
        success: false,
        message: 'Name and code are required'
      }, 400);
    }
    
    const newCountry = countryService.create({ name, code });
    
    return c.json({
      data: [newCountry],
      status: 201,
      success: true,
      message: 'Country created successfully'
    }, 201);
  } catch (error) {
    return c.json({
      data: null,
      status: 500,
      success: false,
      message: 'Failed to create country'
    }, 500);
  }
});

// Update country - matches existing API contract: PATCH /collection/update/691e9963992636eb1560eadb/:id
countryRoutes.patch('/collection/update/691e9963992636eb1560eadb/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, code } = body;
    
    const updatedCountry = countryService.update(id, { name, code });
    
    if (!updatedCountry) {
      return c.json({
        data: null,
        status: 404,
        success: false,
        message: 'Country not found'
      }, 404);
    }
    
    return c.json({
      data: [updatedCountry],
      status: 200,
      success: true,
      message: 'Country updated successfully'
    });
  } catch (error) {
    return c.json({
      data: null,
      status: 500,
      success: false,
      message: 'Failed to update country'
    }, 500);
  }
});

// Delete country - matches existing API contract: DELETE /collection/delete/691e9963992636eb1560eadb/:id
countryRoutes.delete('/collection/delete/691e9963992636eb1560eadb/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const deleted = countryService.delete(id);
    
    if (!deleted) {
      return c.json({
        data: null,
        status: 404,
        success: false,
        message: 'Country not found'
      }, 404);
    }
    
    return c.json({
      data: null,
      status: 200,
      success: true,
      message: 'Country deleted successfully'
    });
  } catch (error) {
    return c.json({
      data: null,
      status: 500,
      success: false,
      message: 'Failed to delete country'
    }, 500);
  }
});