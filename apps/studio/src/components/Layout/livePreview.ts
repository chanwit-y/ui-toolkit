import type { GummyProject, TModelMaster } from '@gummy-ui/ui'
import { MISSING_ENDPOINT } from './gridConfig'

/**
 * The Live Preview's placeholder pass over the runtime document (see the
 * grilled Env design): `livePreviewProject` takes the `GummyProject` the CLI
 * writes and swaps every bin whose wiring cannot fetch for an engine `text`
 * placeholder that keeps its spans (so the layout stays truthful) and says
 * *why* — no endpoint picked, endpoint missing (deleted / renamed on the API
 * page), a model reference the engine's schema conversion would throw on, or
 * API_URL unset on the Env page — and drops those endpoints from `api`. The
 * rest renders FOR REAL through `<GummyApp>`, against the Env page's API_URL.
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
  formlist: 'Form List',
  repeater: 'Repeater',
  approvalline: 'Approval line',
  switchprofile: 'Switch profile',
  replaceprofile: 'Replace profile',
  workfloweditor: 'Workflow editor',
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

function previewBins(bins: ParsedBin[], wiring: LivePreviewWiring): ParsedBin[] {
  return bins.map((b) => toPreviewBin(b, wiring))
}

function toPreviewBin(bin: ParsedBin, wiring: LivePreviewWiring): ParsedBin {
  const type = String(bin.type)
  const el = bin.element

  const displayName = el ? String(el.title ?? el.name ?? '') : ''
  const label = API_PLACEHOLDER_LABEL[type] ?? type

  // API-dependent bins render live when their wiring resolves, else a
  // placeholder explaining the gap. Autocompletes only in `source` mode (a
  // static-options select has no `api` key and previews for real regardless).
  // A table whose rows come from a page load (`items`) has no read API to check.
  if (type === 'datatable' && !el?.items) {
    const gap = wiringGap((el?.api as Record<string, unknown> | undefined)?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if (type === 'datatableeditable' || type === 'formlist') {
    const read = (el?.apiCrud as Record<string, Record<string, unknown>> | undefined)?.read
    const gap = wiringGap(read?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if (type === 'workfloweditor') {
    const api = (el?.users as { api?: Record<string, unknown> } | undefined)?.api
    const gap = wiringGap(api?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if (type === 'switchprofile' && el !== undefined) {
    const gap = wiringGap((el.api as Record<string, unknown> | undefined)?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if (type === 'replaceprofile' && el !== undefined) {
    const gap =
      wiringGap((el.searchApi as Record<string, unknown> | undefined)?.name, wiring) ??
      wiringGap((el.profilesApi as Record<string, unknown> | undefined)?.name, wiring)
    if (gap) return placeholderBin(bin, `[ ${label} "${displayName}" — ${gap} ]`)
  } else if ((type === 'repeater' || type === 'approvalline') && el !== undefined && 'api' in el) {
    // Only an endpoint-sourced repeater fetches; an `items` one reads its parent item.
    const gap = wiringGap((el.api as Record<string, unknown>)?.name, wiring)
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
  if (el?.rowContainer && typeof el.rowContainer === 'object') {
    bin = {
      ...bin,
      element: {
        ...(bin.element as Record<string, unknown>),
        rowContainer: toPreviewContainer(el.rowContainer as Record<string, unknown>, wiring),
      },
    }
  }
  if (el?.itemContainer && typeof el.itemContainer === 'object') {
    bin = {
      ...bin,
      element: {
        ...(bin.element as Record<string, unknown>),
        itemContainer: toPreviewContainer(el.itemContainer as Record<string, unknown>, wiring),
      },
    }
  }
  // A card's `content` / `collapse` slots are containers of bins too.
  for (const key of ['content', 'collapse'] as const) {
    if (el?.[key] && typeof el[key] === 'object') {
      bin = {
        ...bin,
        element: {
          ...(bin.element as Record<string, unknown>),
          [key]: toPreviewContainer(el[key] as Record<string, unknown>, wiring),
        },
      }
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

/**
 * The runtime document with every unresolvable binding replaced by a
 * placeholder (see the module doc) and `api` reduced to the endpoints the
 * engine can build — so the Live Preview renders the same `GummyProject`
 * the CLI writes, minus what would crash or fetch nothing.
 */
export function livePreviewProject(doc: GummyProject, wiring: LivePreviewWiring): GummyProject {
  const pages = Object.fromEntries(
    Object.entries(doc.pages).map(([key, page]) => [
      key,
      {
        ...page,
        containers: page.containers.map((c) => toPreviewContainer(c as unknown as Record<string, unknown>, wiring) as unknown as typeof c),
      },
    ]),
  )
  const api = Object.fromEntries(Object.entries(doc.api).filter(([name]) => wiring.fetchableNames.has(name)))
  // A sign-in whose profile endpoint can't be built keeps the gate but skips the fetch (signed-in is enough).
  const auth =
    doc.auth?.profile && !wiring.fetchableNames.has(doc.auth.profile.api.name)
      ? (({ profile: _profile, ...rest }) => rest)(doc.auth)
      : doc.auth
  return { ...doc, pages, api, ...(auth ? { auth } : {}) }
}

/**
 * What a document can fetch: an endpoint is fetchable when every model it
 * references exists (the engine's schema conversion throws otherwise) — the
 * rest become placeholders that say so.
 */
export function previewWiring(doc: Pick<GummyProject, 'api' | 'model'>, apiUrl: string): LivePreviewWiring {
  const model = doc.model as TModelMaster
  const apiNames = new Set(Object.keys(doc.api))
  const fetchableNames = new Set(
    Object.entries(doc.api)
      .filter(([, entry]) =>
        (['response', 'query', 'parameter', 'body'] as const).every((ref) => {
          const m = entry[ref]
          return m === undefined || m === null || (typeof m === 'string' && m in model)
        }),
      )
      .map(([name]) => name),
  )
  return { apiUrl, apiNames, fetchableNames }
}
