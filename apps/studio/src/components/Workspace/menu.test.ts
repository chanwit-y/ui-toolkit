import { describe, expect, test } from 'bun:test'
import { pageTransitionToEngine, shellToEngine } from './menu'
import { defaultShell } from './snapshots'

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
