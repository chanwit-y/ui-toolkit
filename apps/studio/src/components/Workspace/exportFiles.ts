import { toApiTs } from '../Api/serialize'
import type { EndpointDef } from '../Api/types'
import { buildBins } from '../Layout/gridConfig'
import { pageLinks, walkItems } from '../Layout/pageLinks'
import type { ButtonItemConfig, GridItemData } from '../Layout/types'
import { toModelTs } from '../Model/serialize'
import type { ModelDef } from '../Model/types'
import { toThemeTs } from '../Theme/serialize'
import { pathParams } from './snapshots'
import type { PageDef, ProjectDef } from './types'

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

function pageButtons(items: GridItemData[]): { label: string; does: string }[] {
  const out: { label: string; does: string }[] = []
  walkItems(items, (item) => {
    if (item.type !== 'button' || !item.config) return
    const c = item.config as ButtonItemConfig
    const parts: string[] = []
    const actions = c.mode === 'confirm' ? c.confirmTrue : c.actions
    if (c.mode === 'confirm') parts.push('confirm first')
    if (actions.length) parts.push(actions.join(' → '))
    const nav = c.navigation
    if (nav?.kind === 'page') parts.push('go to a page')
    else if (nav?.kind === 'link') parts.push(`open ${nav.href || 'a link'}`)
    else if (nav?.kind === 'toast' || nav?.kind === 'dialog') parts.push(`show a ${nav.kind}`)
    if (parts.length) out.push({ label: c.label || 'button', does: parts.join(', ') })
  })
  return out
}

/**
 * The hand-off bundle (the mockup's `exportFiles`): the whole project as
 * data, the contracts in the shape the team already writes (`api.ts`,
 * `model.ts`, `theme.ts`), the routes with their parameters, and a README a
 * developer can actually read. `project.json` carries every page's engine
 * bins as the code tab exports them, design-only items and navigation
 * included, so a runtime (or a person) has everything in one file.
 */
export function buildExportFiles(
  project: ProjectDef,
  endpoints: EndpointDef[],
  models: ModelDef[],
): ExportFile[] {
  const { snapshot } = project
  const pages = snapshot.pages.map((pg) => ({
    id: pg.id,
    name: pg.name,
    path: pg.path,
    params: pathParams(pg.path),
    endpoints: pageEndpointNames(pg, endpoints),
    links: pageLinks(pg).map((l) =>
      l.kind === 'page'
        ? { via: l.via, to: snapshot.pages.find((p) => p.id === l.pageId)?.path ?? null }
        : l.kind === 'link'
          ? { via: l.via, href: l.href }
          : { via: l.via, shows: l.kind },
    ),
    grid: {
      columns: pg.grid.containerSettings.columns,
      gap: pg.grid.containerSettings.gap,
    },
    bins: buildBins(pg.grid.containerSettings, pg.grid.items, endpoints),
  }))

  const out: ExportFile[] = []

  out.push({
    name: 'project.json',
    lang: 'json',
    body: JSON.stringify(
      {
        name: project.name,
        description: project.description,
        env: snapshot.env.map((e) => ({ key: e.name, value: e.value })),
        theme: snapshot.theme,
        pages,
        endpoints: endpoints.map((a) => ({
          name: a.name,
          url: a.url,
          method: a.method,
          description: a.description,
          response: models.find((m) => m.id === a.response)?.name ?? null,
          query: models.find((m) => m.id === a.query)?.name ?? null,
          parameter: models.find((m) => m.id === a.parameter)?.name ?? null,
          body: models.find((m) => m.id === a.body)?.name ?? null,
        })),
      },
      null,
      2,
    ),
  })

  out.push({ name: 'api.ts', lang: 'ts', body: toApiTs(endpoints, models) })
  out.push({ name: 'model.ts', lang: 'ts', body: toModelTs(models) })
  out.push({ name: 'theme.ts', lang: 'ts', body: toThemeTs(snapshot.theme) })

  out.push({
    name: 'routes.ts',
    lang: 'ts',
    body:
      'export const routes = [\n' +
      pages
        .map(
          (pg) =>
            `  { name: ${JSON.stringify(pg.name)}, path: ${JSON.stringify(pg.path)}, params: [${pg.params
              .map((x) => JSON.stringify(x))
              .join(', ')}] },`,
        )
        .join('\n') +
      '\n];\n',
  })

  const lines: string[] = [`# ${project.name}`, '', project.description || '', '', '## Pages', '']
  for (const pg of snapshot.pages) {
    const params = pathParams(pg.path)
    lines.push(`### ${pg.name}  \`${pg.path}\``)
    if (params.length) lines.push(`- expects: ${params.map((x) => `\`${x}\``).join(', ')}`)
    const eps = pageEndpointNames(pg, endpoints)
    if (eps.length) lines.push(`- data: ${eps.map((x) => `\`${x}\``).join(', ')}`)
    const buttons = pageButtons(pg.grid.items)
    if (buttons.length)
      lines.push(`- actions: ${buttons.map((b) => `\`${b.label}\` → ${b.does}`).join('; ')}`)
    lines.push(`- ${pageItemCount(pg)} component(s)`, '')
  }
  lines.push('## Endpoints', '')
  for (const a of endpoints) {
    const refs = ['response', 'query', 'parameter', 'body']
      .map((k) => models.find((m) => m.id === (a as unknown as Record<string, string | null>)[k])?.name)
      .filter(Boolean)
    lines.push(`- \`${a.method} ${a.url}\` — ${a.name}${refs.length ? `  · models: ${refs.join(', ')}` : ''}`)
  }
  lines.push('', '## Environment', '')
  for (const e of snapshot.env) lines.push(`- \`VITE_${e.name}\` = ${e.value}`)
  lines.push('')
  out.push({ name: 'HANDOFF.md', lang: 'md', body: lines.join('\n') })

  return out
}
