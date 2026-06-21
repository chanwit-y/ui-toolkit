import type { ComponentType } from './componentCatalog'
import { BREAKPOINTS, type Breakpoint } from './breakpoints'
import type {
  GridContainerSettings,
  GridItemData,
  GridItemSettings,
  Responsive,
  TextareaConfig,
  TextFieldConfig,
} from './types'

export type GridConfig = {
  version: number
  breakpoints: Breakpoint[]
  container: GridContainerSettings
  items: {
    id: string
    label: string
    type: ComponentType
    settings: GridItemSettings
    config?: TextFieldConfig | TextareaConfig
  }[]
}

/**
 * Collapse a responsive value to a single value when every breakpoint shares
 * it, so the JSON config stays readable instead of repeating `xs/sm/md/lg`.
 */
function compactResponsive<T>(value: Responsive<T>): Responsive<T> | T {
  const breakpoints = BREAKPOINTS.map((b) => b.key)
  const first = value[breakpoints[0]]
  const allEqual = breakpoints.every((bp) => value[bp] === first)
  return allEqual ? first : value
}

function compactRecord<T extends Record<string, Responsive<unknown>>>(
  record: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    out[key] = compactResponsive(value)
  }
  return out
}

/**
 * Build a serializable JSON config describing the whole grid. Responsive values
 * that are identical across breakpoints are collapsed to a single value.
 */
export function buildGridConfig(
  container: GridContainerSettings,
  items: GridItemData[],
): Record<string, unknown> {
  return {
    version: 1,
    breakpoints: BREAKPOINTS.map((b) => b.key),
    container: compactRecord(container),
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      type: item.type,
      settings: compactRecord(item.settings),
      // Textfields and textareas carry config; omit the key entirely otherwise.
      ...(item.config ? { config: item.config } : {}),
    })),
  }
}

export function gridConfigToJson(
  container: GridContainerSettings,
  items: GridItemData[],
): string {
  return JSON.stringify(buildGridConfig(container, items), null, 2)
}
