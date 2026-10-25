import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
import { readWorkspace } from './workspaceFile'

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

describe('tools', () => {
  test('names are unique and every input schema is an object schema', () => {
    const names = TOOLS.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const t of TOOLS) expect((t.inputSchema as { type?: string }).type).toBe('object')
  })
})
