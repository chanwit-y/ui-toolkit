import { urlParamNames } from '@gummy-ui/ui/headless'
import type { NavParamSource } from '../../components/Layout/types'
import * as cmd from '../../components/Workspace/commands'
import { createCustomActionDef, isValidActionName, type CustomActionDef } from '../../components/Workspace/customActions'
import { createCustomComponentDef, isValidComponentName, type CustomComponentDef, type CustomPropDef } from '../../components/Workspace/customComponents'
import { createPageLoad, type PageLoadDef } from '../../components/Workspace/pageLoads'
import type { MenuItemDef, ProjectDef } from '../../components/Workspace/types'
import { ToolError } from '../errors'
import { logicCondition, logicExpr, refScope, resolveRefs, type RefScope } from '../refs'
import { createFormulaDef, createRuleDef, logicRefIds, type FormulaLibDef, type RuleLibDef } from '../../components/Workspace/logic'
import { defaultColumnFormat, type ColumnFormatConfig } from '../../components/Layout/types'
import type { Expr, Rule } from '@gummy-ui/ui'
import { assertMatches } from '../schemas'
import type { Session } from '../session'
import { CONFIRM, deepMerge, obj, optionalObject, PAGE, PROJECT, str, writeInput, type JsonSchema, type Tool } from './shared'

/*
 * Project settings beside the pages (see the grilled design `mcp-server`):
 * the app-shell menu, the shell and theme, env vars, the sign-in pick, page
 * and global data loads, and the declared custom actions / components.
 * Each edits one field of the project snapshot, checked against the schema
 * generated from the studio's own type.
 */

const LOADING = { type: 'string', enum: ['skeleton', 'cycle', 'none'], description: 'skeleton = bound components draw placeholders; cycle = the page spinner; none = silent.' }
const SOURCES = obj('`{ <key>: NavParamSource }` — { type: "value", value } | { type: "url", key, source: "param"|"query" } | { type: "state", key: <load>, path }.')

function setSnapshot<K extends keyof ProjectDef['snapshot']>(s: Session, project: ProjectDef, key: K, value: ProjectDef['snapshot'][K]) {
  s.setProjects(cmd.setSnapshotField(s.ws.projects, project.id, key, value))
}

// ----------------------------------------------------------------- menu

const MENU_ITEM: JsonSchema = {
  type: 'object',
  description:
    'kind "page": { label, icon?, page: <page ref>, params?: { <:param>: NavParamSource }, replace? } (or a full `navigate`); kind "link": { label, icon?, href, newTab? }; kind "group": { label, icon?, collapsed?, items: [...] } (one level deep); kind "divider".',
  properties: { kind: { type: 'string', enum: ['page', 'link', 'group', 'divider'] } },
  required: ['kind'],
}

function menuItem(spec: unknown, scope: RefScope, s: Session, project: ProjectDef, path: string, depth: number): MenuItemDef {
  const raw = optionalObject(spec, path) ?? {}
  const id = typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID()
  const icon = typeof raw.icon === 'string' ? raw.icon : ''
  let item: MenuItemDef
  switch (raw.kind) {
    case 'divider':
      item = { id, kind: 'divider' }
      break
    case 'link':
      item = { id, kind: 'link', label: String(raw.label ?? ''), icon, href: String(raw.href ?? ''), newTab: raw.newTab !== false }
      break
    case 'group': {
      if (depth > 0) throw new ToolError('groups are one level deep — no group inside a group', path)
      const items = Array.isArray(raw.items) ? raw.items : []
      item = {
        id,
        kind: 'group',
        label: String(raw.label ?? 'Group'),
        icon,
        collapsed: raw.collapsed === true,
        items: items.map((x, i) => menuItem(x, scope, s, project, `${path}.items[${i}]`, depth + 1)),
      }
      break
    }
    case 'page': {
      const navigate = resolveRefs(
        raw.navigate ?? { pageId: raw.page, params: raw.params ?? {}, replace: raw.replace === true },
        scope,
        `${path}.navigate`,
      ) as { pageId: string; params: Record<string, NavParamSource>; replace: boolean }
      const page = project.snapshot.pages.find((p) => p.id === navigate.pageId)
      if (!page) throw new ToolError('a page link needs `page` (its key, name or path)', path)
      const missing = urlParamNames(page.path).filter((p) => !navigate.params?.[p])
      if (missing.length) s.warn(`menu link "${raw.label ?? page.name}" opens ${page.path} without ${missing.map((m) => `:${m}`).join(', ')} — pass params`)
      item = { id, kind: 'page', label: String(raw.label ?? page.name), icon, navigate: { pageId: navigate.pageId, params: navigate.params ?? {}, replace: navigate.replace === true } }
      break
    }
    default:
      throw new ToolError('kind must be page | link | group | divider', `${path}.kind`)
  }
  assertMatches('MenuItemDef', item, path)
  return item
}

