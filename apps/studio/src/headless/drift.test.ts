import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMPONENT_TYPES } from '../components/Layout/componentMeta'
import { createItem } from '../components/Layout/canvasCommands'
import { defaultContainerSettings, type GridItemData } from '../components/Layout/types'
import { GUIDES, PENDING_GUIDES } from './guides'
import { ITEM_TYPES } from './itemTypes'
import { assertMatches, hasSchema } from './schemas'
import { SCHEMA_ROOTS } from './schemaRoots'
import { TOOLS } from './tools'
import { newWorkspace, readWorkspace } from './workspaceFile'
import generated from './schemas.generated.json'

/*
 * The "a studio feature isn't done until the MCP knows it" checks (see the
 * grilled design `mcp-server`). A failure here names what a new feature still
 * needs: a schema root, a registry entry, a guide (or a pending entry), or a
 * schema that matches what the studio actually stores.
 */

const studioRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('item type registry', () => {
  test('every config type has a generated schema and is a schema root', () => {
    const roots = new Set(SCHEMA_ROOTS.flatMap((r) => r.types))
    for (const type of COMPONENT_TYPES) {
      const { configType } = ITEM_TYPES[type]
      if (!configType) continue
      expect({ type, configType, root: roots.has(configType) }).toEqual({ type, configType, root: true })
      expect({ type, configType, generated: hasSchema(configType) }).toEqual({ type, configType, generated: true })
    }
  })

  test('every type’s defaults (what add_item creates) match its schema', () => {
    for (const type of COMPONENT_TYPES) {
      const { item } = createItem(type, { fieldSeq: 0, columns: defaultContainerSettings.columns })
      const { configType } = ITEM_TYPES[type]
      if (configType) expect(() => assertMatches(configType, item.config, `${type}.config`)).not.toThrow()
      else expect(item.config).toBeUndefined()
      expect(() => assertMatches('GridItemSettings', item.settings, `${type}.settings`)).not.toThrow()
      // The canvas labels line up with the canvases the item is created with.
      expect(ITEM_TYPES[type].canvases(item).length).toBe(item.childCanvases?.length ?? 0)
    }
  })

  test('every guide a type names exists, or is still pending', () => {
    for (const type of COMPONENT_TYPES) {
      const topic = ITEM_TYPES[type].guide
      expect({ type, topic, known: topic in GUIDES || PENDING_GUIDES.has(topic) }).toEqual({ type, topic, known: true })
    }
  })

  test('every guide file is served (registered in guides.ts)', () => {
    const dir = join(studioRoot, 'src/headless/guides')
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3).split('\\').join('/'))
    expect(files.sort()).toEqual(Object.keys(GUIDES).sort())
  })

  test('the pending list only shrinks: nothing pending is written already, nothing pending is unused', () => {
    const used = new Set(COMPONENT_TYPES.map((t) => ITEM_TYPES[t].guide))
    for (const topic of PENDING_GUIDES) {
      expect({ topic, written: topic in GUIDES }).toEqual({ topic, written: false })
      expect({ topic, used: used.has(topic) }).toEqual({ topic, used: true })
    }
  })
})

describe('schemas', () => {
  test('schemas.generated.json is up to date with the TypeScript types', () => {
    const r = spawnSync(process.execPath, ['scripts/gen-schemas.ts', '--check'], { cwd: studioRoot, encoding: 'utf8' })
    expect(r.stderr + r.stdout).toContain('up to date')
    expect(r.status).toBe(0)
  }, 30000)

  test('no generated schema is an empty object (a type the generator could not follow)', () => {
    const found: string[] = []
    const walk = (node: unknown, at: string) => {
      if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${at}[${i}]`))
      if (!node || typeof node !== 'object') return
      const o = node as Record<string, unknown>
      if (o.type === 'object' && o.properties && Object.keys(o.properties).length === 0 && !('additionalProperties' in o)) found.push(at)
      for (const [k, v] of Object.entries(o)) walk(v, `${at}.${k}`)
    }
    for (const [name, schema] of Object.entries((generated as { definitions: Record<string, unknown> }).definitions)) walk(schema, name)
    // Spell such a type out in the studio (see `AccentColor`) so the schema can list its values.
    expect(found).toEqual([])
  })

  test('every item in the Book shop workspace matches its schema', () => {
    const ws = readWorkspace(readFileSync(join(studioRoot, '../../demo/gummy/workspace.json'), 'utf8'))
    const failures: string[] = []
    const walk = (items: GridItemData[], at: string) => {
      for (const item of items) {
        const { configType } = ITEM_TYPES[item.type]
        try {
          if (configType) assertMatches(configType, item.config, `${at}/${item.id}`)
          assertMatches('GridItemSettings', item.settings, `${at}/${item.id}.settings`)
        } catch (err) {
          failures.push((err as Error).message)
        }
        item.childCanvases?.forEach((c, i) => walk(c.items, `${at}/${item.id}[${i}]`))
      }
    }
    for (const p of ws.projects) for (const pg of p.snapshot.pages) walk(pg.grid.items, `${p.name}/${pg.key}`)
    expect(failures).toEqual([])
  })
})

/**
 * Every field a project snapshot or the shared library stores, and the tool
 * that edits it. A new field fails here until it is mapped — the MCP must
 * learn to author it (or this table must say which tool already does).
 */
const SNAPSHOT_TOOLS: Record<string, string> = {
  pages: 'add_page',
  menu: 'update_menu',
  shell: 'update_shell',
  env: 'set_env',
  theme: 'update_theme',
  endpointIds: 'attach_endpoints',
  globalLoads: 'upsert_load',
  customActions: 'upsert_custom_action',
  customComponents: 'upsert_custom_component',
  authId: 'set_project_auth',
}
const LIBRARY_TOOLS: Record<string, string> = {
  groups: 'upsert_model',
  models: 'upsert_model',
  endpoints: 'upsert_endpoint',
  templates: 'save_as_template',
  auth: 'upsert_auth',
}

describe('tools', () => {
  test('every project snapshot and library field has a tool', () => {
    const names = new Set(TOOLS.map((t) => t.name))
    const demo = readWorkspace(readFileSync(join(studioRoot, '../../demo/gummy/workspace.json'), 'utf8'))
    const fresh = newWorkspace('x')
    const snapshotKeys = new Set([...demo.projects, ...fresh.projects].flatMap((p) => Object.keys(p.snapshot)))
    for (const key of snapshotKeys) expect({ key, tool: SNAPSHOT_TOOLS[key] && names.has(SNAPSHOT_TOOLS[key]) }).toEqual({ key, tool: true })
    for (const key of new Set([...Object.keys(demo.library), ...Object.keys(fresh.library)]))
      expect({ key, tool: LIBRARY_TOOLS[key] && names.has(LIBRARY_TOOLS[key]) }).toEqual({ key, tool: true })
  })

  test('names are unique and every input schema is an object schema', () => {
    const names = TOOLS.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const t of TOOLS) expect((t.inputSchema as { type?: string }).type).toBe('object')
  })
})
