import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { countryRoutes } from './routes/countries.js';
import { uploadRoutes } from './routes/upload.js';

const app = new Hono();
const PORT = Number(process.env.PORT) || 9000;

// CORS middleware — allow localhost and LAN dev origins (Vite host: true)
app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return 'http://localhost:3200';
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return origin;
    if (/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return origin;
    return 'http://localhost:3200';
  },
  credentials: true,
}));

// Routes
app.route('/', countryRoutes);
app.route('/', uploadRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'API server is running' });
});

console.log(`🚀 API server running on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT
});