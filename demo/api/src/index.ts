/** Entry point: serves `createApp()` with Bun on `PORT` (default 9100). */
import { createApp } from './app.ts';

const port = Number(process.env.PORT) || 9100;
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
const app = createApp({ anchorDate: process.env.ANCHOR_DATE || undefined, publicUrl });

Bun.serve({ port, fetch: app.fetch });
console.log(`Book shop API on http://localhost:${port} (assets at ${publicUrl})`);
