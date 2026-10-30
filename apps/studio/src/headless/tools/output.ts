import { assertGummyProject, type GummyProject } from '@gummy-ui/ui/headless'
import { conditionIssues, libraryIssues } from '../../components/Workspace/logic'
import { urlParams } from '../../components/Api/warnings'
import { walkItems } from '../../components/Layout/pageLinks'
import {
  CHART_TYPE_FEATURES,
  FILE_COLLECTION_BODY_SLOTS,
  FILE_COLLECTION_MUTATION_SLOTS,
  LOW_CONTRAST_HUES,
  MAX_SERIES,
  type ChartConfig,
  type FileCollectionConfig,
} from '../../components/Layout/types'
import { projectToRuntime } from '../../components/Workspace/runtimeProject'
import type { LibraryData, ProjectDef, WorkspaceData } from '../../components/Workspace/types'
import { input, PROJECT, type Tool } from './shared'

/** Where each `MISSING_*` sentinel sits in the runtime document (an export of a reference that resolves to nothing). */
function missingRefs(doc: unknown): string[] {
  const out: string[] = []
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'string') {
      const m = /MISSING_[A-Z_]+/.exec(node)
      if (m) out.push(`${path}: ${m[0]}`)
    } else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`))
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k)
  }
  walk(doc, '')
  return out
}

/**
 * The file collections' slot checks (spec §8 + amendment 5): a wired slot
 * whose URL `:param` is unmapped (no source, or a `row` source with no
 * field), and a body-bearing slot whose endpoint declares no body model —
 * the engine would send no body.
 */
export function fileCollectionWarnings(project: ProjectDef, library: LibraryData): string[] {
  const out: string[] = []
  for (const page of project.snapshot.pages) {
    walkItems(page.grid.items, (item) => {
      if (item.type !== 'filecollection' || !item.config) return
      const c = item.config as FileCollectionConfig
      const at = `${page.key} / ${c.name}`
      const slots = ['list', ...FILE_COLLECTION_MUTATION_SLOTS] as const
      for (const slot of slots) {
        const ref = c.endpoints[slot]
        if (ref.endpointId == null) continue
        const endpoint = library.endpoints.find((e) => e.id === ref.endpointId)
        if (!endpoint) continue
        for (const k of urlParams(endpoint.url)) {
          const src = ref.params[k]
          if (!src || (src.type === 'row' && !src.key)) out.push(`${at}: ${slot} leaves :${k} of ${endpoint.name} unmapped`)
        }
        if (slot !== 'list' && FILE_COLLECTION_BODY_SLOTS.has(slot) && endpoint.body == null)
          out.push(`${at}: ${slot} endpoint ${endpoint.name} declares no body model — the engine sends none`)
      }
    })
  }
  return out
}

const isNumeric = (text: string) => text.trim() !== '' && Number.isFinite(Number(text))

/**
 * The charts' checks (spec §3.6). Errors: a field the type needs left blank,
 * the wrong series count, `splitBy` where it isn't supported, a right axis
 * off `barLine`, a reference line that is neither a number nor a path (or a
 * path over page data), a non-numeric gauge band, a filter-sourced request
 * key (a chart has no filter form), an unmapped `:param` of `clickNavigate`.
 * Warnings: no source, more than eight series, a repeated colour, a
 * low-contrast hue, `barLine` on the right axis.
 */
export function chartChecks(project: ProjectDef, library: LibraryData): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  for (const page of project.snapshot.pages) {
    walkItems(page.grid.items, (item) => {
      if (item.type !== 'chart' || !item.config) return
      const c = item.config as ChartConfig
      const f = CHART_TYPE_FEATURES[c.type]
      const at = `${page.key} / ${c.name || item.id}`
      const o = c.options
      if (f.xField && !c.xField.trim()) errors.push(`${at}: ${c.type} needs xField`)
      if (c.series.length === 0) errors.push(`${at}: no series`)
      if (f.singleSeries && c.series.length > 1) errors.push(`${at}: ${c.type} reads exactly one series (${c.series.length} given)`)
      if (c.splitBy && !f.splitBy) errors.push(`${at}: splitBy is not supported on ${c.type}`)
      if (c.splitBy && f.splitBy && c.series.length > 1) errors.push(`${at}: splitBy takes one series (the value field)`)
      if (c.type !== 'barLine' && c.series.some((s) => s.axis === 'right')) errors.push(`${at}: series[].axis "right" is for barLine`)
      if (c.type === 'barLine' && c.series.length > 0 && c.series.every((s) => s.axis === 'right')) errors.push(`${at}: barLine has every series on the right axis`)
      if (c.type === 'scatter' && !o.xField.trim()) errors.push(`${at}: scatter needs options.xField`)
      if (c.type === 'heatmap' && !o.yField.trim()) errors.push(`${at}: heatmap needs options.yField`)
      if (c.type === 'heatmap' && !o.valueField.trim()) errors.push(`${at}: heatmap needs options.valueField`)
      for (const line of c.referenceLines) {
        const text = line.value.trim()
        if (text === '') errors.push(`${at}: a reference line has no value`)
        else if (!isNumeric(text) && c.rowsBinding) errors.push(`${at}: reference line "${text}" is a path, but the rows come from page data`)
      }
      if (c.type === 'gauge') {
        o.bands.forEach((b, i) => {
          if (b.to.trim() === '' ? i !== o.bands.length - 1 : !isNumeric(b.to)) errors.push(`${at}: gauge band ${i + 1} needs a numeric bound`)
        })
      }
      for (const row of c.requestMapping) {
        if (row.source.type === 'filter') errors.push(`${at}: request key "${row.key}" reads a filter field — a chart has no filter form`)
      }
      if (c.clickNavigate?.pageId) {
        const target = project.snapshot.pages.find((p) => p.id === c.clickNavigate!.pageId)
        for (const k of urlParams(target?.path ?? '')) {
          const src = c.clickNavigate.params[k]
          if (!src || (src.type === 'row' && !src.key) || (src.type === 'value' && !src.value)) errors.push(`${at}: clickNavigate leaves :${k} unmapped`)
        }
      }
      if (c.endpointId == null && !c.rowsBinding) warnings.push(`${at}: no endpoint and no page data — the chart renders its empty state`)
      if (c.endpointId != null && !library.endpoints.some((e) => e.id === c.endpointId)) warnings.push(`${at}: endpoint ${c.endpointId} is not in the library`)
      if (!c.splitBy && c.series.length > MAX_SERIES) warnings.push(`${at}: ${c.series.length} series — the ${MAX_SERIES + 1}th and later fold into "Other"`)
      const colors = new Map<string, number>()
      for (const s of c.series) if (s.color) colors.set(s.color, (colors.get(s.color) ?? 0) + 1)
      for (const [color, n] of colors) if (n > 1) warnings.push(`${at}: colour "${color}" is used by ${n} series`)
      for (const s of c.series) if (s.color && LOW_CONTRAST_HUES.has(s.color)) warnings.push(`${at}: "${s.color}" has low contrast as a series colour`)
      if (c.type === 'barLine' && c.series.some((s) => s.axis === 'right')) warnings.push(`${at}: barLine uses the right axis — only when the measures differ in scale`)
    })
  }
  return { errors, warnings }
}

export type ValidationReport = { ok: boolean; errors: string[]; warnings: string[] }

/** A project's runtime document and what is wrong with it: the engine's structural check, then every dangling reference. */
export function validateProject(ws: WorkspaceData, projectId: string): ValidationReport & { document?: GummyProject } {
  const project = ws.projects.find((p) => p.id === projectId)
  if (!project) return { ok: false, errors: [`no project ${projectId}`], warnings: [] }
  let document: GummyProject
  try {
    document = projectToRuntime(project, ws.library)
  } catch (err) {
    return { ok: false, errors: [`export failed: ${(err as Error).message}`], warnings: [] }
  }
  const errors: string[] = []
  try {
    assertGummyProject(document)
  } catch (err) {
    errors.push((err as Error).message)
  }
  const charts = chartChecks(project, ws.library)
  errors.push(...charts.errors)
  // Logic: the saved items' own problems, and conditions naming a deleted / non-boolean rule.
  const formulas = project.snapshot.formulas ?? []
  const rules = project.snapshot.rules ?? []
  const logic = libraryIssues(formulas, rules)
  for (const pg of project.snapshot.pages)
    walkItems(pg.grid.items, (item) => {
      for (const key of ['condition', 'enabledWhen'] as const)
        logic.push(...conditionIssues(item[key], rules, formulas, `page ${pg.name} › ${item.label} › ${key === 'condition' ? 'Show when' : 'Enabled when'}`))
    })
  for (const issue of logic) (issue.level === 'error' ? errors : []).push(`${issue.where}: ${issue.message}`)
  const warnings = missingRefs(document).map((w) => `reference to nothing at ${w}`)
  warnings.push(...fileCollectionWarnings(project, ws.library), ...charts.warnings)
  warnings.push(...logic.filter((x) => x.level === 'warning').map((x) => `${x.where}: ${x.message}`))
  for (const id of project.snapshot.endpointIds) {
    if (!ws.library.endpoints.some((e) => e.id === id)) warnings.push(`attached endpoint ${id} is not in the library`)
  }
  return { ok: errors.length === 0, errors, warnings, document }
}

export const outputTools: Tool[] = [
  {
    name: 'validate_project',
    description:
      'Build the project’s runtime document (what <GummyApp> renders) and check it: errors = the document fails the engine’s checks; warnings = references that resolve to nothing (MISSING_PAGE / MISSING_ENDPOINT / MISSING_LOAD …, with their path).',
    inputSchema: input({ project: PROJECT }, ['project']),
    write: false,
    run: (s, i) => {
      const { ok, errors, warnings } = validateProject(s.ws, s.project(i.project).id)
      return { ok, errors, warnings }
    },
  },
  {
    name: 'export_project',
    description: 'The project’s runtime document (GummyProject, schemaVersion 1) with its pages inline — the same JSON the save writes split into gummy/projects/<key>/.',
    inputSchema: input({ project: PROJECT }, ['project']),
    write: false,
    run: (s, i) => projectToRuntime(s.project(i.project), s.ws.library),
  },
]
