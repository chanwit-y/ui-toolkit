import { insertItems, updateCanvasAtPath } from '../../components/Layout/canvasCommands'
import { cloneItems } from '../../components/Layout/cloneItems'
import { ancestorRepeaters, withoutBlockedItems } from '../../components/Layout/repeaterRules'
import type { TemplateDef } from '../../components/Workspace/types'
import { ToolError } from '../errors'
import { rootCanvas, withRoot, type CanvasRef, type Session } from '../session'
import { CONFIRM, input, itemView, num, PAGE, PARENT, PROJECT, str, writeInput, type Tool } from './shared'

/*
 * Templates — starting layouts in the shared library (see the grilled design
 * `studio-mockup-v3-pages`). Inserting one copies its blocks with fresh ids
 * (`cloneItems`: references between the copies remapped, page navigation
 * dropped — a template is project-agnostic), exactly like the studio's
 * Templates tab.
 */

function template(s: Session, ref: unknown): TemplateDef {
  const list = s.ws.library.templates
  const hit = list.find((t) => t.id === ref) ?? list.filter((t) => t.name === ref)
  if (Array.isArray(hit)) {
    if (hit.length === 1) return hit[0]
    throw new ToolError(hit.length ? `"${ref}" names ${hit.length} templates — use the id` : `no template "${ref}"`, 'template')
  }
  return hit
}

function blocks(t: TemplateDef): number {
  let n = 0
  const walk = (items: TemplateDef['grid']['items']) => items.forEach((i) => (n++, i.childCanvases?.forEach((c) => walk(c.items))))
  walk(t.grid.items)
  return n
}

export const templateTools: Tool[] = [
  {
    name: 'list_templates',
    description: 'The shared library’s templates (starting layouts): id, name, category, description, active, and how many blocks each holds.',
    inputSchema: input({}),
    write: false,
    run: (s) =>
      s.ws.library.templates.map((t) => ({ id: t.id, name: t.name, category: t.category, description: t.description, active: t.active, builtin: t.builtin, blocks: blocks(t) })),
  },
  {
    name: 'insert_template',
    description: 'Copy a template’s blocks into a page canvas (fresh ids; page navigation in the template is dropped). Form fields are left out inside a repeater’s item template.',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, template: str('Template name or id.'), parent: PARENT, index: num('Position (default: the end).') }, ['project', 'page', 'template']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const page = s.page(project, i.page)
      const t = template(s, i.template)
      const path = s.canvasPath(page, i.parent as CanvasRef | undefined)
      let items = cloneItems(t.grid.items)
      if (ancestorRepeaters(page.grid.items, path).length) {
        const before = items.length
        items = withoutBlockedItems(items)
        if (items.length < before) s.warn('form fields were left out: this canvas is a repeater’s item template')
      }
      if (!items.length) throw new ToolError('nothing to insert', 'template')
      s.setPage(project.id, withRoot(page, updateCanvasAtPath(rootCanvas(page), path, (c) => insertItems(c, items, i.index as number | undefined))))
      s.log('updated', 'page', page.name, `inserted template ${t.name}`, project.id)
      return items.map(itemView)
    },
  },
  {
    name: 'save_as_template',
    description: 'Save a page’s whole canvas as a new library template (fresh ids, page navigation dropped).',
    inputSchema: writeInput({ project: PROJECT, page: PAGE, name: str(''), description: str(''), category: str('Default "General".') }, ['project', 'page', 'name']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const page = s.page(project, i.page)
      const t: TemplateDef = {
        id: crypto.randomUUID(),
        name: String(i.name).trim() || 'Untitled template',
        description: String(i.description ?? '').trim(),
        category: String(i.category ?? '').trim() || 'General',
        active: true,
        builtin: false,
        createdBy: s.actor,
        updatedAt: Date.now(),
        grid: { ...page.grid, items: cloneItems(page.grid.items) },
      }
      s.ws = { ...s.ws, library: { ...s.ws.library, templates: [...s.ws.library.templates, t] } }
      s.log('created', 'template', t.name, `from a page · ${t.grid.items.length} block(s)`, null)
      return { id: t.id, name: t.name, category: t.category, blocks: blocks(t) }
    },
  },
  {
    name: 'delete_template',
    description: 'Delete a library template. Needs confirm: true.',
    inputSchema: writeInput({ template: str('Template name or id.'), confirm: CONFIRM }, ['template']),
    write: true,
    run: (s, i) => {
      const t = template(s, i.template)
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: t.name }
      s.ws = { ...s.ws, library: { ...s.ws.library, templates: s.ws.library.templates.filter((x) => x.id !== t.id) } }
      s.log('deleted', 'template', t.name, '', null)
      return { deleted: t.name }
    },
  },
]
