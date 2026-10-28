import type { EndpointDef } from '../Api/types'
import { buttonNavigates, walkItems } from '../Layout/pageLinks'
import type { ButtonItemConfig, DataTableConfig, FileCollectionConfig, GridItemData } from '../Layout/types'
import type { ModelDef } from '../Model/types'
import { pathParams } from './snapshots'
import type { PageDef, ProjectDef } from './types'
import { makeActionKeyResolver, toActionsTs, type CustomActionRef } from './customActions'
import { toComponentsTsx } from './customComponents'
import { pickedAuth, projectKey, runtimeDocument } from './runtimeProject'
import { useWorkspaceStore } from './workspaceStore'
import { DEFAULT_AUTH_ENV_NAMES } from '@gummy-ui/ui'

export type ExportFile = { name: string; lang: 'json' | 'ts' | 'md'; body: string }

/** Every endpoint a page's components are bound to, by current name. */
export function pageEndpointNames(page: PageDef, endpoints: EndpointDef[]): string[] {
  const byId = new Map(endpoints.map((e) => [e.id, e.name]))
  const out = new Set<string>()
  walkItems(page.grid.items, (item) => {
    const c = item.config as Record<string, unknown> | undefined
    if (!c) return
    for (const [k, v] of Object.entries(c)) {
      if (/endpointId$/i.test(k) && typeof v === 'string' && byId.has(v)) out.add(byId.get(v)!)
    }
  })
  return [...out]
}

/** Every item on a page, child canvases included. */
export function pageItemCount(page: PageDef): number {
  let n = 0
  walkItems(page.grid.items, () => n++)
  return n
}

function pageButtons(
  items: GridItemData[],
  pages: PageDef[],
  customActions: CustomActionRef[] = [],
): { label: string; does: string }[] {
  const out: { label: string; does: string }[] = []
  const pageName = (id: string) => pages.find((p) => p.id === id)?.name ?? 'a missing page'
  const actionKey = makeActionKeyResolver(customActions)
  walkItems(items, (item) => {
    if (!item.config) return
    if (item.type === 'datatable') {
      const t = item.config as DataTableConfig
      if (t.rowNavigate?.pageId)
        out.push({ label: `${t.title || t.name} row`, does: `go to ${pageName(t.rowNavigate.pageId)}` })
      return
    }
    if (item.type === 'filecollection') {
      const f = item.config as FileCollectionConfig
      if (f.selectNavigate?.pageId) out.push({ label: `${f.title || f.name} file`, does: `go to ${pageName(f.selectNavigate.pageId)}` })
      return
    }
    if (item.type !== 'button') return
    const c = item.config as ButtonItemConfig
    const parts: string[] = []
    const actions = c.mode === 'confirm' ? c.confirmTrue : c.actions
    if (c.mode === 'confirm') parts.push('confirm first')
    if (actions.length) parts.push(actions.map(actionKey).join(' → '))
    if (buttonNavigates(c) && c.navigate?.pageId) parts.push(`go to ${pageName(c.navigate.pageId)}`)
    if (parts.length) out.push({ label: c.label || 'button', does: parts.join(', ') })
  })
  return out
}

/**
 * The hand-off bundle (see the grilled library / CLI design): the runtime
 * project document `<GummyApp>` renders — single-file here (every page
 * inline, `<key>.json`); `gummy studio` and Export to project write the same
 * document split into `gummy/projects/<key>/` — plus the typed stubs for the
 * custom actions / components the app still has to code, and a README. No
 * generated TypeScript configs: the engine renders the JSON as is.
 */
