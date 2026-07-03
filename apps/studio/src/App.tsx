import { CoreProvider, ThemeProvider, useTheme } from '@gummy-ui/ui'
import { useEffect, useMemo } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {
  ApiEditor,
  AppShell,
  EnvEditor,
  Grid,
  ModelEditor,
  ThemeEditor,
} from './components'
import { toThemeObjects, useThemeStore } from './components/Theme'
import type { ThemeAppearance } from './components/Theme'

/**
 * Applies the Theme page's authored appearance through the provider's
 * imperative `setAppearance` — the `theme.appearance` prop is only read at
 * mount, and ThemeProvider persists user toggles to localStorage and prefers
 * THAT on boot. The theme store is studio's single source of truth (see the
 * grilled design), so this effect wins over a stale stored value at mount and
 * applies live edits from the Theme page.
 */
function AppearanceSync({ appearance }: { appearance: ThemeAppearance }) {
  const theme = useTheme()
  useEffect(() => {
    if (theme.appearance !== appearance) theme.setAppearance?.(appearance)
  }, [appearance, theme])
  return null
}

function App() {
  // ThemeProvider wraps Radix's <Theme>, supplying the accent CSS vars the
  // canvas previews use (the primary/brand color real components tint to).
  // Its props are derived from the Theme page's store, so authored tokens
  // apply live to the whole app (canvas cells + Live Preview; the zinc studio
  // chrome keeps its own fixed palette).
  // CoreProvider (isRoot) supplies the observe table + Data/Query/Loading
  // contexts that engine-aware previews need — the select cell renders the real
  // Autocomplete2, which calls useCore/useData/useQuery and would otherwise throw.
  //
  // BrowserRouter sits inside both providers so every page (the grid builder at
  // `/`, the model editor at `/model`) shares the theme + engine context. The
  // AppShell route owns the top tab bar; pages mount into its <Outlet>.
  const config = useThemeStore((s) => s.config)
  const { theme, components } = useMemo(() => toThemeObjects(config), [config])

  return (
    <ThemeProvider
      theme={theme}
      components={components}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <AppearanceSync appearance={config.appearance} />
      <CoreProvider isRoot>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Grid />} />
              <Route path="model" element={<ModelEditor />} />
              <Route path="api" element={<ApiEditor />} />
              <Route path="env" element={<EnvEditor />} />
              <Route path="theme" element={<ThemeEditor />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CoreProvider>
    </ThemeProvider>
  )
}

export default App
