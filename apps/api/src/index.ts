import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { countryRoutes } from './routes/countries.js';

const app = new Hono();
const PORT = Number(process.env.PORT) || 3001;

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:3200', 'http://localhost:3000'],
  credentials: true
}));

// Routes
app.route('/', countryRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'API server is running' });
});

console.log(`🚀 API server running on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT
});