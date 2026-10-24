import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertGummyProject, type GummyPageBody, type GummyProject } from '@gummy-ui/ui'
import { bookshopFolders, bookshopWorkspace, bookshopWorkspaceFile, BOOKSHOP_KEY } from './project'

/**
 * The Book shop demo's workspace (see the grilled design `bookshop-demo`):
 * generated the same every run, a valid project whose references all
 * resolve, and a `workspace.json` the studio opens without changing it.
 */

const demoGummy = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', 'demo', 'gummy')

/** Every value under `key` anywhere in a config tree. */
function collect(node: unknown, pick: (obj: Record<string, unknown>) => unknown[], out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) node.forEach((n) => collect(n, pick, out))
  else if (node && typeof node === 'object') {
    out.push(...pick(node as Record<string, unknown>))
    Object.values(node).forEach((v) => collect(v, pick, out))
  }
  return out
}

/** The endpoint names, navigate targets and custom names a project's pages use. */
function references(project: GummyProject, bodies: GummyPageBody[]) {
  const tree = [bodies, project.auth, project.menu]
  const apiNames = collect(tree, (o) => {
    const api = o.api as { name?: unknown } | undefined
    return api && typeof api === 'object' && typeof api.name === 'string' ? [api.name] : []
  })
  const crud = collect(tree, (o) => (o.apiCrud && typeof o.apiCrud === 'object' ? Object.values(o.apiCrud as Record<string, { name?: string }>).map((r) => r?.name) : []))
  const pages = collect(tree, (o) => {
    const target = (o.navigate ?? o.rowNavigate ?? o.itemNavigate) as { page?: unknown } | undefined
    return target && typeof target === 'object' && typeof target.page === 'string' ? [target.page] : []
  })
  const components = collect(tree, (o) => (o.type === 'custom' && o.element && typeof o.element === 'object' ? [(o.element as { component?: string }).component] : []))
  const actions = collect(tree, (o) =>
    Array.isArray(o.actions) ? (o.actions as unknown[]).filter((a): a is string => typeof a === 'string' && a.startsWith('fn:')).map((a) => a.slice(3)) : [],
  )
  return { apis: new Set([...apiNames, ...crud].filter(Boolean)), pages: new Set(pages), components: new Set(components), actions: new Set(actions) }
}

function checkProject(project: GummyProject, bodies: Record<string, GummyPageBody>) {
  expect(assertGummyProject(project).name).toBe('Book shop')
  // Every page is split, and its file exists and is a page body.
  for (const [key, page] of Object.entries(project.pages)) {
    expect(page.containers).toBeUndefined()
    const file = page.src?.match(/^pages\/(.+)\.json$/)?.[1]
    expect(file && bodies[file] ? key : `missing ${page.src}`).toBe(key)
    expect(Array.isArray(bodies[file!].containers)).toBe(true)
  }
  const refs = references(project, Object.values(bodies))
  for (const name of refs.apis) expect(project.api[name as string] ? name : `unknown api ${name}`).toBe(name)
  for (const page of refs.pages) expect(project.pages[page as string] ? page : `unknown page ${page}`).toBe(page)
  const componentNames = new Set((project.customComponents ?? []).map((c) => c.name))
  for (const c of refs.components) expect(componentNames.has(c as string) ? c : `undeclared component ${c}`).toBe(c)
  for (const a of refs.actions) expect(project.customActions?.includes(a as string) ? a : `undeclared action ${a}`).toBe(a)
  return refs
}

describe('Book shop workspace', () => {
  test('is generated the same every run', () => {
    expect(JSON.stringify(bookshopWorkspaceFile())).toBe(JSON.stringify(bookshopWorkspaceFile()))
  })

  test('exports one valid, fully wired project folder', () => {
    const folders = bookshopFolders()
    expect(Object.keys(folders)).toEqual([BOOKSHOP_KEY])
    const { project, pages } = folders[BOOKSHOP_KEY]
    const refs = checkProject(project, pages)
    expect(Object.keys(project.pages)).toHaveLength(11)
    expect(refs.apis.size).toBeGreaterThan(20)
    expect(project.auth?.profile?.api.name).toBe('staffByEmail')
    expect([...refs.components]).toEqual(['SalesChart'])
    expect([...refs.actions]).toEqual(['printOrder'])
  })

  test('the project the demo renders (demo/gummy) is valid and fully wired', () => {
    const dir = join(demoGummy, 'projects', BOOKSHOP_KEY)
    const project = JSON.parse(readFileSync(join(dir, 'project.json'), 'utf8')) as GummyProject
    const bodies = Object.fromEntries(
      readdirSync(join(dir, 'pages')).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, 'pages', f), 'utf8'))]),
    )
    checkProject(project, bodies)
  })

  test("the studio opens the generated workspace.json without changing it", async () => {
    const file = bookshopWorkspaceFile(bookshopWorkspace())
    const store = new Map<string, string>([['gummy.studio.workspace.v1', JSON.stringify(file)]])
    const g = globalThis as unknown as { localStorage: Storage; window: unknown }
    g.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    }
    g.window ??= globalThis
    // The persist middleware reads its storage while the store module evaluates.
    const { useWorkspaceStore } = await import('../../Workspace/workspaceStore')
    const state = useWorkspaceStore.getState()
    expect(state.version).toBe(file.state.version)
    expect(JSON.stringify(state.projects)).toBe(JSON.stringify(file.state.projects))
    expect(JSON.stringify(state.library)).toBe(JSON.stringify(file.state.library))
  })
})
