/**
 * Bundles `src/headless/index.ts` into `dist/headless.mjs` — the studio's
 * editing rules for Node, loaded by `gummy mcp` (see the grilled design
 * `mcp-server`). One self-contained ES module: the library is taken from its
 * React-free entry (`packages/ui/src/headless.ts`) instead of the React build,
 * and nothing is left external, so the CLI needs no React, router or studio
 * dependency at runtime. Runs after `vite build` (which empties `dist/`).
 *
 *   bun scripts/build-headless.ts
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const uiHeadless = join(root, '../../packages/ui/src/headless.ts')

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
        build.onResolve({ filter: /^@gummy-ui\/ui(\/headless)?$/ }, () => ({ path: uiHeadless }))
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