// ---------------------------------------------------------------- loads

function loadList(project: ProjectDef, pageId: string | null): PageLoadDef[] {
  if (!pageId) return project.snapshot.globalLoads ?? []
  return project.snapshot.pages.find((p) => p.id === pageId)?.loads ?? []
}

function saveLoads(s: Session, project: ProjectDef, pageId: string | null, loads: PageLoadDef[]) {
  if (pageId) s.setProjects(cmd.updatePage(s.ws.projects, project.id, pageId, { loads }))
  else setSnapshot(s, project, 'globalLoads', loads)
}

// ------------------------------------------------------------- declarations

function upsertNamed<T extends { id: string; name: string }>(list: T[], name: string, rename: string | undefined, create: () => T, patch: Partial<T>, what: string): { list: T[]; item: T; created: boolean } {
  const existing = list.find((x) => x.id === name || x.name === name)
  const finalName = rename ?? existing?.name ?? name
  if (list.some((x) => x.name === finalName && x.id !== existing?.id)) throw new ToolError(`a ${what} "${finalName}" already exists`, 'rename')
  const item = { ...(existing ?? create()), ...patch, name: finalName } as T
  return { list: existing ? list.map((x) => (x.id === existing.id ? item : x)) : [...list, item], item, created: !existing }
}

function dangling(project: ProjectDef, needle: string): boolean {
  return JSON.stringify(project.snapshot.pages).includes(needle) || JSON.stringify(project.snapshot.menu).includes(needle)
}

// ----------------------------------------------------------------- logic

/** A rule input → a `Rule`: `when` may be Code-mode text, `then` / `else` formula text or a nested rule. */
function ruleInput(value: unknown, scope: RefScope, at: string): Rule {
  if (!value || typeof value !== 'object') throw new ToolError('must be { branches: [{ when, then }], else }', at)
  const r = value as { branches?: unknown; else?: unknown }
  if (!Array.isArray(r.branches) || !r.branches.length) throw new ToolError('needs at least one branch', `${at}.branches`)
  if (r.else === undefined) throw new ToolError('needs an else', `${at}.else`)
  const expr = (v: unknown, p: string): Expr | Rule =>
    typeof v === 'string' ? (logicExpr(v, scope, p) as Expr) : v && typeof v === 'object' && 'branches' in v ? ruleInput(v, scope, p) : (resolveRefs(v, scope, p) as Expr)
  return {
    branches: r.branches.map((b, k) => {
      const branch = b as { when?: unknown; then?: unknown }
      let when = typeof branch.when === 'string' ? logicCondition(branch.when, scope, `${at}.branches[${k}].when`) : resolveRefs(branch.when ?? { all: [] }, scope, `${at}.branches[${k}].when`)
      // A saved rule alone is `{ rule }` in a slot; inside a branch it is a comparison.
      if (when && typeof when === 'object' && 'rule' in when) when = { cmp: 'eq', left: when, right: { lit: true } }
      return { when: when as Rule['branches'][number]['when'], then: expr(branch.then, `${at}.branches[${k}].then`) }
    }),
    else: expr(r.else, `${at}.else`) as Expr,
  }
}

