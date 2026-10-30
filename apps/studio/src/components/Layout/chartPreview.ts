import { CHART_TYPE_FEATURES, type ChartConfig } from './types'

/**
 * Deterministic sample rows for a chart's canvas preview (see
 * `spec/gummy-chart-spec.md` §3.5): the shape the config reads — category
 * rows per series (or per `splitBy` group), scatter points, heatmap cells,
 * slices, radar indicators, one gauge row — with seeded pseudo-random walks,
 * so orientation, stacking, colours and the legend show with nothing wired.
 */

/** mulberry32 over a string seed. */
function rng(seed: string) {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (Math.imul(a, 31) + seed.charCodeAt(i)) >>> 0
  a = (a + 0x9e3779b9) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A 20–100 random walk of `n` steps. */
function walk(seed: string, n: number): number[] {
  const next = rng(seed)
  let v = 40 + next() * 40
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    v = Math.min(100, Math.max(20, v + (next() - 0.5) * 30))
    out.push(Math.round(v))
  }
  return out
}

const LETTERS = 'ABCDEFGHIJKL'.split('')
const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}-15`)
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GROUPS = ['Group 1', 'Group 2', 'Group 3']
const INDICATORS = ['Speed', 'Quality', 'Cost', 'Safety', 'Service', 'Growth']
const SLICES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']

const setField = (row: Record<string, unknown>, field: string, value: unknown) => {
  if (field) row[field] = value
}

/** A sample 20–100 value in the series' own scale: a ratio percent format reads 0.2–1. */
const scaled = (s: { format?: { type?: string; percentOf?: string } } | undefined, value: number): number =>
  s?.format?.type === 'percent' && s.format.percentOf !== '100' ? value / 100 : value

/** The sample rows a chart config draws on the canvas. */
export function buildChartPreviewRows(c: ChartConfig): Record<string, unknown>[] {
  const f = CHART_TYPE_FEATURES[c.type]
  const o = c.options
  const valueField = c.series[0]?.field || 'value'
  const split = f.splitBy && c.splitBy ? c.splitBy : ''
  const rows: Record<string, unknown>[] = []

  switch (c.type) {
    case 'gauge': {
      const row: Record<string, unknown> = {}
      setField(row, valueField, scaled(c.series[0], 72))
      return [row]
    }
    case 'pie':
    case 'funnel': {
      const values = [42, 31, 22, 14, 8]
      SLICES.forEach((label, i) => {
        const row: Record<string, unknown> = {}
        setField(row, c.xField || 'name', label)
        setField(row, valueField, values[i] * 10)
        rows.push(row)
      })
      return rows
    }
    case 'heatmap': {
      const next = rng('heatmap')
      for (const day of DAYS) {
        for (let h = 0; h < 12; h++) {
          const row: Record<string, unknown> = {}
          setField(row, c.xField || 'x', `${8 + h}:00`)
          setField(row, o.yField || 'y', day)
          setField(row, o.valueField || 'value', Math.round(10 + 90 * Math.exp(-((h - 6) ** 2) / 12) * (0.6 + next() * 0.8)))
          rows.push(row)
        }
      }
      return rows
    }
    case 'scatter': {
      const groups = split ? GROUPS : ['']
      const seriesList = split ? c.series.slice(0, 1) : c.series
      for (const g of groups) {
        for (const s of seriesList) {
          const next = rng(`${s.id}-${g}`)
          for (let i = 0; i < 40; i++) {
            const row: Record<string, unknown> = {}
            const x = Math.round(10 + next() * 90)
            setField(row, o.xField || 'x', x)
            setField(row, s.field || 'y', scaled(s, Math.round(x * (0.6 + next() * 0.8) + 10)))
            if (o.sizeField) setField(row, o.sizeField, Math.round(5 + next() * 95))
            if (o.labelField) setField(row, o.labelField, `P${i + 1}`)
            if (split) setField(row, split, g)
            rows.push(row)
          }
        }
      }
      return rows
    }
    case 'radar': {
      const groups = split ? GROUPS : ['']
      const seriesList = split ? c.series.slice(0, 1) : c.series
      for (const g of groups) {
        INDICATORS.forEach((ind, i) => {
          const row: Record<string, unknown> = {}
          setField(row, c.xField || 'name', ind)
          for (const s of seriesList) setField(row, s.field || 'value', scaled(s, walk(`${s.id}-${g}`, INDICATORS.length)[i]))
          if (split) setField(row, split, g)
          rows.push(row)
        })
      }
      return rows
    }
    default: {
      const dateX = c.xFormat.type === 'date' || c.xFormat.type === 'datetime'
      const categories = dateX ? MONTHS : LETTERS
      const groups = split ? GROUPS : ['']
      const seriesList = split ? c.series.slice(0, 1) : c.series
      for (const g of groups) {
        categories.forEach((cat, i) => {
          const row: Record<string, unknown> = {}
          setField(row, c.xField || 'name', cat)
          for (const s of seriesList) setField(row, s.field || 'value', scaled(s, walk(`${s.id}-${g}`, categories.length)[i]))
          if (split) setField(row, split, g)
          rows.push(row)
        })
      }
      return rows
    }
  }
}

/** The look of a chart for the canvas: path-valued reference lines draw at the sample mean (60). */
export function previewReferenceLines(look: Record<string, unknown>): Record<string, unknown> {
  const lines = look.referenceLines as { value: number | { path: string[] } }[] | undefined
  if (!lines) return look
  return { ...look, referenceLines: lines.map((l) => (typeof l.value === 'number' ? l : { ...l, value: 60 })) }
}