export function buildExportFiles(
  project: ProjectDef,
  endpoints: EndpointDef[],
  models: ModelDef[],
): ExportFile[] {
  const { snapshot } = project
  const globalLoads = snapshot.globalLoads ?? []
  const customActions = snapshot.customActions ?? []
  const customComponents = snapshot.customComponents ?? []
  const key = projectKey(project.name)
  // The picked sign-in entry lives in the shared library (not on the project).
  const auth = pickedAuth(project.snapshot, useWorkspaceStore.getState().library)
  const doc = runtimeDocument({ ...project, auth }, endpoints, models)

  const out: ExportFile[] = []
  out.push({ name: `${key}.json`, lang: 'json', body: JSON.stringify(doc, null, 2) + '\n' })
  // The custom-action stubs the app's developer fills in (see customActions.ts).
  if (customActions.length) out.push({ name: 'actions.ts', lang: 'ts', body: toActionsTs(customActions) })
  // The custom-component stubs the app's developer fills in (see customComponents.ts).
  if (customComponents.length) out.push({ name: 'components.tsx', lang: 'ts', body: toComponentsTsx(customComponents) })

  const lines: string[] = [`# ${project.name}`, '', project.description || '', '']
  lines.push(
    '## Run it',
    '',
    `The app is data. \`gummy studio\` (and Export to project) write it as the folder \`gummy/projects/${key}/\` — \`project.json\` with the routes, menu, models and endpoints, and one \`pages/<page>.json\` per page, loaded on its first visit so a large app starts with only what the first page needs. \`${key}.json\` in this bundle is the same project with every page inline; both render. Install \`@gummy-ui/ui\`, import its stylesheet, and render the document inside your router:`,
    '',
    '```tsx',
    'import { BrowserRouter } from "react-router-dom";',
    'import { GummyApp, globPageLoader } from "@gummy-ui/ui";',
    'import "@gummy-ui/ui/styles.css";',
    `import project from "./gummy/projects/${key}/project.json";`,
    '',
    '// Each page file becomes its own chunk, fetched on the first visit.',
    `const loadPage = globPageLoader(import.meta.glob("./gummy/projects/*/pages/*.json", { import: "default" }), "./gummy/projects/${key}");`,
    ...(customActions.length ? ['import { actions } from "./actions";'] : []),
    ...(customComponents.length ? ['import { components } from "./components";'] : []),
    '',
    '<BrowserRouter>',
    '  <GummyApp',
    '    project={project}',
    '    loadPage={loadPage}',
    ...(doc.auth ? [] : ['    getToken={async () => "<bearer token>"}']),
    '    env={{ API_URL: import.meta.env.VITE_API_URL }}',
    ...(customActions.length ? ['    actions={actions}'] : []),
    ...(customComponents.length ? ['    components={components}'] : []),
    '  />',
    '</BrowserRouter>',
    '```',
    '',
    'With `@gummy-ui/studio` installed, `gummy studio` keeps `gummy/projects/` up to date on every save (only the pages that changed are rewritten, and page files of deleted pages are removed), so nothing here needs to be copied by hand. Without a bundler, serve `gummy/` statically and pass `projectUrl="/gummy/projects/' + key + '/"` instead of `loadPage`.',
    '',
    '## Pages',
    '',
  )
  for (const pg of snapshot.pages) {
    const params = pathParams(pg.path)
    lines.push(`### ${pg.name}  \`${pg.path}\``)
    lines.push(`- key: \`${pg.key}\``)
    if (params.length) lines.push(`- expects: ${params.map((x) => `\`${x}\``).join(', ')}`)
    if (pg.parentId) {
      const parent = snapshot.pages.find((x) => x.id === pg.parentId)
      lines.push(`- breadcrumb: under ${parent ? `\`${parent.key}\`` : 'a deleted page (MISSING_PAGE)'}`)
    }
    if (pg.hideBreadcrumbs) lines.push('- breadcrumb strip hidden on this page')
    const eps = pageEndpointNames(pg, endpoints)
    if (eps.length) lines.push(`- data: ${eps.map((x) => `\`${x}\``).join(', ')}`)
    if (pg.loads?.length) lines.push(`- page loads: ${pg.loads.map((l) => `\`${l.key}\``).join(', ')}`)
    const buttons = pageButtons(pg.grid.items, snapshot.pages, customActions)
    if (buttons.length)
      lines.push(`- actions: ${buttons.map((b) => `\`${b.label}\` → ${b.does}`).join('; ')}`)
    lines.push(`- ${pageItemCount(pg)} component(s)`, '')
  }
  if (globalLoads.length) {
    lines.push('## Global loads', '', 'Fetched once when the app starts and kept across pages:', '')
    for (const l of globalLoads) lines.push(`- \`${l.key}\``)
    lines.push('')
  }
  if (customActions.length) {
    lines.push(
      '## Custom actions',
      '',
      'Named in button action chains as `fn:<name>`; the code lives in `actions.ts` (typed stubs to fill in), passed to `<GummyApp actions={actions}>`:',
      '',
    )
    for (const a of customActions)
      lines.push(`- \`${a.name.trim() || '(unnamed)'}\`${a.description.trim() ? ` — ${a.description.trim()}` : ''}`)
    lines.push('')
  }
  if (customComponents.length) {
    lines.push(
      '## Custom components',
      '',
      'Placed by `custom` bins naming them; the code lives in `components.tsx` (typed stubs to fill in — copy it, it is re-generated on every export), passed to `<GummyApp components={components}>`:',
      '',
    )
    for (const c of customComponents) {
      const props = c.props.filter((p) => p.key.trim()).map((p) => `\`${p.key.trim()}\` (${p.kind})`)
      lines.push(`- \`${c.name.trim() || '(unnamed)'}\`${c.description.trim() ? ` — ${c.description.trim()}` : ''}${props.length ? ` · props: ${props.join(', ')}` : ''}`)
    }
    lines.push('')
  }
  if (doc.auth) {
    const names = { ...DEFAULT_AUTH_ENV_NAMES, ...doc.auth.env }
    lines.push(
      '## Azure SSO',
      '',
      'The document carries `auth` (an Azure SSO entry from the shared library): `<GummyApp>` shows the sign-in screen until the user signs in, passes the bearer token on every request, and' +
        (doc.auth.profile ? ` loads the profile through \`${doc.auth.profile.api.name}\` into the \`${doc.auth.profile.stateKey ?? 'me'}\` state slice (a failed fetch shows the denied screen).` : ' fetches no profile.'),
      '',
      'Set these env vars per environment (names from the entry; blank ⇒ the app warns and sign-in cannot work):',
      '',
      `- \`${names.tenantId}\` — the Azure AD tenant id`,
      `- \`${names.clientId}\` — the app registration (client) id`,
      `- \`${names.redirectUri}\` — the redirect URL (blank ⇒ the page origin)`,
      `- \`${names.scope}\` — the API scope (\`api://<client-id>/.default\`)`,
      '',
      'Without a tenant yet, sign a mock account in: `<GummyApp auth={{ mock: { email: "you@example.com" } }} />` (the profile fetch still runs). Remove the `mock` before shipping.',
      '',
    )
  }
  lines.push('## Endpoints', '')
  for (const a of endpoints) {
    const refs = ['response', 'query', 'parameter', 'body']
      .map((k) => models.find((m) => m.id === (a as unknown as Record<string, string | null>)[k])?.name)
      .filter(Boolean)
    lines.push(`- \`${a.method} ${a.url}\` — ${a.name}${refs.length ? `  · models: ${refs.join(', ')}` : ''}`)
  }
  lines.push('', '## Environment', '', 'The document carries these as `env`; `API_URL` is the HTTP base URL. Override any of them per environment with the `env` prop:', '')
  for (const e of snapshot.env) lines.push(`- \`${e.name}\` = ${e.value}`)
  lines.push('')
  out.push({ name: 'HANDOFF.md', lang: 'md', body: lines.join('\n') })

  return out
}
