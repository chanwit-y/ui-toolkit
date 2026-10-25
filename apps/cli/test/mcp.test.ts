import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

/*
 * `gummy mcp` end to end (see the grilled design `mcp-server`): the real CLI
 * as a stdio server in a temp app folder, driven by the SDK's client. Needs
 * the studio's headless bundle (`bun run --filter @gummy-ui/studio build:headless`).
 */

const bin = join(import.meta.dir, '../bin/gummy.mjs')
let app: string
let client: Client

const json = (r: unknown) => JSON.parse((r as { content: { text: string }[] }).content[0].text)

beforeAll(async () => {
  app = mkdtempSync(join(tmpdir(), 'gummy-mcp-'))
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'shop-admin' }))
  client = new Client({ name: 'test', version: '0' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [bin, 'mcp'], cwd: app, stderr: 'ignore' }))
})

afterAll(async () => {
  await client?.close()
  rmSync(app, { recursive: true, force: true })
})

describe('gummy mcp', () => {
  test('lists the tools, the guides and its instructions', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name)
    for (const n of ['get_workspace_summary', 'describe_item_type', 'add_item', 'update_item', 'batch', 'validate_project']) expect(names).toContain(n)
    const { resources } = await client.listResources()
    expect(resources.map((r) => r.uri)).toContain('gummy://guide/start')
    const start = await client.readResource({ uri: 'gummy://guide/start' })
    expect((start.contents[0] as { text: string }).text).toContain('start here')
    expect(client.getInstructions()).toContain('describe_item_type')
  })

  test('a read on a fresh folder writes nothing', async () => {
    const summary = json(await client.callTool({ name: 'get_workspace_summary', arguments: {} }))
    expect(summary.projects.map((p: { key: string }) => p.key)).toEqual(['shop-admin'])
    expect(existsSync(join(app, 'gummy/workspace.json'))).toBe(false)
  })

  test('a write saves the workspace and the runtime folder', async () => {
    const out = json(await client.callTool({ name: 'add_page', arguments: { project: 'shop-admin', name: 'Orders', path: '/orders' } }))
    expect(out.saved.written).toContain('gummy/workspace.json')
    expect(out.saved.written).toContain('gummy/projects/shop-admin/pages/orders.json')
    const ws = JSON.parse(readFileSync(join(app, 'gummy/workspace.json'), 'utf8'))
    expect(ws.version).toBe(53)
    expect(ws.state.projects[0].snapshot.pages.map((p: { key: string }) => p.key)).toEqual(['page1', 'orders'])
    const manifest = JSON.parse(readFileSync(join(app, 'gummy/projects/shop-admin/project.json'), 'utf8'))
    expect(manifest.pages.orders.src).toBe('pages/orders.json')
  })

  test('a refusal comes back as a tool error and changes nothing', async () => {
    const before = readFileSync(join(app, 'gummy/workspace.json'), 'utf8')
    const r = await client.callTool({ name: 'add_item', arguments: { project: 'shop-admin', page: 'orders', type: 'textfield', config: { dataType: 'colour' } } })
    expect(r.isError).toBe(true)
    expect((r.content as { text: string }[])[0].text).toContain('dataType')
    expect(readFileSync(join(app, 'gummy/workspace.json'), 'utf8')).toBe(before)
  })

  test('picks up a change made on disk by someone else', async () => {
    const file = join(app, 'gummy/workspace.json')
    const ws = JSON.parse(readFileSync(file, 'utf8'))
    ws.state.projects[0].description = 'edited in the studio'
    writeFileSync(file, JSON.stringify(ws, null, 2) + '\n')
    json(await client.callTool({ name: 'add_page', arguments: { project: 'shop-admin', name: 'Customers' } }))
    const after = JSON.parse(readFileSync(file, 'utf8'))
    expect(after.state.projects[0].description).toBe('edited in the studio')
    expect(after.state.projects[0].snapshot.pages.length).toBe(3)
  })
})
