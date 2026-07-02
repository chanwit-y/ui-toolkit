import type { Bin, Container } from '@gummy-ui/ui'
import { gridConfigToJson } from './gridConfig'
import type { GridContainerSettings, GridItemData } from './types'

/**
 * Builds the `Container` the live-preview modal feeds to the real engine
 * (`ContainerBuilder`). Deliberately round-trips through the exported JSON
 * *string* (`gridConfigToJson` → `JSON.parse`) rather than reusing `buildBins`'
 * objects — the preview renders exactly what a consumer pasting the code-tab
 * JSON would get, so serializer bugs surface here instead of in their app.
 *
 * Two kinds of bins can't render as-is and are rewritten to engine `text`
 * placeholders that keep their spans (so the layout stays truthful):
 * - API-dependent bins — `datatable` (no `api` emitted), `datatableeditable`
 *   (skeleton `read: {name:''}` that the engine throws on by design), and
 *   autocomplete-family bins in `source` mode (their `api` name resolves to
 *   nothing in the preview's stub ApiMaster).
 * - Element-less bins (types studio can't author yet) — `buildBins` emits no
 *   `element` for them and the engine's element classes throw on undefined
 *   props. `empty`/`container` pass through: the engine renders them as an
 *   empty cell, which is the truthful preview. The display types (text,
 *   typography, avatar, divider, button) and `hidden` all emit elements and
 *   render for real (the button with its skeleton `actions: []` — clickable,
 *   does nothing, exactly what the export says).
 */

/** Bin as parsed back from the exported JSON — structurally a `Bin`, but we
 * only dare read from it loosely. */
type ParsedBin = Record<string, unknown> & { element?: Record<string, unknown> }

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

/** Recursively sanitize a nested engine Container's bins in place-of (returns
 * a rewritten copy; the nested grid settings pass through untouched). */
function toPreviewContainer(
  container: Record<string, unknown>,
): Record<string, unknown> {
  const bins = container.bins
  if (!Array.isArray(bins)) return container
  return { ...container, bins: (bins as ParsedBin[]).map(toPreviewBin) }
}

function toPreviewBin(bin: ParsedBin): ParsedBin {
  const type = String(bin.type)
  const el = bin.element
  const displayName = el ? String(el.title ?? el.name ?? '') : ''

  // Tables always need API wiring; autocompletes only in `source` mode (a
  // static-options select has no `api` key and previews for real).
  const needsApi =
    type === 'datatable' ||
    type === 'datatableeditable' ||
    ((type === 'autocomplete' || type === 'multiAutocomplete') && el !== undefined && 'api' in el)
  if (needsApi) {
    const label = API_PLACEHOLDER_LABEL[type] ?? type
    return placeholderBin(bin, `[ ${label} "${displayName}" — needs API wiring ]`)
  }

  if (el === undefined && !ELEMENT_OPTIONAL_TYPES.has(type)) {
    return placeholderBin(bin, `[ ${type} — not previewable ]`)
  }

  // Recurse into nested containers so an API-dependent bin inside a
  // container/paper/tab/modal/popover is placeholder-rewritten too.
  if (bin.container && typeof bin.container === 'object') {
    bin = { ...bin, container: toPreviewContainer(bin.container as Record<string, unknown>) }
  }
  if (el?.container && typeof el.container === 'object') {
    bin = {
      ...bin,
      element: {
        ...el,
        container: toPreviewContainer(el.container as Record<string, unknown>),
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
            ? { ...tab, container: toPreviewContainer(tab.container as Record<string, unknown>) }
            : tab,
        ),
      },
    }
  }

  return bin
}

/** Serialize the canvas to its exported JSON, parse it back, swap in
 * placeholders, and wrap it all in a synthetic engine Container carrying the
 * authored (lg) grid settings. The engine's Container isn't responsive for
 * these — one value each — mirroring how the export collapses xl onto lg. */
export function buildLivePreviewContainer(
  settings: GridContainerSettings,
  items: GridItemData[],
): Container {
  const bins = (JSON.parse(gridConfigToJson(settings, items)) as ParsedBin[]).map(toPreviewBin)
  return {
    id: 'studio-live-preview',
    name: 'studio-live-preview',
    isArray: false,
    bins: bins as unknown as Bin[],
    ...(settings.gap.lg !== '' ? { gap: settings.gap.lg } : {}),
    ...(settings.justifyItems.lg !== '' ? { justifyItems: settings.justifyItems.lg } : {}),
    ...(settings.alignItems.lg !== '' ? { alignItems: settings.alignItems.lg } : {}),
    ...(settings.justifyContent.lg !== '' ? { justifyContent: settings.justifyContent.lg } : {}),
    ...(settings.alignContent.lg !== '' ? { alignContent: settings.alignContent.lg } : {}),
    ...(settings.gridAutoFlow.lg !== '' ? { gridAutoFlow: settings.gridAutoFlow.lg } : {}),
  } as Container
}
