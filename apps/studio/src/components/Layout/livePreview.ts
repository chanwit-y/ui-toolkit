import type { Bin, Container } from '@gummy-ui/ui'
import { gridConfigToJson, MISSING_ENDPOINT, rootContainer, type EndpointRef, type PageRef } from './gridConfig'
import { isClickOnlyOverlay } from './designTypes'
import type { DesignNavigation, GridContainerSettings, GridItemData } from './types'

/**
 * Builds the `Container` the live-preview modal feeds to the real engine
 * (`ContainerBuilder`). Deliberately round-trips through the exported JSON
 * *string* (`gridConfigToJson` → `JSON.parse`) rather than reusing `buildBins`'
 * objects — the preview renders exactly what a consumer pasting the code-tab
 * JSON would get, so serializer bugs surface here instead of in their app.
 *
 * API-dependent bins render FOR REAL when their wiring resolves (see the
 * grilled Env design): the modal builds an ApiMaster from the Model + API
 * stores with the Env page's API_URL as base URL, so a bin whose `api` name
 * exists in that master fetches live. A bin whose wiring doesn't resolve is
 * rewritten to an engine `text` placeholder that keeps its spans (so the
 * layout stays truthful) and says *why*: no endpoint picked, endpoint missing
 * (deleted/renamed on the API page), or API_URL unset on the Env page.
 *
 * Element-less bins (types studio can't author) are placeholder-rewritten too;
 * `empty`/`container` pass through: the engine renders them as an empty cell /
 * nested grid, which is the truthful preview.
 */

/** Bin as parsed back from the exported JSON — structurally a `Bin`, but we
 * only dare read from it loosely. */
type ParsedBin = Record<string, unknown> & { element?: Record<string, unknown> }

/** What the preview can wire against: the Env base URL, the endpoint names
 * that exist in the ApiMaster the modal built, and the subset that can
 * actually fetch (a valid response-model ref — the engine's schema conversion
 * crashes without one, so those stay placeholders instead). */
export type LivePreviewWiring = {
  apiUrl: string
  apiNames: ReadonlySet<string>
  fetchableNames: ReadonlySet<string>
}

const API_PLACEHOLDER_LABEL: Record<string, string> = {
  datatable: 'Data Table',
  datatableeditable: 'Editable Table',
  autocomplete: 'Autocomplete',
  multiAutocomplete: 'Multi Autocomplete',
}

/** Types the engine renders fine without an `element` (empty cell / nested
 * container fallback). */
const ELEMENT_OPTIONAL_TYPES = new Set(['empty', 'container'])

function placeholderBin(bin: ParsedBin, text: string): ParsedBin {
  return {
    sm: bin.sm,
    md: bin.md,
    lg: bin.lg,
    xl: bin.xl,
    type: 'text',
    ...(bin.justifySelf !== undefined ? { justifySelf: bin.justifySelf } : {}),
    ...(bin.alignSelf !== undefined ? { alignSelf: bin.alignSelf } : {}),
    element: { text, isLabel: true },
  }
}

/**
 * Why an api name can't fetch in this preview, or null when it can. The check
 * order puts the author's own gaps first (nothing picked → missing endpoint)
 * and the environment last.
 */
function wiringGap(name: unknown, wiring: LivePreviewWiring): string | null {
  const n = typeof name === 'string' ? name : ''
  if (!n) return 'no endpoint picked'
  if (n === MISSING_ENDPOINT || !wiring.apiNames.has(n))
    return `endpoint "${n}" not found — check the API page`
  if (!wiring.fetchableNames.has(n))
    return `endpoint "${n}" needs a response model — check the API page`
  if (!wiring.apiUrl) return 'set API_URL on the Env page'
  return null
}

/** Recursively sanitize a nested engine Container's bins (returns a rewritten
 * copy; the nested grid settings pass through untouched). */
function toPreviewContainer(
  container: Record<string, unknown>,
  wiring: LivePreviewWiring,
): Record<string, unknown> {
  const bins = container.bins
  if (!Array.isArray(bins)) return container
  return { ...container, bins: previewBins(bins as ParsedBin[], wiring) }
}

/** A toast/dialog that only appears on a button click is not on the page. */
function isClickOnlyBin(bin: ParsedBin): boolean {
  const design = bin.designOnly as { type?: string; config?: unknown } | undefined
  return !!design && isClickOnlyOverlay(String(design.type), design.config)
}

function previewBins(bins: ParsedBin[], wiring: LivePreviewWiring): ParsedBin[] {
  return bins.filter((b) => !isClickOnlyBin(b)).map((b) => toPreviewBin(b, wiring))
}

/** A button's design-only navigation as exported on its bin, keyed by label. */
export type PreviewNavigation = DesignNavigation & { label: string }

