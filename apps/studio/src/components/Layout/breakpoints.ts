export const MAX_GRID_COLUMNS = 12

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg'

export const BREAKPOINTS: {
  key: Breakpoint
  label: string
  minWidth: number
  previewWidth?: number
}[] = [
  { key: 'xs', label: 'XS', minWidth: 0, previewWidth: 375 },
  { key: 'sm', label: 'SM', minWidth: 640, previewWidth: 640 },
  { key: 'md', label: 'MD', minWidth: 768, previewWidth: 768 },
  { key: 'lg', label: 'LG', minWidth: 1024 },
]

export function clampColumns(value: number): number {
  return Math.min(MAX_GRID_COLUMNS, Math.max(1, Math.round(value) || 1))
}

export function clampSpan(span: number, columns: number): number {
  return Math.min(clampColumns(columns), Math.max(1, Math.round(span) || 1))
}
