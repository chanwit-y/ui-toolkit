import { createEndpoint, withEndpointPatch } from '../../components/Api/endpointCommands'
import { HTTP_METHODS, MODEL_REF_KEYS, type EndpointDef, type HttpMethod, type ModelRefKey } from '../../components/Api/types'
import { createModel, fieldHasChildren } from '../../components/Model/modelCommands'
import { isPrimitive, type ArrayOf, type FieldKind, type ModelDef, type ModelField } from '../../components/Model/types'
import * as cmd from '../../components/Workspace/commands'
import type { LibraryData } from '../../components/Workspace/types'
import { ToolError } from '../errors'
import type { Session } from '../session'
import { fieldView } from './read'
import { bool, CONFIRM, PROJECT, str, writeInput, type JsonSchema, type Tool } from './shared'

type FieldSpec = { name: string; kind: FieldKind; arrayOf?: ArrayOf; children?: FieldSpec[] }

const FIELD_SPEC: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    kind: { type: 'string', enum: ['string', 'number', 'boolean', 'integer', 'any', 'object', 'array'] },
    arrayOf: { type: 'string', enum: ['string', 'number', 'boolean', 'integer', 'any', 'object'], description: 'array only (default string).' },
    children: { type: 'array', description: 'object, or array of object: the nested fields.', items: { $ref: '#/$defs/field' } },
  },
  required: ['name', 'kind'],
  additionalProperties: false,
}

const MODEL_REF: JsonSchema = { type: ['string', 'null'], description: 'A model name or id; null clears.' }

function setLibrary(s: Session, library: LibraryData) {
  s.ws = { ...s.ws, library }
}

function findNamed<T extends { id: string; name: string }>(list: T[], ref: unknown, what: string, path: string): T {
  if (typeof ref !== 'string' || !ref) throw new ToolError(`a ${what} id or name is required`, path)
  const hit = list.find((x) => x.id === ref) ?? list.find((x) => x.name === ref)
  if (!hit) throw new ToolError(`no ${what} "${ref}"`, path)
  return hit
}

/** The group named `name` (created when missing); `null` = Ungrouped, `undefined` = keep. */
function groupId(s: Session, name: unknown): string | null | undefined {
  if (name === undefined) return undefined
  if (name === null || name === '') return null
  const groups = s.ws.library.groups
  const existing = groups.find((g) => g.id === name || g.name === name)
  if (existing) return existing.id
  const group = { id: crypto.randomUUID(), name: String(name), description: '' }
  setLibrary(s, { ...s.ws.library, groups: [...groups, group] })
  s.log('created', 'group', group.name, '', null)
  return group.id
}

/** A field tree from specs, keeping the editor ids of same-named fields so a re-upsert diffs small. */
function buildFields(specs: unknown, previous: ModelField[], path: string): ModelField[] {
  if (!Array.isArray(specs)) throw new ToolError('must be an array of fields', path)
  const seen = new Set<string>()
  return specs.map((raw, i) => {
    const at = `${path}[${i}]`
    const spec = raw as FieldSpec
    if (!spec || typeof spec.name !== 'string' || !spec.name.trim()) throw new ToolError('a field needs a name', at)
    if (seen.has(spec.name)) throw new ToolError(`duplicate field "${spec.name}"`, at)
    seen.add(spec.name)
    const kind = spec.kind
    if (!isPrimitive(kind) && kind !== 'object' && kind !== 'array') throw new ToolError(`unknown kind "${String(kind)}"`, `${at}.kind`)
    const arrayOf: ArrayOf = kind === 'array' ? (spec.arrayOf ?? 'string') : 'string'
    if (kind === 'array' && !isPrimitive(arrayOf) && arrayOf !== 'object') throw new ToolError(`unknown arrayOf "${String(arrayOf)}"`, `${at}.arrayOf`)
    const before = previous.find((f) => f.name === spec.name)
    const children = fieldHasChildren(kind, arrayOf) ? buildFields(spec.children ?? [], before?.children ?? [], `${at}.children`) : []
    if (fieldHasChildren(kind, arrayOf) && !children.length) throw new ToolError(`${kind === 'object' ? 'an object' : 'an array of object'} field needs children`, at)
    return { id: before?.id ?? crypto.randomUUID(), name: spec.name, kind, arrayOf, children }
  })
}

