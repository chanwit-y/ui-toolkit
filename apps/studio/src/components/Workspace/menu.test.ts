import { describe, expect, test } from 'bun:test'
import { pageTransitionToEngine, shellToEngine, sidebarToEngine } from './menu'
import { defaultShell, defaultSidebar } from './snapshots'

describe('pageTransitionToEngine', () => {
  test('none or absent exports nothing', () => {
    expect(pageTransitionToEngine(undefined)).toBeUndefined()
    expect(pageTransitionToEngine({ type: 'none', duration: 400, easing: 'linear' })).toBeUndefined()
  })

  test('duration and easing only off the engine defaults', () => {
    expect(pageTransitionToEngine({ type: 'fade-up', duration: '', easing: 'ease-out' })).toEqual({ type: 'fade-up' })
    expect(pageTransitionToEngine({ type: 'fade-up', duration: 250, easing: 'ease-out' })).toEqual({ type: 'fade-up' })
    expect(pageTransitionToEngine({ type: 'slide', duration: 350, easing: 'linear' })).toEqual({ type: 'slide', duration: 350, easing: 'linear' })
  })

  test('rides on the exported shell only when set', () => {
    expect(shellToEngine(defaultShell('App'))).not.toHaveProperty('pageTransition')
    expect(shellToEngine({ ...defaultShell('App'), pageTransition: { type: 'scale', duration: '', easing: 'ease-out' } }).pageTransition).toEqual({ type: 'scale' })
  })
})

describe('sidebarToEngine', () => {
  test('a default sidebar exports nothing', () => {
    expect(sidebarToEngine(undefined)).toBeUndefined()
    expect(sidebarToEngine(defaultSidebar())).toBeUndefined()
    expect(shellToEngine(defaultShell('App'))).not.toHaveProperty('sidebar')
  })

  test('pill + footer toggle, label only off the default', () => {
    const s = { ...defaultSidebar(), variant: 'pill' as const, toggle: 'footer' as const }
    expect(sidebarToEngine(s)).toEqual({ variant: 'pill', toggle: 'footer' })
    expect(sidebarToEngine({ ...s, toggleLabel: 'Hide Menu' })).toEqual({ variant: 'pill', toggle: 'footer' })
    expect(sidebarToEngine({ ...s, toggleLabel: ' Collapse ' })).toEqual({ variant: 'pill', toggle: 'footer', toggleLabel: 'Collapse' })
    // A label without the footer toggle has nowhere to show.
    expect(sidebarToEngine({ ...defaultSidebar(), toggleLabel: 'Collapse' })).toBeUndefined()
  })

  test('pill colours: gradient with both stops wins, ignored on plain', () => {
    const pill = { ...defaultSidebar(), variant: 'pill' as const, itemBackground: '#f5f3ff', activeBackground: '#c4b5fd' }
    expect(sidebarToEngine(pill)).toEqual({ variant: 'pill', itemBackground: '#f5f3ff', activeBackground: '#c4b5fd' })
    expect(
      sidebarToEngine({ ...pill, activeGradient: { enabled: true, from: '#e0f2fe', to: '#c4b5fd', angle: 90 } }),
    ).toEqual({ variant: 'pill', itemBackground: '#f5f3ff', activeGradient: { from: '#e0f2fe', to: '#c4b5fd' } })
    expect(sidebarToEngine({ ...pill, activeGradient: { enabled: true, from: '#e0f2fe', to: '', angle: 45 } })).toEqual({
      variant: 'pill',
      itemBackground: '#f5f3ff',
      activeBackground: '#c4b5fd',
    })
    expect(sidebarToEngine({ ...pill, variant: 'plain' })).toBeUndefined()
  })

  test('indicator only off the variant default; its colour only while it shows', () => {
    expect(sidebarToEngine({ ...defaultSidebar(), indicator: true, indicatorColor: '#3730a3' })).toEqual({ indicator: true, indicatorColor: '#3730a3' })
    expect(sidebarToEngine({ ...defaultSidebar(), indicatorColor: '#3730a3' })).toBeUndefined()
    expect(sidebarToEngine({ ...defaultSidebar(), variant: 'pill', indicator: true })).toEqual({ variant: 'pill' })
    expect(sidebarToEngine({ ...defaultSidebar(), variant: 'pill', indicator: false, indicatorColor: '#000' })).toEqual({ variant: 'pill', indicator: false })
  })
})
