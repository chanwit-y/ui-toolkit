import {
  clampColumns,
  clampSpan,
  MAX_GRID_COLUMNS,
  type Breakpoint,
} from './breakpoints'
import type { GridContainerSettings, GridItemSettings, Responsive } from './types'

const NUMERIC_CONTAINER_KEYS = new Set(['columns'])
const NUMERIC_ITEM_KEYS = new Set(['colSpan', 'colStart', 'rowSpan'])

export function updateContainerBreakpoint(
  prev: GridContainerSettings,
  bp: Breakpoint,
  key: string,
  value: string,
): GridContainerSettings {
  const field = prev[key as keyof GridContainerSettings]
  if (!field || typeof field !== 'object') return prev

  if (NUMERIC_CONTAINER_KEYS.has(key)) {
    return {
      ...prev,
      columns: { ...prev.columns, [bp]: clampColumns(Number(value)) },
    }
  }

  return {
    ...prev,
    [key]: { ...(field as Responsive<string>), [bp]: value },
  } as GridContainerSettings
}

export function updateItemBreakpoint(
  prev: GridItemSettings,
  bp: Breakpoint,
  key: string,
  value: string,
): GridItemSettings {
  const field = prev[key as keyof GridItemSettings]
  if (!field || typeof field !== 'object') return prev

  if (NUMERIC_ITEM_KEYS.has(key)) {
    const num = Number(value)
    switch (key) {
      case 'colStart':
        return { ...prev, colStart: { ...prev.colStart, [bp]: Math.max(0, num) } }
      case 'colSpan':
        return {
          ...prev,
          colSpan: { ...prev.colSpan, [bp]: clampSpan(num, MAX_GRID_COLUMNS) },
        }
      case 'rowSpan':
        return { ...prev, rowSpan: { ...prev.rowSpan, [bp]: Math.max(1, num) } }
    }
  }

  return {
    ...prev,
    [key]: { ...(field as Responsive<string>), [bp]: value },
  } as GridItemSettings
}
