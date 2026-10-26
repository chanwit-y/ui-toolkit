/**
 * Bundles `src/headless/index.ts` into `dist/headless.mjs` — the studio's
 * editing rules for Node, loaded by `gummy mcp` (see the grilled design
 * `mcp-server`). One self-contained ES module: the library is taken from its
 * React-free entry (`packages/ui/src/headless.ts`) and its API client instead
 * of the React build, and nothing is left external, so the CLI needs no React, router or studio
 * dependency at runtime (see `UI_SHIM`). Runs after `vite build` (which
 * empties `dist/`).
 *
 *   bun scripts/build-headless.ts
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ui = join(root, '../../packages/ui/src')

/**
 * What `@gummy-ui/ui` means inside the bundle: the library's React-free entry
 * plus the engine's API client (`test_endpoint` runs a request through it,
 * like the studio's Test run). The client's `ApiFactory` imports react-query
 * for its `.use()` hooks, which the headless side never calls — so
 * react-query resolves to a stub that throws if it ever is.
 */
const UI_SHIM = `
export * from ${JSON.stringify(join(ui, 'headless.ts'))}
export { ApiMaster } from ${JSON.stringify(join(ui, 'api/APIMaster.ts'))}
export { ApiFactory, HttpClientFactory } from ${JSON.stringify(join(ui, 'api/index.ts'))}
export { convertTModelToTypeBox, convertTModelToTArray } from ${JSON.stringify(join(ui, 'model/index.ts'))}
`
const REACT_QUERY_STUB = `
const headless = (name) => () => { throw new Error(name + ' is not available in the headless build') }
export const useQuery = headless('useQuery')
export const useMutation = headless('useMutation')
`

const result = await Bun.build({
  entrypoints: [join(root, 'src/headless/index.ts')],
  outdir: join(root, 'dist'),
  naming: 'headless.mjs',
  target: 'node',
  format: 'esm',
  minify: false,
  plugins: [
    {
      name: 'gummy-ui-headless',
      setup(build) {
        build.onResolve({ filter: /^@gummy-ui\/ui(\/headless)?$/ }, () => ({ path: 'ui', namespace: 'gummy-shim' }))
        build.onResolve({ filter: /^@tanstack\/react-query$/ }, () => ({ path: 'react-query', namespace: 'gummy-shim' }))
        build.onLoad({ filter: /.*/, namespace: 'gummy-shim' }, (args) => ({
          contents: args.path === 'ui' ? UI_SHIM : REACT_QUERY_STUB,
          loader: 'js',
        }))
      },
    },
  ],
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
const out = result.outputs[0]
const text = await out.text()
// The bundle must stay React-free and browser-free: the MCP runs in plain Node.
const forbidden = [/from\s+["']react(-dom)?["']/, /from\s+["']react-router-dom["']/, /import\.meta\.env/]
const hit = forbidden.find((re) => re.test(text))
if (hit) {
  console.error(`dist/headless.mjs must not reference ${hit} — something in src/headless imports a store or a component.`)
  process.exit(1)
}
console.log(`wrote dist/headless.mjs (${Math.round(out.size / 1024)} KB)`)
