import { describe, expect, test } from 'bun:test'
import { ACCENT_COLORS, mixHex, nearestAccent, PALETTES, paletteSurfaces, paletteTheme } from './types'

/** WCAG contrast ratio between two hex colours. */
function contrast(a: string, b: string): number {
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return 0.2126 * channel(((n >> 16) & 255) / 255) + 0.7152 * channel(((n >> 8) & 255) / 255) + 0.0722 * channel((n & 255) / 255)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Presets from before the contrast check, below 4.5:1 somewhere. New ones must not join this list. */
const LOW_CONTRAST = new Set(['Clinic red', 'Teal ward', 'Blue chart', 'Mint care', 'Sunset ops', 'Slate calm'])

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

  test('a near-grey snaps to gray, a muted hue keeps its hue', () => {
    const accentOf = (name: string) => {
      const p = PALETTES.find((x) => x.name === name)!
      return nearestAccent(p.colors[p.accent])
    }
    expect(accentOf('Graphite')).toBe('gray')
    expect(accentOf('Slate calm')).toBe('gray')
    expect(nearestAccent('#8d8d8d')).toBe('gray')
    expect(accentOf('Gold ledger')).toBe('gold')
    expect(accentOf('Bronze mark')).toBe('bronze')
    expect(accentOf('Cocoa roast')).toBe('brown')
    expect(accentOf('Meadow path')).toBe('grass')
  })

  test('presets are well formed', () => {
    expect(new Set(PALETTES.map((p) => p.name)).size).toBe(PALETTES.length)
    for (const p of PALETTES) {
      expect(p.colors).toHaveLength(5)
      expect(new Set(p.colors).size).toBe(5)
      for (const c of p.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/)
      expect(p.colors[p.accent]).toBeDefined()
    }
  })

  test('every Radix accent has a palette', () => {
    const accents = new Set(PALETTES.map((p) => nearestAccent(p.colors[p.accent])))
    expect(ACCENT_COLORS.filter((a) => !accents.has(a))).toEqual([])
  })

  test('text reads on both surfaces in both modes', () => {
    for (const p of PALETTES.filter((x) => !LOW_CONTRAST.has(x.name))) {
      const { light, dark } = paletteSurfaces(p)
      for (const m of [light, dark]) {
        expect(contrast(m.text, m.surface)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(m.text, m.panel)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('every preset produces a valid theme', () => {
    for (const p of PALETTES) {
      const t = paletteTheme(p)
      expect(t.accentColor).toBeTruthy()
      expect(t.surfaces.light.surface).not.toBe(t.surfaces.dark.surface)
    }
  })
})