function formatInput(value: unknown, base: ColumnFormatConfig, at: string): ColumnFormatConfig {
  if (value === undefined) return base
  if (value === null) return defaultColumnFormat()
  if (typeof value === 'string') return { ...defaultColumnFormat(), type: value as ColumnFormatConfig['type'] }
  if (typeof value !== 'object') throw new ToolError('must be a format object or a type name', at)
  return { ...base, ...(value as object) }
}

/** Where a saved item is used (pages, menu, the other saved items). */
function logicUses(project: ProjectDef, id: string): string[] {
  const out: string[] = []
  for (const pg of project.snapshot.pages) {
    const r = logicRefIds(pg.grid.items)
    if (r.formulas.has(id) || r.rules.has(id)) out.push(`page ${pg.name}`)
  }
  for (const f of project.snapshot.formulas ?? []) {
    const r = logicRefIds(f.expr)
    if (r.formulas.has(id) || r.rules.has(id)) out.push(`formula ${f.name}`)
  }
  for (const x of project.snapshot.rules ?? []) {
    const r = logicRefIds(x.rule)
    if (r.formulas.has(id) || r.rules.has(id)) out.push(`rule ${x.name}`)
  }
  return out
}

const BLANK_POLICY = { type: 'string', enum: ['empty', 'zero', 'error'] } as const

