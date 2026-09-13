import { useTheme } from '@gummy-ui/ui'
import { useEffect } from 'react'
import type { ThemeAppearance } from './Theme/types'

/**
 * Pushes an appearance into the library ThemeProvider through its imperative
 * `setAppearance` — the `theme.appearance` prop is only read at mount, and the
 * provider persists user toggles to localStorage and prefers THAT on boot.
 * Studio's stores are the source of truth (the project theme inside a
 * project, the workspace preference on the portal), so whichever route mounts
 * this wins over a stale stored value and applies live edits. The provider
 * also toggles `.dark` on <html>, which is what flips the studio chrome.
 */
export function AppearanceSync({ appearance }: { appearance: ThemeAppearance }) {
  const theme = useTheme()
  useEffect(() => {
    if (theme.appearance !== appearance) theme.setAppearance?.(appearance)
  }, [appearance, theme])
  return null
}
