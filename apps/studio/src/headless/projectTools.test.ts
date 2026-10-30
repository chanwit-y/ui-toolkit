import { afterAll, describe, expect, test } from 'bun:test'
import type { WorkspaceData } from '../components/Workspace/types'
import { runTool } from './tools'
import { newWorkspace, readWorkspace, writeWorkspace } from './workspaceFile'

/*
 * Phase 2 of the grilled design `mcp-server`: the project settings beside the
 * pages (menu, shell, theme, env, loads, custom declarations, sign-in), the
 * templates and `test_endpoint`, driven through `runTool` like a client.
 */

function make(initial: WorkspaceData) {
  let ws = initial
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const run = await runTool(ws, name, args)
    if (run.workspace) ws = run.workspace
    return run.output as Record<string, unknown> & { result?: unknown; notes?: string[] }
  }
  return { call, get ws() { return ws } }
}

// A tiny API for test_endpoint: GET /api/books/:id answers one book.
const server = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url)
    const m = /^\/api\/books\/([^/]+)$/.exec(url.pathname)
    if (m) return Response.json({ data: { _id: m[1], title: 'Dune', price: 12 } })
    return new Response('not found', { status: 404 })
  },
})
afterAll(() => server.stop(true))

describe('project settings through the tools', () => {
  const t = make(newWorkspace('Shop'))
  const P = { project: 'shop' }

  test('library + pages to point at', async () => {
    await t.call('upsert_model', { name: 'book', fields: [{ name: '_id', kind: 'string' }, { name: 'title', kind: 'string' }, { name: 'price', kind: 'number' }] })
    await t.call('upsert_model', { name: 'bookRes', fields: [{ name: 'data', kind: 'object', children: [{ name: '_id', kind: 'string' }, { name: 'title', kind: 'string' }, { name: 'price', kind: 'number' }] }] })
    await t.call('upsert_model', { name: 'bookId', fields: [{ name: 'id', kind: 'string' }] })
    await t.call('upsert_endpoint', { name: 'getBook', method: 'GET', url: '/api/books/:id', parameter: 'bookId', response: 'bookRes' })
    const root = await t.call('add_page', { ...P, name: 'Landing', path: '/' })
    expect(root.notes?.join(' ')).toContain('cannot claim "/"')
    await t.call('delete_page', { ...P, page: 'landing', confirm: true })
    await t.call('add_page', { ...P, name: 'Books', path: '/books' })
    await t.call('add_page', { ...P, name: 'Book', path: '/books/:id' })
  })

  test('menu: page links by key, a group, a divider; a missing :param is noted', async () => {
    const out = await t.call('update_menu', {
      ...P,
      menu: [
        { kind: 'page', label: 'Books', icon: 'bookOpen', page: 'books' },
        { kind: 'group', label: 'More', items: [{ kind: 'page', page: '/books/:id' }, { kind: 'link', label: 'Docs', href: 'https://example.com' }] },
        { kind: 'divider' },
      ],
    })
    const menu = t.ws.projects[0].snapshot.menu
    expect(menu.map((m) => m.kind)).toEqual(['page', 'group', 'divider'])
    const books = t.ws.projects[0].snapshot.pages.find((p) => p.key === 'books')!
    expect(menu[0].kind === 'page' && menu[0].navigate.pageId).toBe(books.id)
    expect(out.notes?.join(' ')).toContain(':id')
    await expect(runTool(t.ws, 'update_menu', { ...P, menu: [{ kind: 'group', items: [{ kind: 'group', items: [] }] }] })).rejects.toThrow(/one level/)
  })

  test('shell and theme are schema-checked patches', async () => {
    await t.call('update_shell', { ...P, shell: { navigation: 'top', appBar: { title: 'Shop', variant: 'accent' }, sidebar: { variant: 'pill' } } })
    expect(t.ws.projects[0].snapshot.shell.appBar.title).toBe('Shop')
    expect(t.ws.projects[0].snapshot.shell.sidebar.variant).toBe('pill')
    await expect(runTool(t.ws, 'update_shell', { ...P, shell: { navigation: 'bottom' } })).rejects.toThrow(/navigation/)
    await t.call('update_theme', { ...P, theme: { accentColor: 'iris', radius: 'large' } })
    expect(t.ws.projects[0].snapshot.theme.accentColor).toBe('iris')
    await expect(runTool(t.ws, 'update_theme', { ...P, theme: { accentColor: 'neon' } })).rejects.toThrow(/accentColor/)
  })

  test('env vars: set, remove, locked rows stay', async () => {
    await t.call('set_env', { ...P, vars: { API_URL: `http://localhost:${server.port}`, FEATURE_X: 'on' } })
    await t.call('set_env', { ...P, vars: { FEATURE_X: null } })
    expect(t.ws.projects[0].snapshot.env.map((v) => v.name)).toEqual(['API_URL'])
    await expect(runTool(t.ws, 'set_env', { ...P, vars: { API_URL: null } })).rejects.toThrow(/locked/)
  })

  test('loads: a page load reading the URL, a global load, chaining by key', async () => {
    const out = await t.call('upsert_load', { ...P, page: 'book', key: 'book', endpoint: 'getBook', params: { id: { type: 'url', key: 'id', source: 'param' } }, paths: 'data', loading: 'skeleton' })
    expect((out.result as { read: { endpointId: string } }).read.endpointId).toBe(t.ws.library.endpoints[0].id)
    // The endpoint was attached because the load referenced it.
    expect(t.ws.projects[0].snapshot.endpointIds).toEqual([t.ws.library.endpoints[0].id])
    const global = await t.call('upsert_load', { ...P, key: 'featured', endpoint: 'getBook', params: { id: { type: 'value', value: 'b1' } } })
    expect(global.notes).toBeUndefined()
    // A second page load chained on the first, by its key.
    await t.call('upsert_load', { ...P, page: 'book', key: 'again', endpoint: 'getBook', params: { id: { type: 'state', key: 'book', path: '_id' } } })
    const loads = t.ws.projects[0].snapshot.pages.find((p) => p.key === 'book')!.loads!
    expect(loads[1].read.params.id).toEqual({ type: 'state', key: loads[0].id, path: '_id' })
    // A typography bound to the load by its key.
    await t.call('add_item', { ...P, page: 'book', type: 'typography', config: { binding: { source: 'state', key: 'book', path: 'title' } } })
    const v = (await t.call('validate_project', P)) as unknown as { ok: boolean; warnings: string[] }
    expect(v.ok).toBe(true)
    expect(v.warnings).toEqual([])
  })

  test('custom action and component declarations', async () => {
    await t.call('upsert_custom_action', { ...P, name: 'printOrder', description: 'Opens the print dialog' })
    await expect(runTool(t.ws, 'upsert_custom_action', { ...P, name: '2bad' })).rejects.toThrow(/identifier/)
    await t.call('upsert_custom_component', { ...P, name: 'SalesChart', props: [{ key: 'months', kind: 'number', defaultValue: '6' }] })
    await t.call('add_item', { ...P, page: 'books', type: 'custom', component: 'SalesChart' })
    await t.call('add_item', { ...P, page: 'books', type: 'button', config: { label: 'Print', actions: ['fn:printOrder'] } })
    const doc = (await t.call('export_project', P)) as unknown as { customActions: string[]; customComponents: { name: string }[]; pages: Record<string, unknown> }
    expect(doc.customActions).toEqual(['printOrder'])
    expect(doc.customComponents.map((c) => c.name)).toEqual(['SalesChart'])
    expect(JSON.stringify(doc.pages.books)).toContain('fn:printOrder')
    const preview = await t.call('delete_custom_action', { ...P, action: 'printOrder' })
    expect((preview.result as { stillReferenced: boolean }).stillReferenced).toBe(true)
  })

  test('sign-in: a shared entry with a profile endpoint, picked by the project', async () => {
    await t.call('upsert_auth', { name: 'Shop Azure', auth: { devValues: { tenantId: 't-1' }, profile: { enabled: true, read: { endpointId: 'getBook' }, paths: 'data' } } })
    expect(t.ws.library.auth![0].profile.read.endpointId).toBe(t.ws.library.endpoints[0].id)
    await t.call('set_project_auth', { ...P, auth: 'Shop Azure' })
    const snap = t.ws.projects[0].snapshot
    expect(snap.authId).toBe(t.ws.library.auth![0].id)
    expect(snap.env.find((v) => v.name === 'AZURE_TENANT_ID')).toMatchObject({ value: 't-1', locked: true })
    await t.call('set_project_auth', { ...P, auth: null })
    expect(t.ws.projects[0].snapshot.env.find((v) => v.name === 'AZURE_TENANT_ID')?.locked).toBe(false)
  })

  test('templates: save a page, insert it elsewhere with fresh ids', async () => {
    const saved = await t.call('save_as_template', { ...P, page: 'books', name: 'Books block' })
    const list = (await t.call('list_templates')) as unknown as { name: string }[]
    expect(list.some((x) => x.name === 'Books block')).toBe(true)
    await t.call('insert_template', { ...P, page: 'book', template: (saved.result as { id: string }).id })
    const book = t.ws.projects[0].snapshot.pages.find((p) => p.key === 'book')!
    const books = t.ws.projects[0].snapshot.pages.find((p) => p.key === 'books')!
    const ids = new Set(books.grid.items.map((i) => i.id))
    expect(book.grid.items.filter((i) => i.type === 'custom').every((i) => !ids.has(i.id))).toBe(true)
  })

  test('test_endpoint calls the API through the engine client and checks the model', async () => {
    const ok = (await t.call('test_endpoint', { endpoint: 'getBook', project: 'shop', parameter: { id: 'b7' } })) as unknown as { ok: boolean; status: number; matchesResponseModel: boolean; body: { _id: string } }
    expect(ok.ok).toBe(true)
    expect(ok.status).toBe(200)
    expect(ok.matchesResponseModel).toBe(true)
    await expect(runTool(t.ws, 'test_endpoint', { endpoint: 'getBook', apiUrl: '/api' })).rejects.toThrow(/relative/)
  })

  test('activity lines are written as the MCP and the workspace round-trips', async () => {
    const lines = (await t.call('get_activity', { limit: 100 })) as unknown as { user: string; kind: string }[]
    expect(lines.length).toBeGreaterThan(5)
    expect(lines.every((l) => l.user === 'Claude (MCP)')).toBe(true)
    expect(readWorkspace(writeWorkspace(t.ws))).toEqual(t.ws)
  })
})

