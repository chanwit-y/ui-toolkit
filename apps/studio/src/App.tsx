import { CoreProvider, ThemeProvider } from '@gummy-ui/ui'
import { useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ApiEditor, EnvEditor, Grid, ModelEditor, ThemeEditor } from './components'
import { toThemeObjects, useThemeStore } from './components/Theme'
import { LibraryPage, LibrarySync, TemplateShell, TemplatesPage } from './components/Library'
import { PortalLayout, ProjectIndexRedirect, ProjectsPage, ProjectShell } from './components/Workspace'

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
  // BrowserRouter sits inside both providers so every page shares the theme +
  // engine context. `/` is the workspace portal; `/p/:projectId/*` is the
  // studio, whose ProjectShell hydrates the stores from the project (and the
  // routed page's canvas at `pages/:pageId`), owns the topbar, and mounts the
  // tabs into its <Outlet>. Appearance is synced per
  // route (project theme inside a project, workspace preference on the portal).
  const config = useThemeStore((s) => s.config)
  const { theme, components } = useMemo(() => toThemeObjects(config), [config])

  return (
    <ThemeProvider
      theme={theme}
      components={components}
      className="flex h-dvh flex-col overflow-hidden bg-surface text-[13px] text-ink"
    >
      <CoreProvider isRoot>
        <LibrarySync />
        <BrowserRouter>
          <Routes>
            <Route element={<PortalLayout />}>
              <Route index element={<ProjectsPage />} />
              <Route path="library/apis" element={<LibraryPage kind="api" />} />
              <Route path="library/models" element={<LibraryPage kind="model" />} />
              <Route path="library/templates" element={<TemplatesPage />} />
            </Route>
            <Route path="library/templates/:templateId/layout" element={<TemplateShell />} />
            <Route path="p/:projectId" element={<ProjectShell />}>
              <Route index element={<ProjectIndexRedirect />} />
              <Route path="pages/:pageId" element={<Grid />} />
              <Route path="model" element={<ModelEditor />} />
              <Route path="api" element={<ApiEditor />} />
              <Route path="env" element={<EnvEditor />} />
              <Route path="theme" element={<ThemeEditor />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CoreProvider>
    </ThemeProvider>
  )
}

export default App
