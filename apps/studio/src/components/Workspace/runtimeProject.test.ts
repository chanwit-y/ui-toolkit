import { describe, expect, test } from 'bun:test'
import { createProjectFolderDeriver, projectFileKeys } from './runtimeProject'
import { createPage, emptyProjectSnapshot } from './snapshots'
import type { LibraryData, ProjectDef } from './types'

const library = (): LibraryData => ({ groups: [], models: [], endpoints: [], templates: [] })

function project(id: string, name: string, pageNames = ['Home']): ProjectDef {
  const snapshot = emptyProjectSnapshot(name)
  return { id, name, description: '', createdAt: 0, updatedAt: 0, snapshot: { ...snapshot, pages: pageNames.map((n) => createPage(n)) } }
}

const payload = (projects: ProjectDef[], lib = library()) => JSON.stringify({ state: { projects, library: lib }, version: 56 })

describe('projectFileKeys', () => {
  test('slugs the names and numbers clashes in workspace order', () => {
    expect(projectFileKeys([project('a', 'Shop'), project('b', 'Shop'), project('c', 'Back office')])).toEqual(['shop', 'shop-2', 'back-office'])
  })
})

describe('createProjectFolderDeriver', () => {
  test('ships every project first, then only what changed since the last committed write', () => {
    const derive = createProjectFolderDeriver()
    const a = project('a', 'Shop', ['Home', 'Orders'])
    const b = project('b', 'Admin')

    const first = derive(payload([a, b]))
    expect(Object.keys(first.projectFolders)).toEqual(['shop', 'admin'])
    const shop = first.projectFolders.shop
    expect(Object.keys(shop.pages)).toHaveLength(2)
    for (const page of Object.values(shop.project.pages)) {
      expect(page.containers).toBeUndefined()
      expect(page.src).toMatch(/^pages\/.+\.json$/)
    }
    first.commit()

    expect(Object.keys(derive(payload([a, b])).projectFolders)).toEqual([])

    const edited = { ...a, snapshot: { ...a.snapshot, pages: [...a.snapshot.pages, createPage('Reports')] } }
    const second = derive(payload([edited, b]))
    expect(Object.keys(second.projectFolders)).toEqual(['shop'])
    // Not committed (the CLI refused it): still dirty on the next save.
    expect(Object.keys(derive(payload([edited, b])).projectFolders)).toEqual(['shop'])
  })

  test('a shared-library change marks every project dirty', () => {
    const derive = createProjectFolderDeriver()
    const projects = [project('a', 'Shop'), project('b', 'Admin')]
    derive(payload(projects)).commit()
    const lib = { ...library(), groups: [{ id: 'g', name: 'Billing' }] } as unknown as LibraryData
    expect(Object.keys(derive(payload(projects, lib)).projectFolders)).toEqual(['shop', 'admin'])
  })

  test('a rename that shifts another project’s file key re-ships that one too', () => {
    const derive = createProjectFolderDeriver()
    const a = project('a', 'Shop')
    const b = project('b', 'Shop')
    derive(payload([a, b])).commit()
    // `a` leaves the name, so `b` becomes `shop` instead of `shop-2`.
    const renamed = { ...a, name: 'Store' }
    expect(Object.keys(derive(payload([renamed, b])).projectFolders).sort()).toEqual(['shop', 'store'])
  })
})
