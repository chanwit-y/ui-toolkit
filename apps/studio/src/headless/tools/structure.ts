import {
  addTab,
  canvasAtPath,
  createItem,
  insertItems,
  locateItem,
  patchItem,
  removeItem,
  removeTab,
  updateCanvasAtPath,
  type PathSeg,
} from '../../components/Layout/canvasCommands'
import { ancestorRepeaters } from '../../components/Layout/repeaterRules'
import { createChildCanvas, type ChildCanvas, type GridItemData, type TabConfig } from '../../components/Layout/types'
import * as cmd from '../../components/Workspace/commands'
import type { PageDef } from '../../components/Workspace/types'
import { ToolError } from '../errors'
import { isBlockedInRepeater, isComponentType, ITEM_TYPES, paletteLabel } from '../itemTypes'
import { refScope, resolveRefs } from '../refs'
import { assertMatches } from '../schemas'
import { rootCanvas, withRoot, type CanvasRef, type Session } from '../session'
import {
  bool,
  CONFIRM,
  deepMerge,
  ITEM,
  itemView,
  num,
  obj,
  optionalObject,
  PAGE,
  pageSummary,
  PARENT,
  PROJECT,
  projectKeyOf,
  str,
  writeInput,
  type Tool,
} from './shared'

/** What every item edit accepts beside its identity. */
const ITEM_FIELDS = {
  label: str('The editor label (shown in the studio’s layers; not rendered).'),
  config: obj('A deep-merge patch of the type’s config (describe_item_type has the schema). Objects merge, arrays and scalars replace. References may be names.'),
  layout: obj('A deep-merge patch of the grid settings, e.g. { "colSpan": { "xs": 4, "sm": 6, "md": 4, "lg": 6 } }.'),
  showWhen: { type: 'string', enum: ['always', 'adding', 'editing'], description: 'Inside a data table’s edit modal only.' },
  dataWhen: obj('Show only while a page-data condition holds: { loadId, test: loaded|loading|failed|compare, path, op, value } (loadId may be the load key); null clears.'),
  initialValue: obj('Form fields: prefill from a page load — { source: "state", key: "<load>", path }; null clears.'),
}

function canvasOf(page: PageDef, path: PathSeg[]): ChildCanvas {
  return canvasAtPath(rootCanvas(page), path)
}

/** Refuse a form field dropped into a repeater's item template (the studio's palette rule). */
function checkRepeaterRule(page: PageDef, path: PathSeg[], item: GridItemData) {
  if (!ancestorRepeaters(page.grid.items, path).length) return
  const offending: string[] = []
  const walk = (i: GridItemData) => {
    if (isBlockedInRepeater(i.type)) offending.push(i.type)
    i.childCanvases?.forEach((c) => c.items.forEach(walk))
  }
  walk(item)
  if (offending.length) throw new ToolError(`form fields (${[...new Set(offending)].join(', ')}) cannot go inside a repeater’s item template — it is read-only`, 'parent')
}

/**
 * Apply the shared item edits (label, config patch, layout, showWhen,
 * dataWhen, initialValue) to `item`, resolving references, checking the
 * config against its schema and keeping the canvas invariants.
 */
function applyItemEdits(s: Session, projectId: string, page: PageDef, item: GridItemData, i: Record<string, unknown>, isNew: boolean): GridItemData {
  const project = s.project(projectId)
  let next: GridItemData = item
  if (i.label !== undefined) next = { ...next, label: String(i.label) }
  const scope = refScope(project, s.ws.library, page.id)
  const configPatch = optionalObject(i.config, 'config')
  if (configPatch) {
    const configType = ITEM_TYPES[item.type].configType
    if (!configType || !item.config) throw new ToolError(`${item.type} has no config`, 'config')
    const resolved = resolveRefs(configPatch, scope, 'config')
    const merged = deepMerge(item.config, resolved) as GridItemData['config']
    assertMatches(configType, merged, 'config')
    if (item.type === 'tab') {
      const tabs = (merged as TabConfig).tabs.length
      if (isNew) {
        // A new tab item authored with its tabs: one fresh canvas per header.
        next = { ...next, childCanvases: Array.from({ length: tabs }, (_, k) => next.childCanvases?.[k] ?? createChildCanvas()) }
      } else if (tabs !== (item.childCanvases?.length ?? 0)) {
        throw new ToolError(`changes the number of tabs (${item.childCanvases?.length ?? 0} → ${tabs}) — use add_tab / remove_tab so each tab keeps its canvas`, 'config.tabs')
      }
    }
    next = { ...next, config: merged }
  }
  const layout = optionalObject(i.layout, 'layout')
  if (layout) {
    const settings = deepMerge(item.settings, layout)
    assertMatches('GridItemSettings', settings, 'layout')
    next = { ...next, settings }
  }
  if (i.showWhen !== undefined) {
    const v = String(i.showWhen)
    if (!['always', 'adding', 'editing'].includes(v)) throw new ToolError('must be always | adding | editing', 'showWhen')
    next = { ...next }
    delete next.showWhen
    if (v !== 'always') next.showWhen = v as 'adding' | 'editing'
  }
  for (const key of ['dataWhen', 'initialValue'] as const) {
    if (i[key] === undefined) continue
    if (i[key] === null) {
      next = { ...next }
      delete next[key]
      continue
    }
    const value = resolveRefs(i[key], scope, key)
    assertMatches(key === 'dataWhen' ? 'DataCondition' : 'ItemBinding', value, key)
    next = { ...next, [key]: value } as GridItemData
  }
  s.attachUsed(projectId, scope.usedEndpoints)
  return next
}