describe('logic through the tools', () => {
  const t = make(newWorkspace('Orders'))
  const P = { project: 'orders' }
  const result = async (name: string, args: Record<string, unknown>) => (await t.call(name, args)).result

  test('saved formulas and rules from Code-mode text, used by items, exported by name', async () => {
    await t.call('add_page', { ...P, name: 'Order', path: '/order' })
    const sub = (await result('upsert_formula', { ...P, name: 'Subtotal', expr: '[qty] * [unitPrice]' })) as unknown as { id: string; expr: unknown }
    expect(sub.expr).toEqual({ op: '*', args: [{ ref: 'field', key: 'qty' }, { ref: 'field', key: 'unitPrice' }] })
    await t.call('upsert_rule', {
      ...P,
      name: 'Discount rate',
      resultType: 'number',
      format: { type: 'percent', decimals: 0 },
      rule: { branches: [{ when: '((Subtotal)) >= 10000', then: '10%' }, { when: '((Subtotal)) >= 5000', then: '5%' }], else: '0' },
    })
    await t.call('upsert_rule', { ...P, name: 'Is business', resultType: 'boolean', rule: { branches: [{ when: "[type] = 'Business'", then: 'TRUE' }], else: 'FALSE' } })
    await t.call('upsert_formula', { ...P, name: 'Total', expr: '((Subtotal)) * (1 - IF((Discount rate))) * 1.07', format: 'currency' })

    const field = (name: string, extra: Record<string, unknown> = {}) => t.call('add_item', { ...P, page: 'order', type: 'textfield', config: { name, label: name }, ...extra })
    await field('qty')
    await field('unitPrice')
    await field('subtotal', { valueFormula: '((Subtotal))', valueMode: 'computed' })
    await field('company', { condition: 'IF((Is business))' })
    await field('code', { enabledWhen: '((Subtotal)) >= 5000' })
    const bad = await t.call('add_item', { ...P, page: 'order', type: 'textfield', config: { name: 'x' }, condition: '[a] = ((Nope))' }).catch((e) => e)
    expect(String((bad as Error).message)).toContain('Nope')

    const report = (await t.call('validate_project', P)) as unknown as { ok: boolean; errors: string[] }
    expect(report.errors).toEqual([])
    const doc = (await t.call('export_project', P)) as unknown as { formulas: Record<string, unknown>; rules: Record<string, { rule: { branches: { then: unknown }[] } }>; pages: Record<string, { containers: { bins: { condition?: unknown; element?: Record<string, unknown> }[] }[] }> }
    expect(Object.keys(doc.formulas)).toEqual(['Subtotal', 'Total'])
    expect(doc.rules['Discount rate'].rule.branches[1].then).toEqual({ lit: 0.05 })
    const bins = doc.pages.order.containers[0].bins
    expect(bins[2].element?.value).toEqual({ type: 'formula', key: 'none', formula: 'Subtotal' })
    expect(bins[3].condition).toEqual({ rule: 'Is business' })
    expect(bins[4].element?.enabledWhen).toEqual({ cmp: 'gte', left: { formula: 'Subtotal' }, right: { lit: 5000 } })
  })

  test('a used item reports its users before delete; a number rule is no condition', async () => {
    const pending = (await result('delete_formula', { ...P, formula: 'Subtotal' })) as unknown as { confirmRequired: boolean; stillUsedBy: string[] }
    expect(pending.confirmRequired).toBe(true)
    expect(pending.stillUsedBy).toContain('page Order')
    expect(pending.stillUsedBy).toContain('rule Discount rate')
    const item = t.ws.projects[0].snapshot.pages.find((p) => p.key === 'order')!.grid.items[3]
    await t.call('update_item', { ...P, page: 'order', item: item.id, condition: 'IF((Discount rate))' })
    const report = (await t.call('validate_project', P)) as unknown as { errors: string[] }
    expect(report.errors.join(' ')).toContain('gives number, not true / false')
  })
})
