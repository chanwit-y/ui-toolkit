import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Radix Themes CSS powers the real <TextFieldBase> previews rendered on the
// canvas. We import Radix's compiled stylesheet directly rather than
// `@gummy-ui/ui/styles.css`, because that file is authored for Tailwind 3
// (`@tailwind base`, `@apply bg-gradient-to-r`) and breaks studio's Tailwind 4
// pipeline. The component's own Tailwind utility classes are emitted by
// studio's Tailwind via the `@source` directive in index.css.
import '@radix-ui/themes/styles.css'
import './index.css'
import { installCli, setDeriveProjects, WORKSPACE_API, type CliInfo } from './cli/cliStorage'

/**
 * Boot: find out how the studio is served, then load the app.
 *
 * Under the `gummy studio` CLI, `/__gummy/info` answers and the workspace
 * lives in `./gummy/workspace.json` (see `cli/cliStorage.ts`). The persist
 * middleware reads its storage synchronously while the store module is
 * evaluated, so the file-backed mode is installed *before* `./App` (and with
 * it the store) is imported — hence the dynamic import. Anywhere else the
 * probe fails and the workspace stays in localStorage, as before.
 */
async function boot() {
  let cli: { info: CliInfo; workspace: string | null } | null = null
  try {
    const res = await fetch(`${WORKSPACE_API}/info`, { headers: { accept: 'application/json' } })
    if (res.ok) {
      const info = (await res.json()) as CliInfo
      const ws = (await (await fetch(`${WORKSPACE_API}/workspace`)).json()) as {
        revision: string
        workspace: unknown | null
      }
      const workspace = ws.workspace == null ? null : JSON.stringify(ws.workspace)
      installCli(info, { revision: ws.revision, workspace })
      cli = { info, workspace }
    }
  } catch {
    // No CLI behind this origin: localStorage mode.
  }

  const [{ default: App }, runtime, store] = await Promise.all([
    import('./App.tsx'),
    import('./components/Workspace/runtimeProject'),
    import('./components/Workspace/workspaceStore'),
  ])

  if (cli) {
    setDeriveProjects(runtime.createProjectFolderDeriver())
    // A fresh folder: one empty project named after the consumer package
    // (the Country demo seeds only on `--demo`).
    if (cli.workspace === null) {
      if (!cli.info.demo) store.useWorkspaceStore.getState().resetWorkspace(cli.info.name)
      // Write the files at once (persist only saves on a change), so the app
      // has `projects/<key>/project.json` to import before anything is edited.
      else store.useWorkspaceStore.setState({})
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
