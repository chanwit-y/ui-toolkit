import { createItem } from '../../components/Layout/canvasCommands'
import { defaultContainerSettings } from '../../components/Layout/types'
import { MODEL_REF_KEYS } from '../../components/Api/types'
import type { ModelField } from '../../components/Model/types'
import { WORKSPACE_VERSION } from '../../components/Workspace/migrate'
import { attachedEndpoints, referencedModels } from '../../components/Workspace/snapshots'
import { ToolError } from '../errors'
import { guide } from '../guides'
import { isBlockedInRepeater, isComponentType, ITEM_TYPES, listItemTypes } from '../itemTypes'
import { schemaFor } from '../schemas'
import type { Session } from '../session'
import { input, ITEM, itemView, PAGE, pageSummary, PROJECT, projectKeyOf, str, type Tool } from './shared'

/** A model field tree without the editor-only ids. */
export function fieldView(fields: ModelField[]): unknown[] {
  return fields.map((f) => ({
    name: f.name,
    kind: f.kind,
    ...(f.kind === 'array' ? { arrayOf: f.arrayOf } : {}),
    ...(f.children.length ? { children: fieldView(f.children) } : {}),
  }))
}

function endpointView(session: Session, id: string) {
  const e = session.ws.library.endpoints.find((x) => x.id === id)
  if (!e) return null
  const model = (ref: string | null) => (ref ? (session.ws.library.models.find((m) => m.id === ref)?.name ?? `MISSING_MODEL(${ref})`) : null)
  return {
    id: e.id,
    name: e.name,
    method: e.method,
    url: e.url,
    ...(e.description ? { description: e.description } : {}),
    ...Object.fromEntries(MODEL_REF_KEYS.map((k) => [k, model(e[k])])),
    ...(e.method === 'GET' && e.withOptions ? { withOptions: true } : {}),
    ...(e.groupId ? { group: session.ws.library.groups.find((g) => g.id === e.groupId)?.name ?? null } : {}),
  }
}

