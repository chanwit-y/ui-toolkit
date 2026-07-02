import { CoreProvider, ThemeProvider } from '@gummy-ui/ui'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiEditor, AppShell, Grid, ModelEditor } from './components'

function App() {
  // ThemeProvider wraps Radix's <Theme>, supplying the accent CSS vars the
  // canvas previews use (the primary/brand color real components tint to).
  // CoreProvider (isRoot) supplies the observe table + Data/Query/Loading
  // contexts that engine-aware previews need — the select cell renders the real
  // Autocomplete2, which calls useCore/useData/useQuery and would otherwise throw.
  //
  // BrowserRouter sits inside both providers so every page (the grid builder at
  // `/`, the model editor at `/model`) shares the theme + engine context. The
  // AppShell route owns the top tab bar; pages mount into its <Outlet>.
  return (
    <ThemeProvider
      theme={{ accentColor: 'teal', appearance: 'light' }}
      components={{}}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <CoreProvider isRoot>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Grid />} />
              <Route path="model" element={<ModelEditor />} />
              <Route path="api" element={<ApiEditor />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CoreProvider>
    </ThemeProvider>
  )
}

export default App
