import { describe, expect, test } from 'bun:test'
import {
  MISSING_COMPONENT,
  exportProps,
  makeComponentNameResolver,
  parsePropValue,
  toComponentsTsx,
  type CustomComponentDef,
} from './customComponents'

const chart: CustomComponentDef = {
  id: 'component-1',
  name: 'Chart',
  description: 'A chart',
  props: [
    { key: 'series', kind: 'text', label: '', options: [], defaultValue: '' },
    { key: 'variant', kind: 'select', label: 'Variant', options: ['bar', 'line'], defaultValue: 'bar' },
    { key: 'height', kind: 'number', label: '', options: [], defaultValue: '72' },
    { key: 'stacked', kind: 'boolean', label: '', options: [], defaultValue: '' },
    { key: 'options', kind: 'json', label: '', options: [], defaultValue: '' },
    { key: 'bad key', kind: 'text', label: '', options: [], defaultValue: '' },
  ],
}

describe('parsePropValue', () => {
  test('parses by kind and rejects what does not parse', () => {
    expect(parsePropValue('number', '12')).toBe(12)
    expect(parsePropValue('number', 'x')).toBeUndefined()
    expect(parsePropValue('boolean', 'true')).toBe(true)
    expect(parsePropValue('boolean', 'yes')).toBeUndefined()
    expect(parsePropValue('json', '{"a":1}')).toEqual({ a: 1 })
    expect(parsePropValue('json', '{')).toBeUndefined()
    expect(parsePropValue('text', ' spaced ')).toBe(' spaced ')
    expect(parsePropValue('select', '')).toBeUndefined()
  })
})

describe('exportProps', () => {
  test('emits set props parsed to their kind, drops blanks, defaults and invalid keys', () => {
    expect(
      exportProps(chart, { series: 'gdp', variant: 'line', height: '72', stacked: 'true', options: '{"legend":false}', 'bad key': 'x', stale: 'y' }),
    ).toEqual({ series: 'gdp', variant: 'line', stacked: true, options: { legend: false } })
    expect(exportProps(chart, { variant: 'bar', height: '' })).toEqual({})
    expect(exportProps(undefined, { series: 'gdp' })).toEqual({})
  })
})

describe('makeComponentNameResolver', () => {
  test('resolves ids to names and flags the missing or unnamed', () => {
    const resolve = makeComponentNameResolver([chart, { id: 'component-2', name: '  ' }])
    expect(resolve('component-1')).toBe('Chart')
    expect(resolve('component-2')).toBe(MISSING_COMPONENT)
    expect(resolve('component-gone')).toBe(MISSING_COMPONENT)
  })
})

describe('toComponentsTsx', () => {
  test('writes a typed stub per valid name and the assembled registry', () => {
    const out = toComponentsTsx([chart, { id: 'component-3', name: '1bad', description: '', props: [] }])
    expect(out).toContain('export type ChartProps = {')
    expect(out).toContain('variant?: "bar" | "line";')
    expect(out).toContain('height?: number;')
    expect(out).toContain('options?: unknown;')
    expect(out).not.toContain('bad key')
    expect(out).toContain('const { series, variant = "bar", height = 72, stacked, options } = props;')
    expect(out).toContain('export const components: TComponentMaster = {\n  Chart,\n};')
    expect(out).toContain('Not exported — the name must be a JS identifier: "1bad"')
  })
})
