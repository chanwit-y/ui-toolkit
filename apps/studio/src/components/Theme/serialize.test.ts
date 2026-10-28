import { describe, expect, test } from 'bun:test'
import { toThemeObjects } from './serialize'
import { backdropToCss, createDefaultBackdrop, normalizeThemeConfig, type StudioThemeConfig } from './types'

/** The glass surface's lowering (grilled design `glass-surface`). */
const base = (): StudioThemeConfig => ({
  appearance: 'light',
  accentColor: 'iris',
  radius: 'medium',
  panelBackground: 'solid',
  surface: 'flat',
  background: createDefaultBackdrop(),
  buttonColor: '',
  dataTable: {
    headerColor: '',
    headerTextColor: '',
    headerFontSize: '',
    headerFontWeight: '',
    headerHoverColor: '',
    paginationButtonColor: '',
    paginationButtonHoverColor: '',
    rowHoverColor: '',
    editButtonColor: '',
    deleteButtonColor: '',
  },
})

describe('toThemeObjects: surface', () => {
  test('flat exports neither key', () => {
    const { theme } = toThemeObjects(base())
    expect('surface' in theme).toBe(false)
    expect('background' in theme).toBe(false)
  })

  test('glass with the default backdrop exports only surface', () => {
    const { theme } = toThemeObjects({ ...base(), surface: 'glass' })
    expect(theme.surface).toBe('glass')
    expect('background' in theme).toBe(false)
  })

  test('each backdrop kind lowers to one CSS background string', () => {
    const b = createDefaultBackdrop()
    expect(backdropToCss({ ...b, kind: 'color', color: ' #e0e7ff ' })).toBe('#e0e7ff')
    expect(backdropToCss({ ...b, kind: 'gradient', gradient: { ...b.gradient, from: '#c7d2fe', to: '#fbcfe8', angle: 135 } })).toBe(
      'linear-gradient(135deg, #c7d2fe, #fbcfe8)',
    )
    expect(backdropToCss({ ...b, kind: 'image', image: '/sky.jpg' })).toBe('url("/sky.jpg") center / cover no-repeat')
    const { theme } = toThemeObjects({ ...base(), surface: 'glass', background: { ...b, kind: 'color', color: 'red' } })
    expect(theme.background).toBe('red')
  })

  test('a dark stop lowers its colour to light-dark(), each stop on its own', () => {
    const b = createDefaultBackdrop()
    expect(backdropToCss({ ...b, kind: 'color', color: '#e0e7ff', darkColor: ' #1e1b4b ' })).toBe('light-dark(#e0e7ff, #1e1b4b)')
    expect(
      backdropToCss({ ...b, kind: 'gradient', gradient: { from: '#c7d2fe', to: '#fbcfe8', angle: 160, darkFrom: '#312e81', darkTo: '#831843' } }),
    ).toBe('linear-gradient(160deg, light-dark(#c7d2fe, #312e81), light-dark(#fbcfe8, #831843))')
    expect(backdropToCss({ ...b, kind: 'gradient', gradient: { from: '#c7d2fe', to: '#fbcfe8', angle: 160, darkFrom: '', darkTo: '#831843' } })).toBe(
      'linear-gradient(160deg, #c7d2fe, light-dark(#fbcfe8, #831843))',
    )
  })

  test('an unfinished backdrop exports nothing, so the engine default stays', () => {
    const b = createDefaultBackdrop()
    expect(backdropToCss({ ...b, kind: 'gradient', gradient: { ...b.gradient, from: '#000', to: '', angle: 90 } })).toBeUndefined()
    // A dark stop alone is not a backdrop: the light stops are what is required.
    expect(backdropToCss({ ...b, kind: 'gradient', gradient: { ...b.gradient, darkFrom: '#000', darkTo: '#111' } })).toBeUndefined()
    expect(backdropToCss({ ...b, kind: 'color', darkColor: '#000' })).toBeUndefined()
    expect(backdropToCss({ ...b, kind: 'color' })).toBeUndefined()
    expect(backdropToCss({ ...b, kind: 'image' })).toBeUndefined()
    expect(backdropToCss(b)).toBeUndefined()
  })

  test('a backdrop is ignored while the surface is flat', () => {
    const { theme } = toThemeObjects({ ...base(), background: { ...createDefaultBackdrop(), kind: 'color', color: 'red' } })
    expect('background' in theme).toBe(false)
  })
})

describe('normalizeThemeConfig', () => {
  test('fills surface and background on a theme saved before they existed', () => {
    const { surface, background, ...old } = base()
    void surface
    void background
    const n = normalizeThemeConfig(old)
    expect(n.surface).toBe('flat')
    expect(n.background).toEqual(createDefaultBackdrop())
  })

  test('keeps a glass theme and fills a partial backdrop', () => {
    const n = normalizeThemeConfig({ ...base(), surface: 'glass', background: { kind: 'gradient', gradient: { from: '#000' } } as never })
    expect(n.surface).toBe('glass')
    expect(n.background).toEqual({ kind: 'gradient', color: '', darkColor: '', image: '', gradient: { from: '#000', to: '', angle: 160, darkFrom: '', darkTo: '' } })
  })
})