function savePage(s: Session, projectId: string, page: PageDef, root: ChildCanvas, fieldSeq?: number) {
  s.setPage(projectId, withRoot(page, root, fieldSeq))
}

function confirmOrPreview(confirm: unknown, preview: () => unknown): unknown | null {
  return confirm === true ? null : { confirmRequired: true, wouldRemove: preview(), hint: 'Call again with confirm: true to delete.' }
}

export const structureTools: Tool[] = [
  // ------------------------------------------------------------ projects
  {
    name: 'create_project',
    description: 'A new project (first in the list) with one blank page — or, with fromExample, the Country example (its library entries are added when missing).',
    inputSchema: writeInput({ name: str('Project name; its slug is the file key.'), description: str(''), fromExample: bool('Start from the Country example.') }, ['name']),
    write: true,
    run: (s, i) => {
      const next = cmd.createProject(s.ws, { name: String(i.name), description: String(i.description ?? ''), fromSeed: i.fromExample === true })
      s.ws = { ...s.ws, projects: next.projects, library: next.library }
      s.log('created', 'project', next.project.name, i.fromExample ? 'from the countries example' : 'empty project', next.project.id)
      return { id: next.project.id, key: projectKeyOf(s, next.project), name: next.project.name, pages: next.project.snapshot.pages.map(pageSummary) }
    },
  },
  {
    name: 'update_project',
    description: 'Rename a project or change its description (a rename changes its file key; the old folder is left in place).',
    inputSchema: writeInput({ project: PROJECT, name: str(''), description: str('') }, ['project']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      s.setProjects(cmd.updateProject(s.ws.projects, p.id, { name: i.name as string | undefined, description: i.description as string | undefined }))
      const after = s.project(p.id)
      if (after.name !== p.name) s.log('renamed', 'project', after.name, `was ${p.name}`, p.id)
      return { id: after.id, key: projectKeyOf(s, after), name: after.name, description: after.description }
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project from the workspace (its runtime folder on disk is kept). Needs confirm: true.',
    inputSchema: writeInput({ project: PROJECT, confirm: CONFIRM }, ['project']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const preview = confirmOrPreview(i.confirm, () => ({ project: p.name, pages: p.snapshot.pages.map((pg) => pg.key) }))
      if (preview) return preview
      s.setProjects(cmd.deleteProject(s.ws.projects, p.id))
      s.log('deleted', 'project', p.name, '', null)
      return { deleted: p.name }
    },
  },

  // --------------------------------------------------------------- pages
  {
    name: 'add_page',
    description: 'A blank page at the end of the project. `path` is its route (`/books/:id`); the key is derived from the name unless given (unique per project).',
    inputSchema: writeInput({ project: PROJECT, name: str(''), path: str('Route, e.g. /books or /books/:id.'), key: str('Identifier in the exported pages record.') }, ['project', 'name']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const next = cmd.addPage(s.ws.projects, p.id, { name: String(i.name), path: i.path as string | undefined, key: i.key as string | undefined })
      s.setProjects(next.projects)
      if (i.key && next.page.key !== String(i.key).trim()) s.warn(`key "${i.key}" was taken or invalid — the page is "${next.page.key}"`)
      s.log('created', 'page', next.page.name, 'blank page', p.id)
      return pageSummary(next.page)
    },
  },
  {
    name: 'update_page',
    description: 'Rename a page, change its route / key, its breadcrumb parent (a page, null clears), crumb label source or hide its breadcrumbs.',
    inputSchema: writeInput(
      {
        project: PROJECT,
        page: PAGE,
        name: str(''),
        path: str(''),
        key: str(''),
        parent: { type: ['string', 'null'], description: 'The page above this one in the breadcrumb trail (id / key / name); null clears.' },
        crumb: { type: ['object', 'null'], description: 'Where the breadcrumb label comes from (a NavParamSource); null = the page name.' },
        hideBreadcrumbs: bool(''),
      },
      ['project', 'page'],
    ),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const parentId = i.parent === undefined ? undefined : i.parent === null ? null : s.page(p, i.parent, 'parent').id
      const scope = refScope(p, s.ws.library, page.id)
      const crumb = i.crumb === undefined || i.crumb === null ? (i.crumb as null | undefined) : (resolveRefs(i.crumb, scope, 'crumb') as never)
      s.setProjects(
        cmd.updatePage(s.ws.projects, p.id, page.id, {
          name: i.name as string | undefined,
          path: i.path as string | undefined,
          key: i.key as string | undefined,
          parentId,
          crumb,
          hideBreadcrumbs: i.hideBreadcrumbs as boolean | undefined,
        }),
      )
      const after = s.page(s.project(p.id), page.id)
      if (i.key !== undefined && after.key !== String(i.key).trim()) throw new ToolError(`"${i.key}" is not a valid identifier or another page uses it`, 'key')
      if (parentId && after.parentId !== parentId) throw new ToolError('would make a breadcrumb cycle', 'parent')
      if (after.name !== page.name || after.path !== page.path)
        s.log(after.name !== page.name ? 'renamed' : 'updated', 'page', after.name, after.name !== page.name ? `was ${page.name}` : `route ${after.path}`, p.id)
      return pageSummary(after)
    },
  },
  {
    name: 'move_page',
    description: 'Reorder a page: move it `delta` positions (negative = earlier).',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, delta: num('') }, ['project', 'page', 'delta']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      s.setProjects(cmd.movePage(s.ws.projects, p.id, page.id, Number(i.delta)))
      return s.project(p.id).snapshot.pages.map((pg) => pg.key)
    },
  },
  {
    name: 'delete_page',
    description: 'Delete a page (a project keeps at least one). Needs confirm: true; without it, lists the references that would dangle.',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, confirm: CONFIRM }, ['project', 'page']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      if (p.snapshot.pages.length < 2) throw new ToolError('a project keeps at least one page', 'page')
      const preview = confirmOrPreview(i.confirm, () => {
        const text = JSON.stringify(p.snapshot.pages.filter((pg) => pg.id !== page.id)) + JSON.stringify(p.snapshot.menu)
        return { page: page.key, referencedElsewhere: text.includes(`"${page.id}"`) }
      })
      if (preview) return preview
      s.setProjects(cmd.deletePage(s.ws.projects, p.id, page.id))
      s.log('deleted', 'page', page.name, '', p.id)
      return { deleted: page.key }
    },
  },

  // --------------------------------------------------------------- items
  {
    name: 'add_item',
    description:
      'Add a component to a page (root canvas, or a child canvas via parent). Starts from the type’s defaults (describe_item_type), then applies the optional config / layout patches. Returns the new item’s id and its canvases.',
    inputSchema: writeInput(
      {
        project: PROJECT,
        page: PAGE,
        type: str('A component type (list_item_types).'),
        parent: PARENT,
        index: num('Position in the canvas (default: the end).'),
        component: str('custom only: the declared custom component (name or id) this item renders.'),
        ...ITEM_FIELDS,
      },
      ['project', 'page', 'type'],
    ),
    write: true,
    run: (s, i) => {
      const type = String(i.type)
      if (!isComponentType(type)) throw new ToolError(`unknown type "${type}" — see list_item_types`, 'type')
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const path = s.canvasPath(page, i.parent as CanvasRef | undefined)
      const canvas = canvasOf(page, path)
      let componentId: string | undefined
      // Named like a palette drop: the type's palette label (a declared custom component's name).
      let label = (i.label as string | undefined) ?? paletteLabel(type)
      if (type === 'custom' && i.component) {
        const decl = (p.snapshot.customComponents ?? []).find((c) => c.id === i.component || c.name === i.component)
        if (!decl) throw new ToolError(`no declared custom component "${i.component}"`, 'component')
        componentId = decl.id
        label = (i.label as string | undefined) ?? decl.name
      }
      const created = createItem(type, { fieldSeq: page.grid.fieldSeq, columns: canvas.settings.columns, label, componentId, siblingCount: canvas.items.length })
      const item = applyItemEdits(s, p.id, page, created.item, i, true)
      checkRepeaterRule(page, path, item)
      const freshPage = s.page(s.project(p.id), page.id)
      const root = updateCanvasAtPath(rootCanvas(freshPage), path, (c) => insertItems(c, [item], i.index as number | undefined))
      savePage(s, p.id, freshPage, root, created.fieldSeq)
      s.log('updated', 'page', page.name, `added ${type} ${item.label}`, p.id)
      return itemView(item)
    },
  },
  {
    name: 'update_item',
    description:
      'Edit an item: label, a deep-merge config patch (checked against the type’s schema; references may be names), layout, showWhen, dataWhen, initialValue. Send whole arrays (columns, options, actions) — arrays replace.',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, item: ITEM, ...ITEM_FIELDS }, ['project', 'page', 'item']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const { item, path } = s.item(page, i.item)
      const next = applyItemEdits(s, p.id, page, item, i, false)
      const freshPage = s.page(s.project(p.id), page.id)
      const root = updateCanvasAtPath(rootCanvas(freshPage), path, (c) => patchItem(c, item.id, () => next))
      savePage(s, p.id, freshPage, root)
      return { id: next.id, type: next.type, label: next.label, config: next.config ?? null, layout: next.settings }
    },
  },
  {
    name: 'move_item',
    description: 'Move an item to another position and/or canvas of the same page.',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, item: ITEM, parent: PARENT, index: num('Position in the target canvas (default: the end).') }, ['project', 'page', 'item']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const { item, path: from } = s.item(page, i.item)
      const to = s.canvasPath(page, i.parent as CanvasRef | undefined)
      if (to.some((seg) => seg.itemId === item.id)) throw new ToolError('cannot move an item into its own canvas', 'parent')
      checkRepeaterRule(page, to, item)
      let root = updateCanvasAtPath(rootCanvas(page), from, (c) => removeItem(c, item.id))
      root = updateCanvasAtPath(root, to, (c) => insertItems(c, [item], i.index as number | undefined))
      savePage(s, p.id, page, root)
      return { id: item.id, parent: to.length ? { item: to[to.length - 1].itemId, canvas: to[to.length - 1].canvasIndex } : null }
    },
  },
  {
    name: 'remove_item',
    description: 'Remove an item (and everything in its canvases).',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, item: ITEM }, ['project', 'page', 'item']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const { item, path } = s.item(page, i.item)
      savePage(s, p.id, page, updateCanvasAtPath(rootCanvas(page), path, (c) => removeItem(c, item.id)))
      s.log('updated', 'page', page.name, `removed ${item.type} ${item.label}`, p.id)
      return { removed: item.id }
    },
  },
  {
    name: 'add_tab',
    description: 'Append a tab header (and its canvas) to a tab item.',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, item: ITEM, label: str('Tab label.'), value: str('Tab value (unique).') }, ['project', 'page', 'item']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const { item, path } = s.item(page, i.item)
      if (item.type !== 'tab') throw new ToolError(`is a ${item.type}, not a tab`, 'item')
      let root = updateCanvasAtPath(rootCanvas(page), path, (c) => addTab(c, item.id))
      if (i.label !== undefined || i.value !== undefined) {
        root = updateCanvasAtPath(root, path, (c) =>
          patchItem(c, item.id, (it) => {
            const config = it.config as TabConfig
            const tabs = config.tabs.slice()
            const last = tabs[tabs.length - 1]
            tabs[tabs.length - 1] = { label: (i.label as string) ?? last.label, value: (i.value as string) ?? last.value }
            return { ...it, config: { ...config, tabs } }
          }),
        )
      }
      savePage(s, p.id, page, root)
      const after = locateItem(root, item.id)!.item
      return itemView(after)
    },
  },
  {
    name: 'remove_tab',
    description: 'Remove one tab header and its canvas (with everything in it).',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, item: ITEM, index: num('The tab’s index.') }, ['project', 'page', 'item', 'index']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const { item, path } = s.item(page, i.item)
      if (item.type !== 'tab') throw new ToolError(`is a ${item.type}, not a tab`, 'item')
      const n = (item.config as TabConfig).tabs.length
      const index = Number(i.index)
      if (!(index >= 0 && index < n)) throw new ToolError(`no tab ${index} (0–${n - 1})`, 'index')
      const root = updateCanvasAtPath(rootCanvas(page), path, (c) => removeTab(c, item.id, index))
      savePage(s, p.id, page, root)
      return itemView(locateItem(root, item.id)!.item)
    },
  },
  {
    name: 'update_canvas',
    description: 'Change a canvas grid (the page root, or a child canvas via parent): a deep-merge patch of columns / gap / alignment per breakpoint.',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, parent: PARENT, layout: obj('e.g. { "gap": { "xs": "8px", "sm": "8px", "md": "16px", "lg": "16px" } }') }, ['project', 'page', 'layout']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const page = s.page(p, i.page)
      const path = s.canvasPath(page, i.parent as CanvasRef | undefined)
      const patch = optionalObject(i.layout, 'layout') ?? {}
      const settings = deepMerge(canvasOf(page, path).settings, patch)
      assertMatches('GridContainerSettings', settings, 'layout')
      savePage(s, p.id, page, updateCanvasAtPath(rootCanvas(page), path, (c) => ({ ...c, settings })))
      return settings
    },
  },
]
