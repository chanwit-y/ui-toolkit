/**
 * Generates `src/headless/schemas.generated.json` — the JSON Schema of every
 * studio config type the `gummy mcp` tools accept (see the grilled design
 * `mcp-server`): one `definitions` map, generated from the TypeScript types
 * themselves (JSDoc → descriptions), so a new field reaches the MCP with no
 * hand edit. Run by `bun run build` (before the headless bundle) and checked
 * by `src/headless/schemas.test.ts`.
 *
 *   bun scripts/gen-schemas.ts [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGenerator } from 'ts-json-schema-generator'
import { SCHEMA_ROOTS } from '../src/headless/schemaRoots'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'src/headless/schemas.generated.json')

const definitions: Record<string, unknown> = {}
for (const { file, types } of SCHEMA_ROOTS) {
  const generator = createGenerator({
    path: join(root, file),
    tsconfig: join(root, 'tsconfig.app.json'),
    skipTypeCheck: true,
    expose: 'export',
    jsDoc: 'extended',
    topRef: true,
    additionalProperties: false,
  })
  for (const type of types) {
    const schema = generator.createSchema(type) as { definitions?: Record<string, unknown> }
    Object.assign(definitions, schema.definitions ?? {})
  }
}
const sorted = Object.fromEntries(Object.keys(definitions).sort().map((k) => [k, definitions[k]]))
const text = JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', definitions: sorted }, null, 2) + '\n'

if (process.argv.includes('--check')) {
  const current = (() => {
    try {
      return readFileSync(out, 'utf8')
    } catch {
      return ''
    }
  })()
  if (current !== text) {
    console.error('schemas.generated.json is stale — run `bun scripts/gen-schemas.ts`.')
    process.exit(1)
  }
  console.log('schemas.generated.json is up to date')
} else {
  writeFileSync(out, text)
  console.log(`wrote ${Object.keys(sorted).length} definitions to src/headless/schemas.generated.json`)
}
