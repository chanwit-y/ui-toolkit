import { MAX_GRID_COLUMNS } from './breakpoints'
import type { Breakpoint } from './breakpoints'

export type PropertyField = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'select' | 'number-select' | 'span-buttons'
  options?: { value: string; label: string }[]
  hint?: string
  min?: number
  max?: number
}

const columnOptions = Array.from({ length: MAX_GRID_COLUMNS }, (_, i) => {
  const n = String(i + 1)
  return { value: n, label: n }
})

const startOptions = [
  { value: '0', label: 'auto' },
  ...columnOptions,
]

const alignmentOptions = [
  { value: '', label: '(default)' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
  { value: 'stretch', label: 'stretch' },
  { value: 'baseline', label: 'baseline' },
]

const contentOptions = [
  { value: '', label: '(default)' },
  { value: 'start', label: 'start' },
  { value: 'end', label: 'end' },
  { value: 'center', label: 'center' },
  { value: 'stretch', label: 'stretch' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-evenly', label: 'space-evenly' },
]

export const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  xs: 'XS (default)',
  sm: 'SM ≥640px',
  md: 'MD ≥768px',
  lg: 'LG ≥1024px',
}

export const containerResponsiveFields: PropertyField[] = [
  {
    key: 'columns',
    label: 'Columns (max 12)',
    type: 'number-select',
    options: columnOptions,
    max: MAX_GRID_COLUMNS,
    hint: '12-column grid system',
  },
  { key: 'gap', label: 'gap', placeholder: '16px' },
  { key: 'rowGap', label: 'row-gap', placeholder: '' },
  { key: 'columnGap', label: 'column-gap', placeholder: '' },
  {
    key: 'justifyItems',
    label: 'justify-items',
    type: 'select',
    options: alignmentOptions,
  },
  {
    key: 'alignItems',
    label: 'align-items',
    type: 'select',
    options: alignmentOptions,
  },
  {
    key: 'justifyContent',
    label: 'justify-content',
    type: 'select',
    options: contentOptions,
  },
  {
    key: 'alignContent',
    label: 'align-content',
    type: 'select',
    options: contentOptions,
  },
  {
    key: 'gridAutoRows',
    label: 'grid-auto-rows',
    placeholder: 'minmax(56px, auto)',
  },
  {
    key: 'gridAutoFlow',
    label: 'grid-auto-flow',
    type: 'select',
    options: [
      { value: 'row', label: 'row' },
      { value: 'column', label: 'column' },
      { value: 'dense', label: 'dense' },
      { value: 'row dense', label: 'row dense' },
      { value: 'column dense', label: 'column dense' },
    ],
  },
]

export const itemResponsiveFields: PropertyField[] = [
  {
    key: 'colSpan',
    label: 'Column span',
    type: 'span-buttons',
    max: MAX_GRID_COLUMNS,
    hint: 'Tap 1–12 columns',
  },
  {
    key: 'colStart',
    label: 'Column start',
    type: 'number-select',
    options: startOptions,
    hint: '0 = auto placement',
  },
  {
    key: 'rowSpan',
    label: 'Row span',
    type: 'number-select',
    options: columnOptions.slice(0, 6),
    max: 6,
  },
  {
    key: 'gridArea',
    label: 'grid-area',
    placeholder: 'header',
  },
  {
    key: 'justifySelf',
    label: 'justify-self',
    type: 'select',
    options: alignmentOptions,
  },
  {
    key: 'alignSelf',
    label: 'align-self',
    type: 'select',
    options: alignmentOptions,
  },
  { key: 'order', label: 'order', placeholder: '0' },
]
