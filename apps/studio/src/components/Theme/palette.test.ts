import { describe, expect, test } from 'bun:test'
import { mixHex, PALETTES, paletteSurfaces, paletteTheme } from './types'

/** A palette pick sets every colour setting (the Theme page's Apply). */
describe('paletteTheme', () => {
  test('mixHex blends towards the second colour', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#ff0000')
  })

  test('surfaces come from the lightest / darkest swatches with a derived border', () => {
    const s = paletteSurfaces(PALETTES[0]) // Clinic red
    expect(s.light).toMatchObject({ surface: '#f1faee', panel: '#a8dadc', text: '#1d3557' })
    // Second-darkest by luminance is the red, not the steel blue (the mockup's rule).
    expect(s.dark).toMatchObject({ surface: '#1d3557', panel: '#e63946', text: '#f1faee' })
    expect(s.light.border).toMatch(/^#[0-9a-f]{6}$/)
    expect(s.light.border).not.toBe(s.light.panel)
  })

  test('every colour setting follows the palette', () => {
    const t = paletteTheme(PALETTES[1]) // Teal ward: accent #0a9396 → teal
    expect(t.accentColor).toBe('teal')
    expect(t.buttonColor).toBe('teal')
    expect(t.dataTable).toEqual({
      headerColor: 'teal',
      headerTextColor: '',
      headerHoverColor: 'teal',
      paginationButtonColor: 'teal',
      paginationButtonHoverColor: 'teal',
      rowHoverColor: 'teal',
      editButtonColor: 'teal',
      deleteButtonColor: 'red',
    })
    expect(t.background.kind).toBe('gradient')
    expect(t.background.gradient).toMatchObject({ from: '#e9d8a6', to: '#94d2bd', darkFrom: '#005f73', darkTo: '#0a9396', angle: 160 })
  })

  test('every preset produces a valid theme', () => {
    for (const p of PALETTES) {
      const t = paletteTheme(p)
      expect(t.accentColor).toBeTruthy()
      expect(t.surfaces.light.surface).not.toBe(t.surfaces.dark.surface)
    }
  })
})