/**
 * Collect every button's design-only navigation across the exported bins
 * (nested containers, papers, tabs and modals included). The Live Preview
 * matches a clicked engine button back to its navigation by label — the engine
 * `ButtonElement` carries no id, so the label is the only handle; two buttons
 * sharing a label share the first one's navigation.
 */
export function collectPreviewNavigation(bins: ParsedBin[]): Map<string, PreviewNavigation> {
  const out = new Map<string, PreviewNavigation>()
  const visit = (list: unknown) => {
    if (!Array.isArray(list)) return
    for (const bin of list as ParsedBin[]) {
      const nav = bin.designNavigation as PreviewNavigation | undefined
      if (nav && nav.kind !== 'none' && !out.has(nav.label)) out.set(nav.label, nav)
      const el = bin.element
      if (bin.container && typeof bin.container === 'object')
        visit((bin.container as Record<string, unknown>).bins)
      if (el?.container && typeof el.container === 'object')
        visit((el.container as Record<string, unknown>).bins)
      if (Array.isArray(el?.tabs))
        for (const tab of el.tabs as Record<string, unknown>[])
          if (tab.container && typeof tab.container === 'object')
            visit((tab.container as Record<string, unknown>).bins)
    }
  }
  visit(bins)
  return out
}

function toPreviewBin(bin: ParsedBin, wiring: LivePreviewWiring): ParsedBin {
  const type = String(bin.type)
  const el = bin.element

  // Design-only kinds (see `designTypes.ts`): the library has no component
  // yet, so the preview shows where it goes and says so.
  const design = bin.designOnly as
    | { type?: string; label?: string; config?: Record<string, unknown> }
    | undefined
  if (design) {
    const cfg = design.config ?? {}
    const name = String(cfg.title ?? cfg.label ?? cfg.text ?? design.label ?? '')
    return placeholderBin(
      bin,
      `[ ${design.label ?? design.type}${name && name !== design.label ? ` "${name}"` : ''} — design only, not in @gummy-ui/ui yet ]`,
    )
  }
  const displayName = el ? String(el.title ?? el.name ?? '') : ''
  const label = API_PLACEHOLDER_LABEL[type] ?? type

  // API-dependent bins render live when their wiring resolves, else a
  // placeholder explaining the gap. Autocompletes only in `source` mode (a
  // static-options select has no `api` key and previews for real regardless).
  if (type === 'datatable') {
    const gap = wiringGap((el?.api as Record<string, unknown> | undefined)?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if (type === 'datatableeditable') {
    const read = (el?.apiCrud as Record<string, Record<string, unknown>> | undefined)?.read
    const gap = wiringGap(read?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if (
    (type === 'autocomplete' || type === 'multiAutocomplete') &&
    el !== undefined &&
    'api' in el
  ) {
    const gap = wiringGap((el.api as Record<string, unknown>)?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  }

  if (el === undefined && !ELEMENT_OPTIONAL_TYPES.has(type)) {
    return placeholderBin(bin, `[ ${type} — not previewable ]`)
  }

  // Recurse into nested containers so an API-dependent bin inside a
  // container/paper/tab/modal/popover is wiring-checked too.
  if (bin.container && typeof bin.container === 'object') {
    bin = {
      ...bin,
      container: toPreviewContainer(bin.container as Record<string, unknown>, wiring),
    }
  }
  if (el?.container && typeof el.container === 'object') {
    bin = {
      ...bin,
      element: {
        ...el,
        container: toPreviewContainer(el.container as Record<string, unknown>, wiring),
      },
    }
  }
  if (Array.isArray(el?.tabs)) {
    bin = {
      ...bin,
      element: {
        ...(bin.element as Record<string, unknown>),
        tabs: (el.tabs as Record<string, unknown>[]).map((tab) =>
          tab.container && typeof tab.container === 'object'
            ? {
                ...tab,
                container: toPreviewContainer(
                  tab.container as Record<string, unknown>,
                  wiring,
                ),
              }
            : tab,
        ),
      },
    }
  }

  return bin
}

/** Serialize the canvas to its exported JSON, parse it back, swap in
 * placeholders for unresolvable wiring, and wrap it all in a synthetic engine
 * Container carrying the authored (lg) grid settings. The engine's Container
 * isn't responsive for these — one value each — mirroring how the export
 * collapses xl onto lg. */
export function buildLivePreviewContainer(
  settings: GridContainerSettings,
  items: GridItemData[],
  endpoints: EndpointRef[],
  wiring: LivePreviewWiring,
  pages: PageRef[] = [],
  name = 'studio-live-preview',
): Container {
  const bins = previewBins(
    JSON.parse(gridConfigToJson(settings, items, endpoints, pages)) as ParsedBin[],
    wiring,
  )
  return rootContainer(name, settings, bins as unknown as Bin[]) as unknown as Container
}
