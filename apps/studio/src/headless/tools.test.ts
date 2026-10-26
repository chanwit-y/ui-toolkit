import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WorkspaceData } from '../components/Workspace/types'
import { migrateWorkspace } from '../components/Workspace/migrate'
import { ToolError } from './errors'
import { runTool } from './tools'
import { changedFolders, newWorkspace, readWorkspace, writeWorkspace } from './workspaceFile'

/*
 * The scenario test of the grilled design `mcp-server`: build a small project
 * through the tool handlers exactly as a client would, then check the runtime
 * document validates and the workspace survives the studio's own load.
 */

const studioRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** Run a tool; on a write, carry the saved workspace forward. */
function make(initial: WorkspaceData) {
  let ws = initial
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const run = await runTool(ws, name, args)
    if (run.workspace) ws = run.workspace
    return run.output as Record<string, unknown> & { result?: unknown }
  }
  return { call, get ws() { return ws } }
}

const COLUMN = {
  enableSorting: false, enableColumnFilter: false, align: 'start', useDateFormat: '', pin: '', html: '', sortField: '',
  lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', size: '', minSize: '', maxSize: '', resizable: true,
}

describe('building a CRUD page through the tools', () => {
  const t = make(newWorkspace('Book store'))

  test('library: models and endpoints by name', async () => {
    await t.call('upsert_model', { name: 'book', fields: [{ name: '_id', kind: 'string' }, { name: 'title', kind: 'string' }, { name: 'price', kind: 'number' }] })
    await t.call('upsert_model', { name: 'bookList', fields: [{ name: 'data', kind: 'array', arrayOf: 'object', children: [{ name: '_id', kind: 'string' }, { name: 'title', kind: 'string' }] }] })
    await t.call('upsert_model', { name: 'bookIdParams', fields: [{ name: 'id', kind: 'string' }] })
    await t.call('upsert_endpoint', { name: 'listBooks', method: 'GET', url: '/api/books', response: 'bookList', group: 'Books' })
    await t.call('upsert_endpoint', { name: 'createBook', method: 'POST', url: '/api/books', body: 'book', group: 'Books' })
    const out = await t.call('upsert_endpoint', { name: 'updateBook', method: 'PATCH', url: '/api/books/:id', parameter: 'bookIdParams', body: 'book', group: 'Books' })
    expect(out.changes).toEqual(['+ endpoint updateBook'])
    expect(t.ws.library.groups.map((g) => g.name)).toEqual(['Books'])
    const lib = await t.call('get_library', { kind: 'endpoints' }) as unknown as { endpoints: { name: string; body: string | null }[] }
    expect(lib.endpoints.find((e) => e.name === 'updateBook')?.body).toBe('book')
  })

  test('a page with a table, its modal form and buttons in one batch', async () => {
    await t.call('add_page', { project: 'book-store', name: 'Books', path: '/books' })
    const out = await t.call('batch', {
      operations: [
        {
          tool: 'add_item',
          input: {
            project: 'book-store', page: 'books', type: 'datatable',
            config: {
              name: 'books', title: 'Books', endpointId: 'listBooks', apiPaths: 'data', canEdit: true, canAdd: true,
              columns: [{ ...COLUMN, id: 'c-title', accessor: 'title', header: 'Title' }],
            },
          },
        },
        { tool: 'add_item', input: { project: 'book-store', page: 'books', type: 'hidden', parent: { item: '$1.id', canvas: 0 }, config: { name: '_id' } } },
        { tool: 'add_item', input: { project: 'book-store', page: 'books', type: 'textfield', parent: { item: 'books', canvas: 0 }, config: { name: 'title', label: 'Title', isRequired: true } } },
        {
          tool: 'add_item',
          input: {
            project: 'book-store', page: 'books', type: 'button', parent: { item: 'books', canvas: 0 }, showWhen: 'adding',
            config: { label: 'Create', actions: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'], endpointId: 'createBook', reloadTableItemId: 'books' },
          },
        },
        {
          tool: 'add_item',
          input: {
            project: 'book-store', page: 'books', type: 'button', parent: { item: 'books', canvas: 0 }, showWhen: 'editing',
            config: { label: 'Save', actions: ['StartLoading', 'SubmitFormToPatchAPI', 'StopLoading', 'CloseModal'], endpointId: 'updateBook', reloadTableItemId: 'books' },
          },
        },
      ],
    })
    // Referencing library endpoints attached them to the project.
    expect(out.notes).toBeDefined()
    expect(t.ws.projects[0].snapshot.endpointIds.length).toBe(3)

    const page = await t.call('get_page', { project: 'book-store', page: '/books' }) as unknown as { items: { type: string; canvases: { items: { type: string; showWhen?: string }[] }[] }[] }
    const table = page.items[0]
    expect(table.type).toBe('datatable')
    expect(table.canvases[0].items.map((i) => i.type)).toEqual(['hidden', 'textfield', 'button', 'button'])
    expect(table.canvases[0].items.map((i) => i.showWhen ?? '')).toEqual(['', '', 'adding', 'editing'])

    // Names were stored as ids.
    const save = t.ws.projects[0].snapshot.pages[1].grid.items[0].childCanvases![0].items[3].config as { endpointId: string; reloadTableItemId: string }
    expect(save.endpointId).toBe(t.ws.library.endpoints.find((e) => e.name === 'updateBook')!.id)
    expect(save.reloadTableItemId).toBe(t.ws.projects[0].snapshot.pages[1].grid.items[0].id)
  })

  test('the project validates and exports the table wired to its endpoint', async () => {
    const report = await t.call('validate_project', { project: 'book-store' }) as unknown as { ok: boolean; errors: string[]; warnings: string[] }
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
    const doc = await t.call('export_project', { project: 'book-store' }) as unknown as { api: Record<string, unknown>; pages: Record<string, unknown> }
    expect(Object.keys(doc.api).sort()).toEqual(['createBook', 'listBooks', 'updateBook'])
    expect(JSON.stringify(doc.pages.books)).toContain('"listBooks"')
  })

  test('the saved workspace round-trips through the studio’s own load', async () => {
    const text = writeWorkspace(t.ws)
    const again = readWorkspace(text)
    expect(again).toEqual(t.ws)
    expect(migrateWorkspace(JSON.parse(text).state)).not.toBeNull()
    expect(Object.keys(changedFolders(null, t.ws))).toEqual(['book-store'])
  })
})

describe('refusals and guards', () => {
  const t = make(newWorkspace('App'))

  test('a config patch is checked against the schema', async () => {
    await expect(runTool(t.ws, 'add_item', { project: 'app', page: 'page1', type: 'textfield', config: { dataType: 'colour' } })).rejects.toThrow(ToolError)
    await expect(runTool(t.ws, 'add_item', { project: 'app', page: 'page1', type: 'textfield', config: { nope: 1 } })).rejects.toThrow(/nope/)
  })

  test('an unknown reference name is refused with its path', async () => {
    await expect(runTool(t.ws, 'add_item', { project: 'app', page: 'page1', type: 'button', config: { endpointId: 'missing' } })).rejects.toThrow(/config\.endpointId: no endpoint "missing"/)
  })

  test('form fields are refused inside a repeater template', async () => {
    const r = await t.call('add_item', { project: 'app', page: 'page1', type: 'repeater' }) as { result: { id: string } }
    await expect(runTool(t.ws, 'add_item', { project: 'app', page: 'page1', type: 'textfield', parent: { item: r.result.id, canvas: 0 } })).rejects.toThrow(/repeater/)
    await expect(runTool(t.ws, 'add_item', { project: 'app', page: 'page1', type: 'typography', parent: { item: r.result.id, canvas: 0 } })).resolves.toBeDefined()
  })

  test('tabs keep their canvases aligned', async () => {
    const tab = await t.call('add_item', { project: 'app', page: 'page1', type: 'tab' }) as { result: { id: string; canvases: unknown[] } }
    const n = tab.result.canvases.length
    await expect(runTool(t.ws, 'update_item', { project: 'app', page: 'page1', item: tab.result.id, config: { tabs: [{ label: 'Only', value: 'only' }] } })).rejects.toThrow(/add_tab/)
    const added = await t.call('add_tab', { project: 'app', page: 'page1', item: tab.result.id, label: 'Extra' }) as { result: { canvases: unknown[] } }
    expect(added.result.canvases.length).toBe(n + 1)
  })

  test('a dry run reports and saves nothing; a failing batch changes nothing', async () => {
    const before = t.ws
    const dry = await runTool(before, 'add_page', { project: 'app', name: 'Draft', dryRun: true })
    expect(dry.workspace).toBeNull()
    expect((dry.output as { changes: string[] }).changes[0]).toContain('+ page (App) draft')
    await expect(
      runTool(before, 'batch', { operations: [{ tool: 'add_page', input: { project: 'app', name: 'Ok' } }, { tool: 'add_item', input: { project: 'app', page: 'ok', type: 'nope' } }] }),
    ).rejects.toThrow(/operations\[1\]/)
    expect(t.ws).toBe(before)
  })

  test('deletes need confirm', async () => {
    await t.call('add_page', { project: 'app', name: 'Spare' })
    const preview = await runTool(t.ws, 'delete_page', { project: 'app', page: 'spare' })
    expect((preview.output as { result: { confirmRequired: boolean } }).result.confirmRequired).toBe(true)
    expect(preview.workspace).toBeNull()
    const done = await runTool(t.ws, 'delete_page', { project: 'app', page: 'spare', confirm: true })
    expect(done.workspace?.projects[0].snapshot.pages.some((p) => p.key === 'spare')).toBe(false)
  })

  test('a newer workspace is refused, an older one migrated', async () => {
    const text = writeWorkspace(t.ws)
    expect(() => readWorkspace(text.replace('"version": 53', '"version": 99'))).toThrow(/newer studio/)
    const demo = readFileSync(join(studioRoot, '../../demo/gummy/workspace.json'), 'utf8')
    expect(readWorkspace(demo).projects.length).toBeGreaterThan(0)
  })
})