export const logicTools: Tool[] = [
  {
    name: 'upsert_formula',
    description:
      'Create or update a saved formula (gummy://guide/concepts/logic), referenced by name from any slot: `expr` is Code-mode text ("[qty] * [unitPrice]", "ROUND($country.population / row.area_km2, 1)", "((Subtotal)) * (1 - IF((Discount rate)))") or an Expr JSON; `format` a column-format object ({ type: number|currency|percent|date|…, decimals, currency, … }) or a type name; onEmpty / onDivideByZero: empty (default) | zero | error.',
    inputSchema: writeInput(
      {
        project: PROJECT,
        name: str('The formula’s name, e.g. Subtotal.'),
        rename: str(''),
        description: str(''),
        expr: { description: 'Code-mode text or an Expr JSON.' },
        format: { description: 'A column-format object or a type name; null clears.' },
        onEmpty: BLANK_POLICY,
        onDivideByZero: BLANK_POLICY,
      },
      ['project', 'name'],
    ),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const scope = refScope(project, s.ws.library, null)
      const list = project.snapshot.formulas ?? []
      const existing = list.find((x) => x.id === i.name || x.name === i.name)
      const patch: Partial<FormulaLibDef> = {}
      if (i.description !== undefined) patch.description = String(i.description)
      if (i.expr !== undefined) patch.expr = (typeof i.expr === 'string' ? logicExpr(i.expr, scope, 'expr') : resolveRefs(i.expr, scope, 'expr')) as Expr
      if (i.format !== undefined) patch.format = formatInput(i.format, existing?.format ?? defaultColumnFormat(), 'format')
      if (i.onEmpty !== undefined) patch.onEmpty = i.onEmpty as FormulaLibDef['onEmpty']
      if (i.onDivideByZero !== undefined) patch.onDivideByZero = i.onDivideByZero as FormulaLibDef['onDivideByZero']
      const next = upsertNamed<FormulaLibDef>(list, String(i.name), i.rename as string | undefined, () => createFormulaDef(String(i.name)), patch, 'formula')
      assertMatches('FormulaLibDef', next.item, 'formula')
      setSnapshot(s, project, 'formulas', next.list)
      return next.item
    },
  },
  {
    name: 'upsert_rule',
    description:
      'Create or update a saved rule — IF / ELSE IF / ELSE, the first branch whose `when` holds gives `then`, else `else` (gummy://guide/concepts/logic). resultType: boolean (usable as a condition) | number | text | date. rule: { branches: [{ when: "<condition text>", then: "<formula text>" | { nested rule } }], else: "<formula text>" } — or the same as JSON. `format` as for upsert_formula.',
    inputSchema: writeInput(
      {
        project: PROJECT,
        name: str('The rule’s name, e.g. Discount rate.'),
        rename: str(''),
        description: str(''),
        resultType: { type: 'string', enum: ['boolean', 'number', 'text', 'date'] },
        rule: obj('{ branches: [{ when, then }], else }'),
        format: { description: 'A column-format object or a type name; null clears.' },
      },
      ['project', 'name'],
    ),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const scope = refScope(project, s.ws.library, null)
      const list = project.snapshot.rules ?? []
      const existing = list.find((x) => x.id === i.name || x.name === i.name)
      const patch: Partial<RuleLibDef> = {}
      if (i.description !== undefined) patch.description = String(i.description)
      if (i.resultType !== undefined) patch.resultType = i.resultType as RuleLibDef['resultType']
      if (i.rule !== undefined) patch.rule = ruleInput(i.rule, scope, 'rule')
      if (i.format !== undefined) patch.format = formatInput(i.format, existing?.format ?? defaultColumnFormat(), 'format')
      const next = upsertNamed<RuleLibDef>(list, String(i.name), i.rename as string | undefined, () => createRuleDef(String(i.name), (i.resultType as RuleLibDef['resultType']) ?? 'boolean'), patch, 'rule')
      assertMatches('RuleLibDef', next.item, 'rule')
      setSnapshot(s, project, 'rules', next.list)
      return next.item
    },
  },
  {
    name: 'delete_formula',
    description: 'Remove a saved formula. Needs confirm: true; the answer says what still uses it (those references export as MISSING_FORMULA).',
    inputSchema: writeInput({ project: PROJECT, formula: str('Name or id.'), confirm: CONFIRM }, ['project', 'formula']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const list = project.snapshot.formulas ?? []
      const def = list.find((f) => f.id === i.formula || f.name === i.formula)
      if (!def) throw new ToolError(`no formula "${i.formula}"`, 'formula')
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: def.name, stillUsedBy: logicUses(project, def.id) }
      setSnapshot(s, project, 'formulas', list.filter((f) => f.id !== def.id))
      return { deleted: def.name }
    },
  },
  {
    name: 'delete_rule',
    description: 'Remove a saved rule. Needs confirm: true; the answer says what still uses it (those references export as MISSING_RULE).',
    inputSchema: writeInput({ project: PROJECT, rule: str('Name or id.'), confirm: CONFIRM }, ['project', 'rule']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const list = project.snapshot.rules ?? []
      const def = list.find((r) => r.id === i.rule || r.name === i.rule)
      if (!def) throw new ToolError(`no rule "${i.rule}"`, 'rule')
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: def.name, stillUsedBy: logicUses(project, def.id) }
      setSnapshot(s, project, 'rules', list.filter((r) => r.id !== def.id))
      return { deleted: def.name }
    },
  },
]

