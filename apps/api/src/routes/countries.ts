import { Hono } from 'hono';
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