function modelRef(s: Session, ref: unknown, path: string): string | null | undefined {
  if (ref === undefined) return undefined
  if (ref === null || ref === '') return null
  return findNamed(s.ws.library.models, ref, 'model', path).id
}

export const libraryTools: Tool[] = [
  {
    name: 'upsert_model',
    description:
      'Create a model, or replace an existing one’s fields (matched by name; `rename` renames it). Fields: { name, kind: string|number|boolean|integer|any|object|array, arrayOf?, children? }.',
    inputSchema: {
      ...writeInput(
        {
          name: str('The model name (endpoints reference it).'),
          fields: { type: 'array', items: { $ref: '#/$defs/field' } },
          rename: str('A new name for an existing model.'),
          group: { type: ['string', 'null'], description: 'Library group name (created when missing); null = Ungrouped.' },
        },
        ['name', 'fields'],
      ),
      $defs: { field: FIELD_SPEC },
    },
    write: true,
    run: (s, i) => {
      const name = String(i.name)
      const existing = s.ws.library.models.find((m) => m.name === name || m.id === name)
      const gid = groupId(s, i.group)
      const newName = i.rename ? String(i.rename) : undefined
      const finalName = newName ?? existing?.name ?? name
      if (s.ws.library.models.some((m) => m.name === finalName && m.id !== existing?.id)) throw new ToolError(`a model "${finalName}" already exists`, 'rename')
      const fields = buildFields(i.fields, existing?.fields ?? [], 'fields')
      const model: ModelDef = existing
        ? { ...existing, name: finalName, fields, ...(gid !== undefined ? { groupId: gid } : {}) }
        : { ...createModel(finalName, gid ?? null), fields }
      const models = existing ? s.ws.library.models.map((m) => (m.id === existing.id ? model : m)) : [...s.ws.library.models, model]
      setLibrary(s, { ...s.ws.library, models })
      s.log(existing ? (newName ? 'renamed' : 'updated') : 'created', 'model', model.name, existing && newName ? `was ${existing.name}` : '', null)
      return { id: model.id, name: model.name, fields: fieldView(model.fields) }
    },
  },
  {
    name: 'delete_model',
    description: 'Delete a library model. Needs confirm: true; without it, lists the endpoints that reference it.',
    inputSchema: writeInput({ model: str('Model name or id.'), confirm: CONFIRM }, ['model']),
    write: true,
    run: (s, i) => {
      const model = findNamed(s.ws.library.models, i.model, 'model', 'model')
      const users = s.ws.library.endpoints.filter((e) => MODEL_REF_KEYS.some((k) => e[k] === model.id)).map((e) => e.name)
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: model.name, referencedBy: users }
      setLibrary(s, { ...s.ws.library, models: s.ws.library.models.filter((m) => m.id !== model.id) })
      if (users.length) s.warn(`endpoints still reference it (exported as MISSING_MODEL): ${users.join(', ')}`)
      s.log('deleted', 'model', model.name, '', null)
      return { deleted: model.name }
    },
  },
  {
    name: 'upsert_endpoint',
    description:
      'Create a library endpoint, or update one (matched by name; `rename` renames it). url may hold :params (fill them from a `parameter` model); response / query / parameter / body are model names. Attach it to a project to use it there.',
    inputSchema: writeInput(
      {
        name: str('The endpoint name (configs reference it).'),
        method: { type: 'string', enum: HTTP_METHODS },
        url: str('Path, e.g. /api/books/:id.'),
        description: str(''),
        response: MODEL_REF,
        query: MODEL_REF,
        parameter: MODEL_REF,
        body: MODEL_REF,
        withOptions: bool('GET only: wraps the caller with .use(options).'),
        rename: str(''),
        group: { type: ['string', 'null'], description: 'Library group name (created when missing); null = Ungrouped.' },
        attachTo: PROJECT,
      },
      ['name'],
    ),
    write: true,
    run: (s, i) => {
      const name = String(i.name)
      const existing = s.ws.library.endpoints.find((e) => e.name === name || e.id === name)
      const finalName = i.rename ? String(i.rename) : (existing?.name ?? name)
      if (s.ws.library.endpoints.some((e) => e.name === finalName && e.id !== existing?.id)) throw new ToolError(`an endpoint "${finalName}" already exists`, 'rename')
      if (i.method !== undefined && !HTTP_METHODS.includes(i.method as HttpMethod)) throw new ToolError(`must be one of ${HTTP_METHODS.join(', ')}`, 'method')
      const gid = groupId(s, i.group)
      const patch: Partial<Omit<EndpointDef, 'id'>> = { name: finalName }
      if (i.method !== undefined) patch.method = i.method as HttpMethod
      if (i.url !== undefined) patch.url = String(i.url)
      if (i.description !== undefined) patch.description = String(i.description)
      if (i.withOptions !== undefined) patch.withOptions = i.withOptions === true
      if (gid !== undefined) patch.groupId = gid
      for (const key of MODEL_REF_KEYS as ModelRefKey[]) {
        const ref = modelRef(s, i[key], key)
        if (ref !== undefined) patch[key] = ref
      }
      const endpoint = withEndpointPatch(existing ?? createEndpoint(finalName, null), patch)
      const endpoints = existing ? s.ws.library.endpoints.map((e) => (e.id === existing.id ? endpoint : e)) : [...s.ws.library.endpoints, endpoint]
      setLibrary(s, { ...s.ws.library, endpoints })
      s.log(existing ? (i.rename ? 'renamed' : 'updated') : 'created', 'api', endpoint.name, existing && i.rename ? `was ${existing.name}` : `${endpoint.method} ${endpoint.url}`, null)
      if (i.attachTo) {
        const p = s.project(i.attachTo, 'attachTo')
        s.attachUsed(p.id, [endpoint.id])
      }
      if (!endpoint.url) s.warn(`${endpoint.name} has no url yet`)
      return { id: endpoint.id, name: endpoint.name, method: endpoint.method, url: endpoint.url }
    },
  },
  {
    name: 'delete_endpoint',
    description: 'Delete a library endpoint and detach it from every project. Needs confirm: true.',
    inputSchema: writeInput({ endpoint: str('Endpoint name or id.'), confirm: CONFIRM }, ['endpoint']),
    write: true,
    run: (s, i) => {
      const e = findNamed(s.ws.library.endpoints, i.endpoint, 'endpoint', 'endpoint')
      const projects = s.ws.projects.filter((p) => p.snapshot.endpointIds.includes(e.id)).map((p) => p.name)
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: e.name, attachedTo: projects }
      setLibrary(s, { ...s.ws.library, endpoints: s.ws.library.endpoints.filter((x) => x.id !== e.id) })
      s.setProjects(cmd.detachEverywhere(s.ws.projects, e.id))
      if (projects.length) s.warn(`configs in ${projects.join(', ')} that used it now export MISSING_ENDPOINT — run validate_project`)
      s.log('deleted', 'api', e.name, '', null)
      return { deleted: e.name }
    },
  },
  {
    name: 'attach_endpoints',
    description: 'Attach library endpoints to a project (only attached endpoints — and the models they reference — reach its runtime document).',
    inputSchema: writeInput({ project: PROJECT, endpoints: { type: 'array', items: { type: 'string' }, description: 'Endpoint names or ids.' } }, ['project', 'endpoints']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const ids = (i.endpoints as unknown[]).map((ref, k) => findNamed(s.ws.library.endpoints, ref, 'endpoint', `endpoints[${k}]`).id)
      s.setProjects(cmd.attachEndpoints(s.ws.projects, p.id, ids))
      s.log('attached', 'api', ids.map((id) => s.ws.library.endpoints.find((e) => e.id === id)!.name).join(', '), `to ${p.name}`, p.id)
      return s.project(p.id).snapshot.endpointIds.map((id) => s.ws.library.endpoints.find((e) => e.id === id)?.name ?? id)
    },
  },
  {
    name: 'detach_endpoint',
    description: 'Detach an endpoint from a project (configs still pointing at it export MISSING_ENDPOINT).',
    inputSchema: writeInput({ project: PROJECT, endpoint: str('Endpoint name or id.') }, ['project', 'endpoint']),
    write: true,
    run: (s, i) => {
      const p = s.project(i.project)
      const e = findNamed(s.ws.library.endpoints, i.endpoint, 'endpoint', 'endpoint')
      s.setProjects(cmd.detachEndpoint(s.ws.projects, p.id, e.id))
      s.log('detached', 'api', e.name, `from ${p.name}`, p.id)
      return s.project(p.id).snapshot.endpointIds.map((id) => s.ws.library.endpoints.find((x) => x.id === id)?.name ?? id)
    },
  },
]