export const projectTools: Tool[] = [
  {
    name: 'update_menu',
    description:
      'Replace the project’s app-shell menu (sidebar / top strip). Items: page links (to a page, with :param sources), external links, groups (one level) and dividers; an item may keep its `id` from get_project.',
    inputSchema: writeInput({ project: PROJECT, menu: { type: 'array', items: MENU_ITEM } }, ['project', 'menu']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      if (!Array.isArray(i.menu)) throw new ToolError('must be an array', 'menu')
      const scope = refScope(project, s.ws.library, null)
      const menu = i.menu.map((m, k) => menuItem(m, scope, s, project, `menu[${k}]`, 0))
      setSnapshot(s, project, 'menu', menu)
      return menu
    },
  },
  {
    name: 'update_shell',
    description:
      'The app shell: navigation (sidebar | top), breadcrumbs, menuIcons, collapsible, menuActiveColor, pageTransition { type, duration, easing }, appBar { title, icon, logo, variant panel|accent|custom, background, gradient, foreground, padding, … } and sidebar { variant plain|pill, toggle header|footer, … }. A deep-merge patch checked against ShellSettings.',
    inputSchema: writeInput({ project: PROJECT, shell: obj('e.g. { "navigation": "top", "appBar": { "title": "Shop", "variant": "accent" } }') }, ['project', 'shell']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const shell = deepMerge(project.snapshot.shell, optionalObject(i.shell, 'shell'))
      assertMatches('ShellSettings', shell, 'shell')
      setSnapshot(s, project, 'shell', shell)
      return shell
    },
  },
  {
    name: 'update_theme',
    description:
      'The project theme: appearance (light | dark), accentColor (a Radix colour), radius, panelBackground, scaling, surface (flat | glass) + background (the glass backdrop: { kind: default | color | gradient | image, color, gradient: { from, to, angle }, image }), buttonColor and the dataTable colour roles. A deep-merge patch checked against StudioThemeConfig.',
    inputSchema: writeInput({ project: PROJECT, theme: obj('e.g. { "accentColor": "iris", "radius": "large" }') }, ['project', 'theme']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const theme = deepMerge(project.snapshot.theme, optionalObject(i.theme, 'theme'))
      assertMatches('StudioThemeConfig', theme, 'theme')
      setSnapshot(s, project, 'theme', theme)
      return theme
    },
  },
  {
    name: 'set_env',
    description:
      'Set or remove project env vars: { NAME: value } sets, { NAME: null } removes. API_URL is the base URL every endpoint is called against (relative, e.g. "/api", behind a dev proxy). Locked rows (API_URL, a sign-in’s vars) take values but cannot be removed.',
    inputSchema: writeInput({ project: PROJECT, vars: { type: 'object', additionalProperties: { type: ['string', 'null'] } } }, ['project', 'vars']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      let env = project.snapshot.env
      for (const [name, value] of Object.entries(optionalObject(i.vars, 'vars') ?? {})) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new ToolError('a var name is letters, digits and _', `vars.${name}`)
        const row = env.find((v) => v.name.trim() === name)
        if (value === null) {
          if (!row) continue
          if (row.locked) throw new ToolError('is locked (the studio or the sign-in reads it) — set a value instead', `vars.${name}`)
          env = env.filter((v) => v !== row)
        } else if (row) env = env.map((v) => (v === row ? { ...v, value: String(value) } : v))
        else env = [...env, { id: crypto.randomUUID(), name, value: String(value), locked: false }]
      }
      setSnapshot(s, project, 'env', env)
      return env.map((v) => ({ name: v.name, value: v.value, ...(v.locked ? { locked: true } : {}) }))
    },
  },
  {
    name: 'set_project_auth',
    description:
      'Pick the shared sign-in entry (Azure SSO, see upsert_auth) the project signs in with, or null for none. Attaches the entry’s profile endpoint and adds its four env vars (locked; values from the entry’s devValues).',
    inputSchema: writeInput({ project: PROJECT, auth: { type: ['string', 'null'], description: 'Sign-in entry name or id; null = no sign-in.' } }, ['project', 'auth']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const auth = s.ws.library.auth ?? []
      const def = i.auth == null ? null : auth.find((a) => a.id === i.auth || a.name === i.auth)
      if (i.auth != null && !def) throw new ToolError(`no sign-in entry "${i.auth}" (${auth.map((a) => a.name).join(', ') || 'none — create one with upsert_auth'})`, 'auth')
      s.setProjects(cmd.setProjectAuth(s.ws, project.id, def?.id ?? null, true))
      s.log('updated', 'auth', def?.name ?? 'none', def ? `${project.name} signs in with it` : `${project.name} has no sign-in`, project.id)
      const after = s.project(project.id)
      return { authId: after.snapshot.authId ?? null, env: after.snapshot.env.filter((v) => v.locked).map((v) => v.name) }
    },
  },
  {
    name: 'upsert_load',
    description:
      'Create or update a data load — on a page (`page`) or app-wide (no `page`, a global load: fetched once, kept across pages, cannot read URL params). Its data is a state slice named `key`, bound with { source: "state", key } / { type: "state", key, path }. `params` fills the endpoint URL :params, `extra` the query / body; a source reading another load chains them.',
    inputSchema: writeInput(
      {
        project: PROJECT,
        page: { ...PAGE, description: 'The page owning the load; absent = a global load.' },
        key: str('The slice name (unique). For an update: the current key or id.'),
        rename: str('A new key.'),
        endpoint: str('Endpoint name or id (attached for you).'),
        params: SOURCES,
        extra: SOURCES,
        paths: str('Dot path to the data in the response (e.g. "data").'),
        loading: LOADING,
        errorMessage: str('Snackbar text when it fails ("" = generic / silent).'),
      },
      ['project', 'key'],
    ),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const page = i.page ? s.page(project, i.page) : null
      const list = loadList(project, page?.id ?? null)
      const ref = String(i.key)
      const existing = list.find((l) => l.id === ref || l.key === ref)
      const key = i.rename ? String(i.rename) : (existing?.key ?? ref)
      if (!/^[A-Za-z_$][\w$]*$/.test(key)) throw new ToolError('a load key is an identifier', i.rename ? 'rename' : 'key')
      if (list.some((l) => l.key === key && l.id !== existing?.id)) throw new ToolError(`a load "${key}" already exists here`, 'key')
      const scope = refScope(project, s.ws.library, page?.id ?? null)
      const base = existing ?? createPageLoad(key)
      const read = {
        endpointId: i.endpoint !== undefined ? (resolveRefs({ endpointId: i.endpoint }, scope, 'endpoint') as { endpointId: string | null }).endpointId : base.read.endpointId,
        params: i.params !== undefined ? (resolveRefs(i.params, scope, 'params') as Record<string, NavParamSource>) : base.read.params,
        extra: i.extra !== undefined ? (resolveRefs(i.extra, scope, 'extra') as Record<string, NavParamSource>) : base.read.extra,
      }
      const load: PageLoadDef = {
        ...base,
        key,
        read,
        ...(i.paths !== undefined ? { paths: String(i.paths) } : {}),
        ...(i.loading !== undefined ? { loading: i.loading as PageLoadDef['loading'] } : {}),
        ...(i.errorMessage !== undefined ? { errorMessage: String(i.errorMessage) } : {}),
      }
      assertMatches('PageLoadDef', load, 'load')
      if (read.endpointId) {
        s.attachUsed(project.id, [read.endpointId])
        const url = s.ws.library.endpoints.find((e) => e.id === read.endpointId)?.url
        const unfilled = urlParamNames(url).filter((p) => !read.params[p])
        if (unfilled.length) s.warn(`${key}: the endpoint needs ${unfilled.map((p) => `:${p}`).join(', ')} in params — the load is held until it has them`)
      } else s.warn(`${key} has no endpoint yet`)
      if (!page && Object.values(read.params).some((src) => src.type === 'url')) s.warn(`${key} is global: URL params never resolve there`)
      if (page && (project.snapshot.globalLoads ?? []).some((l) => l.key === key)) s.warn(`a global load is also named "${key}" — they share one slice`)
      saveLoads(s, s.project(project.id), page?.id ?? null, existing ? list.map((l) => (l.id === existing.id ? load : l)) : [...list, load])
      return load
    },
  },
  {
    name: 'delete_load',
    description: 'Delete a page or global load. Needs confirm: true; without it, says whether anything still binds to it.',
    inputSchema: writeInput({ project: PROJECT, page: { ...PAGE, description: 'Absent = a global load.' }, load: str('Key or id.'), confirm: CONFIRM }, ['project', 'load']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const page = i.page ? s.page(project, i.page) : null
      const list = loadList(project, page?.id ?? null)
      const load = list.find((l) => l.id === i.load || l.key === i.load)
      if (!load) throw new ToolError(`no load "${i.load}" ${page ? `on ${page.key}` : 'among the global loads'}`, 'load')
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: load.key, stillReferenced: dangling(project, `"${load.id}"`) }
      saveLoads(s, project, page?.id ?? null, list.filter((l) => l.id !== load.id))
      return { deleted: load.key }
    },
  },
  {
    name: 'upsert_custom_action',
    description:
      'Declare a custom button action — a function the app registers (src/actions.ts) that a button chain calls as "fn:<name>". The name is a JS identifier; the code itself is written in the app.',
    inputSchema: writeInput({ project: PROJECT, name: str(''), description: str(''), rename: str('') }, ['project', 'name']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const next = upsertNamed<CustomActionDef>(
        project.snapshot.customActions ?? [],
        String(i.name),
        i.rename as string | undefined,
        () => createCustomActionDef(String(i.name)),
        i.description !== undefined ? { description: String(i.description) } : {},
        'custom action',
      )
      if (!isValidActionName(next.item.name)) throw new ToolError('must be a JS identifier (letters, digits, _ and $, not starting with a digit)', 'name')
      setSnapshot(s, project, 'customActions', next.list)
      return next.item
    },
  },
  {
    name: 'delete_custom_action',
    description: 'Remove a custom action declaration. Needs confirm: true (chains still naming it export fn:MISSING_ACTION).',
    inputSchema: writeInput({ project: PROJECT, action: str('Name or id.'), confirm: CONFIRM }, ['project', 'action']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const list = project.snapshot.customActions ?? []
      const def = list.find((a) => a.id === i.action || a.name === i.action)
      if (!def) throw new ToolError(`no custom action "${i.action}"`, 'action')
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: def.name, stillReferenced: dangling(project, `fn:${def.id}`) }
      setSnapshot(s, project, 'customActions', list.filter((a) => a.id !== def.id))
      return { deleted: def.name }
    },
  },
  {
    name: 'upsert_custom_component',
    description:
      'Declare a custom component — a React component the app registers (src/components.tsx) that a `custom` item renders by name — with its typed props: [{ key, kind: text|number|boolean|select|json, label, options (select), defaultValue }]. `props` replaces the list.',
    inputSchema: writeInput(
      { project: PROJECT, name: str('A JS identifier, e.g. StatBadge.'), description: str(''), props: { type: 'array', items: { type: 'object' } }, rename: str('') },
      ['project', 'name'],
    ),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const patch: Partial<CustomComponentDef> = {}
      if (i.description !== undefined) patch.description = String(i.description)
      if (i.props !== undefined) {
        if (!Array.isArray(i.props)) throw new ToolError('must be an array', 'props')
        patch.props = i.props.map((p, k) => {
          const prop = { key: '', kind: 'text', label: '', options: [], defaultValue: '', ...(p as object) } as CustomPropDef
          assertMatches('CustomPropDef', prop, `props[${k}]`)
          return prop
        })
      }
      const next = upsertNamed<CustomComponentDef>(
        project.snapshot.customComponents ?? [],
        String(i.name),
        i.rename as string | undefined,
        () => createCustomComponentDef(String(i.name)),
        patch,
        'custom component',
      )
      if (!isValidComponentName(next.item.name)) throw new ToolError('must be a JS identifier', 'name')
      setSnapshot(s, project, 'customComponents', next.list)
      return next.item
    },
  },
  {
    name: 'delete_custom_component',
    description: 'Remove a custom component declaration. Needs confirm: true (items still mapped to it export MISSING_COMPONENT).',
    inputSchema: writeInput({ project: PROJECT, component: str('Name or id.'), confirm: CONFIRM }, ['project', 'component']),
    write: true,
    run: (s, i) => {
      const project = s.project(i.project)
      const list = project.snapshot.customComponents ?? []
      const def = list.find((c) => c.id === i.component || c.name === i.component)
      if (!def) throw new ToolError(`no custom component "${i.component}"`, 'component')
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: def.name, stillReferenced: dangling(project, `"${def.id}"`) }
      setSnapshot(s, project, 'customComponents', list.filter((c) => c.id !== def.id))
      return { deleted: def.name }
    },
  },
]