export const readTools: Tool[] = [
  {
    name: 'get_workspace_summary',
    description:
      'Start here: the workspace version, every project (id, file key, name, page count) and the shared library counts. Read gummy://guide/start for how authoring works.',
    inputSchema: input({}),
    write: false,
    run: (s) => ({
      version: WORKSPACE_VERSION,
      projects: s.ws.projects.map((p) => ({
        id: p.id,
        key: projectKeyOf(s, p),
        name: p.name,
        description: p.description,
        pages: p.snapshot.pages.length,
        endpoints: p.snapshot.endpointIds.length,
      })),
      library: {
        models: s.ws.library.models.length,
        endpoints: s.ws.library.endpoints.length,
        groups: s.ws.library.groups.map((g) => g.name),
        templates: s.ws.library.templates.length,
        auth: (s.ws.library.auth ?? []).map((a) => a.name),
      },
    }),
  },
  {
    name: 'get_project',
    description: 'One project: its pages (id, key, name, path, item count, loads), attached endpoints, menu, shell, sign-in and declared custom actions / components.',
    inputSchema: input({ project: PROJECT }, ['project']),
    write: false,
    run: (s, i) => {
      const p = s.project(i.project)
      const snap = p.snapshot
      return {
        id: p.id,
        key: projectKeyOf(s, p),
        name: p.name,
        description: p.description,
        pages: snap.pages.map(pageSummary),
        endpoints: snap.endpointIds.map((id) => endpointView(s, id) ?? { id, missing: true }),
        menu: snap.menu,
        shell: snap.shell,
        globalLoads: (snap.globalLoads ?? []).map((l) => ({ id: l.id, key: l.key, endpointId: l.read.endpointId, paths: l.paths, loading: l.loading })),
        authId: snap.authId ?? null,
        customActions: (snap.customActions ?? []).map((a) => ({ id: a.id, name: a.name, description: a.description })),
        customComponents: (snap.customComponents ?? []).map((c) => ({ id: c.id, name: c.name, props: c.props.map((x) => ({ key: x.key, kind: x.kind })) })),
        env: snap.env.map((e) => ({ name: e.name, value: e.value })),
      }
    },
  },
  {
    name: 'get_page',
    description:
      'One page: route meta, loads, the root grid settings and the item tree — every item with its id, type, label, binding name and child canvases (each labelled: a modal’s content, a data table’s edit modal / filter form, a repeater’s item template, one per tab…).',
    inputSchema: input({ project: PROJECT, page: PAGE }, ['project', 'page']),
    write: false,
    run: (s, i) => {
      const project = s.project(i.project)
      const page = s.page(project, i.page)
      return {
        ...pageSummary(page),
        ...(page.crumb ? { crumb: page.crumb } : {}),
        ...(page.hideBreadcrumbs ? { hideBreadcrumbs: true } : {}),
        loads: page.loads ?? [],
        layout: page.grid.containerSettings,
        items: page.grid.items.map(itemView),
      }
    },
  },
  {
    name: 'get_item',
    description: 'One item in full: type, label, config, layout settings, showWhen / dataWhen / initialValue and its child canvases (as item views).',
    inputSchema: input({ project: PROJECT, page: PAGE, item: ITEM }, ['project', 'page', 'item']),
    write: false,
    run: (s, i) => {
      const project = s.project(i.project)
      const page = s.page(project, i.page)
      const { item, path } = s.item(page, i.item)
      const { childCanvases, ...rest } = item
      return {
        ...rest,
        parent: path.length ? { item: path[path.length - 1].itemId, canvas: path[path.length - 1].canvasIndex } : null,
        ...(childCanvases ? { canvases: itemView(item).canvases } : {}),
      }
    },
  },
  {
    name: 'list_item_types',
    description: 'Every component type you can add: type, palette label, category, a one-line summary, its config type and what its child canvases hold.',
    inputSchema: input({}),
    write: false,
    run: () =>
      listItemTypes().map((t) => ({
        type: t.type,
        label: t.label,
        category: t.category,
        summary: t.summary,
        configType: t.configType,
        canvases: t.canvases(),
        ...(isBlockedInRepeater(t.type) ? { formField: true } : {}),
      })),
  },
  {
    name: 'describe_item_type',
    description:
      'Before configuring a type: its config JSON Schema, the defaults add_item creates (config + layout), what its canvases hold, and its authoring guide.',
    inputSchema: input({ type: str('A component type from list_item_types.') }, ['type']),
    write: false,
    run: (_s, i) => {
      const type = String(i.type)
      if (!isComponentType(type)) throw new ToolError(`unknown type "${type}" — see list_item_types`, 'type')
      const info = ITEM_TYPES[type]
      const { item } = createItem(type, { fieldSeq: 0, columns: defaultContainerSettings.columns, label: type })
      return {
        type,
        summary: info.summary,
        configType: info.configType,
        canvases: info.canvases(item),
        formField: isBlockedInRepeater(type),
        defaults: { config: item.config ?? null, layout: item.settings },
        schema: info.configType ? schemaFor(info.configType) : null,
        guide: guide(info.guide) ?? `(no guide yet for "${info.guide}" — the schema descriptions explain the fields)`,
      }
    },
  },
  {
    name: 'get_activity',
    description: 'The Activity log, newest first: who changed what (the studio’s users and "Claude (MCP)").',
    inputSchema: input({ limit: { type: 'number', description: 'Default 30.' }, project: { ...PROJECT, description: 'Only this project’s lines.' } }),
    write: false,
    run: (s, i) => {
      const projectId = i.project ? s.project(i.project).id : null
      return s.ws.activity
        .filter((a) => !projectId || a.projectId === projectId)
        .slice(0, Number(i.limit ?? 30))
        .map((a) => ({ when: new Date(a.ts).toISOString(), user: a.user, verb: a.verb, kind: a.kind, name: a.name, detail: a.detail }))
    },
  },
  {
    name: 'get_library',
    description: 'The shared library: models (field trees) and endpoints (method, url, model refs by name), optionally only what one project attaches.',
    inputSchema: input({
      project: { ...PROJECT, description: 'Only the endpoints this project attaches and the models they reference.' },
      kind: { type: 'string', enum: ['all', 'models', 'endpoints'], description: 'Default all.' },
    }),
    write: false,
    run: (s, i) => {
      const project = i.project ? s.project(i.project) : null
      const endpoints = project ? attachedEndpoints(project.snapshot.endpointIds, s.ws.library.endpoints) : s.ws.library.endpoints
      const models = project ? referencedModels(endpoints, s.ws.library.models) : s.ws.library.models
      const kind = (i.kind as string | undefined) ?? 'all'
      return {
        ...(kind !== 'endpoints' ? { models: models.map((m) => ({ id: m.id, name: m.name, fields: fieldView(m.fields) })) } : {}),
        ...(kind !== 'models' ? { endpoints: endpoints.map((e) => endpointView(s, e.id)) } : {}),
      }
    },
  },
]
