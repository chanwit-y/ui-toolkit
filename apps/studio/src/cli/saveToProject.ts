import { splitProjectPages, type GummyProject } from '@gummy-ui/ui'
import { cliInfo, flushNow, isCliMode, WORKSPACE_API } from './cliStorage'

/**
 * "Save to project" (see the grilled library / CLI design): put the studio's
 * output where a consumer app reads it — `gummy/workspace.json` (the studio's
 * own state, so `gummy studio` can open it later) and the runtime documents
 * `<GummyApp>` renders — the folder `gummy/projects/<key>/` (`project.json` +
 * `pages/<page>.json`, see the grilled design `split-pages-lazy-load`), or,
 * for a download, the single file `<key>.json` with every page inline (a
 * browser can't download a folder; both forms render).
 *
 * Three ways, picked by where the studio runs:
 * - **CLI** (`gummy studio` serves it): the folder is already wired — the
 *   pending autosave is flushed at once and the result names the folder.
 * - **Folder** (any other origin, in a browser with the File System Access
 *   API — Chrome, Edge): the user picks the project folder (or its `gummy/`
 *   folder) once per session and the files are written into it directly.
 * - **Download** (no picker): `workspace.json` and one `<key>.json` per project
 *   are downloaded, to be dropped into `gummy/` / `gummy/projects/` by hand.
 */
export type SaveResult =
  | { mode: 'cli'; where: string; files: string[] }
  | { mode: 'folder'; where: string; files: string[] }
  | { mode: 'download'; where: string; files: string[] }
  | { mode: 'cancelled' }
  | { mode: 'error'; message: string }

// The File System Access API is not in TypeScript's DOM lib yet.
type DirectoryHandle = {
  name: string
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirectoryHandle>
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>
  removeEntry?: (name: string) => Promise<void>
  keys?: () => AsyncIterableIterator<string>
  queryPermission?: (opts: { mode: 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>
  requestPermission?: (opts: { mode: 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>
}
type PickerWindow = Window & { showDirectoryPicker?: (opts?: { mode?: 'readwrite'; id?: string }) => Promise<DirectoryHandle> }

/** A relative path inside `gummy/`: plain segments, none of them `.` or `..`, no leading slash. */
const safePath = (rel: string) => rel.length > 0 && rel.split('/').every((s) => /^[A-Za-z0-9._-]+$/.test(s) && s !== '.' && s !== '..')

export function canPickFolder(): boolean {
  return typeof (window as PickerWindow).showDirectoryPicker === 'function'
}

/** The folder picked this session, so the next save needs no dialog. */
let pickedRoot: DirectoryHandle | null = null

export function pickedFolderName(): string | null {
  return pickedRoot?.name ?? null
}

async function ensureWritable(handle: DirectoryHandle): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true
  if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

async function writeFile(dir: DirectoryHandle, name: string, body: string) {
  const file = await dir.getFileHandle(name, { create: true })
  const w = await file.createWritable()
  await w.write(body)
  await w.close()
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * @param workspace  the persisted workspace payload (`{ state, version }`) as a JSON string
 * @param projects   the runtime documents by file key
 * @param options.repick      ignore the folder picked earlier this session and ask again
 * @param options.extraFiles  more files to write under `gummy/` (the Export bundle's stubs and HANDOFF),
 *                            by relative path — never outside `gummy/`, so nothing of the app's own code is touched
 */
export async function saveToProject(
  workspace: string,
  projects: Record<string, GummyProject>,
  options: { repick?: boolean; extraFiles?: Record<string, string> } = {},
): Promise<SaveResult> {
  const { repick = false, extraFiles = {} } = options
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
  const folders = Object.entries(projects).map(([key, doc]) => ({ key, ...splitProjectPages(doc) }))
  const extras = Object.entries(extraFiles).filter(([path]) => safePath(path))
  const files = [
    'workspace.json',
    ...folders.flatMap((f) => [`projects/${f.key}/project.json`, ...Object.keys(f.pages).map((p) => `projects/${f.key}/pages/${p}.json`)]),
    ...extras.map(([path]) => path),
  ]

  if (isCliMode()) {
    const status = await flushNow()
    if (status === 'stale')
      return { mode: 'error', message: 'workspace.json changed on disk since this tab loaded it — reload the studio first.' }
    if (status === 'error') return { mode: 'error', message: 'the CLI did not answer — is `gummy studio` still running?' }
    if (extras.length) {
      const res = await fetch(`${WORKSPACE_API}/files`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: Object.fromEntries(extras) }),
      })
      if (res.status === 404)
        return {
          mode: 'error',
          message:
            'the running gummy studio is older than this studio build and has no files route — the workspace and project JSON were saved; stop it (Ctrl+C) and run `gummy studio` again, then export once more.',
        }
      if (!res.ok) return { mode: 'error', message: `the CLI refused the extra files (${res.status}) — the workspace and project JSON were saved.` }
    }
    return { mode: 'cli', where: `${cliInfo()?.dir ?? 'gummy'}/`, files }
  }

  const win = window as PickerWindow
  if (win.showDirectoryPicker) {
    try {
      if (!pickedRoot || repick) pickedRoot = await win.showDirectoryPicker({ mode: 'readwrite', id: 'gummy-project' })
      if (!(await ensureWritable(pickedRoot))) return { mode: 'error', message: 'write access to that folder was not granted.' }
      // Picking the project root or its `gummy/` folder both work.
      const gummy = pickedRoot.name === 'gummy' ? pickedRoot : await pickedRoot.getDirectoryHandle('gummy', { create: true })
      const projectsDir = await gummy.getDirectoryHandle('projects', { create: true })
      await writeFile(gummy, 'workspace.json', json(JSON.parse(workspace)))
      for (const f of folders) {
        const dir = await projectsDir.getDirectoryHandle(f.key, { create: true })
        const pagesDir = await dir.getDirectoryHandle('pages', { create: true })
        await writeFile(dir, 'project.json', json(f.project))
        for (const [name, body] of Object.entries(f.pages)) await writeFile(pagesDir, `${name}.json`, json(body))
        // Page files the manifest no longer names (a renamed / deleted page) go; the project folder itself stays.
        if (pagesDir.keys && pagesDir.removeEntry) {
          const stale: string[] = []
          for await (const name of pagesDir.keys()) if (name.endsWith('.json') && !(name.slice(0, -5) in f.pages)) stale.push(name)
          for (const name of stale) await pagesDir.removeEntry(name)
        }
      }
      for (const [path, body] of extras) {
        const parts = path.split('/')
        let dir = gummy
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true })
        await writeFile(dir, parts[parts.length - 1], body)
      }
      const where = pickedRoot.name === 'gummy' ? `${pickedRoot.name}/` : `${pickedRoot.name}/gummy/`
      return { mode: 'folder', where, files }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return { mode: 'cancelled' }
      return { mode: 'error', message: String((err as Error)?.message ?? err) }
    }
  }

  download('workspace.json', json(JSON.parse(workspace)))
  for (const [key, doc] of Object.entries(projects)) download(`${key}.json`, json(doc))
  for (const [path, body] of extras) download(path.split('/').pop()!, body)
  return {
    mode: 'download',
    where: 'your downloads folder',
    files: ['workspace.json', ...Object.keys(projects).map((key) => `projects/${key}.json`), ...extras.map(([path]) => path)],
  }
}
