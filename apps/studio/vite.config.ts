import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The monorepo root hoists shared deps (@dnd-kit, zustand, lucide-react) into
// the root node_modules, where they would resolve the root's React 18. Studio
// runs on its own React 19, so without forcing a single copy the app ends up
// with two Reacts and throws "Invalid hook call". Alias + dedupe pin every
// import to studio's local React 19.
const reactPath = fileURLToPath(
  new URL('./node_modules/react', import.meta.url),
)
const reactDomPath = fileURLToPath(
  new URL('./node_modules/react-dom', import.meta.url),
)
// Same story for react-router: the library's built output imports
// `react-router-dom` (a peer dep) which would resolve to the root's v6 copy,
// while studio runs v7 — two copies means the engine's `useNavigate` /
// `useParams` can't see studio's router. Pin it to studio's v7 (which pulls
// its own nested `react-router`; aliasing that one too would break its
// `react-router/dom` subpath export).
const reactRouterDomPath = fileURLToPath(
  new URL('./node_modules/react-router-dom', import.meta.url),
)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // The library's CoreProvider (pulled in for the Autocomplete2 live preview)
  // references `process.env.NODE_ENV` (react-query devtools gate). Browsers have
  // no `process`, so define it to keep that guard from throwing.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      react: reactPath,
      'react-dom': reactDomPath,
      'react-router-dom': reactRouterDomPath,
    },
  },
}))
