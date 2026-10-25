import { useSyncExternalStore } from 'react'
import type { StateStorage } from 'zustand/middleware'

/**
 * Where the workspace is persisted (see the grilled library / CLI design).
 *
 * Served by the `gummy studio` CLI, the studio keeps `./gummy/workspace.json`
 * on disk through the CLI's file API (`/__gummy/…`) instead of localStorage,
 * and writes each changed project's runtime document as the folder
 * `./gummy/projects/<key>/` (`project.json` + `pages/*.json`)
 * beside it. Served any other way (the monorepo's `vite` dev server, a static
 * host) nothing answers under `/__gummy/`, and the workspace stays in
 * localStorage as before.
 *
 * The zustand `persist` middleware reads its storage **synchronously while the
 * store module is evaluated**, so `main.tsx` probes the CLI and installs the
 * file-backed mode here *before* importing the app (and with it the store).
 * `studioStorage` is one delegating object either way: in CLI mode `getItem`
 * answers from the payload loaded at boot and `setItem` caches + debounces a
 * PUT; a write the CLI refuses (the file changed on disk since this tab loaded
 * it) flips the status to `stale` and stops further writes until a reload.
 *
 * When the file changes on disk (`gummy mcp`, a `git pull`), a **clean** tab —
 * no save pending here or in the live editor stores — loads the new file in
 * place (`setLiveReload`, see the grilled design `mcp-server`); a tab with
 * unsaved edits goes `stale` as before, so neither side's work is overwritten.
 */
export const WORKSPACE_API = '/__gummy'

export type CliInfo = {
  /** The folder the CLI serves (`./gummy`). */
  dir: string
  /** The consumer package's name, which names a fresh workspace's first project. */
  name: string
  /** `--demo`: a fresh workspace gets the Country demo instead of an empty project. */
  demo: boolean
  version: string
}

export type CliStatus = 'saved' | 'saving' | 'stale' | 'error'

type Listener = () => void

let mode: 'local' | 'cli' = 'local'
let info: CliInfo | null = null
let cache: string | null = null
let revision = ''
let status: CliStatus = 'saved'
let dirty = false
let inFlight = false
let timer: ReturnType<typeof setTimeout> | null = null
/** The derived project folders of one save, and the hook that marks them written. */
export type DerivedProjects = { projectFolders: Record<string, unknown>; commit: () => void }
let deriveProjects: ((payload: string) => DerivedProjects) | null = null
const listeners = new Set<Listener>()

/** The app side of a live reload: whether its editor stores hold edits not yet handed to the storage, and how to load the new payload into them. */
export type LiveReload = { hasPendingEdits: () => boolean; apply: () => void }
let liveReload: LiveReload | null = null
let reloading = false

const SAVE_DEBOUNCE_MS = 500

function emit() {
  for (const l of listeners) l()
}

function setStatus(next: CliStatus) {
  if (status === next) return
  status = next
  emit()
}

export function isCliMode(): boolean {
  return mode === 'cli'
}

export function cliInfo(): CliInfo | null {
  return info
}

/** The workspace revision this tab loaded (a content hash the CLI hands out). */
export function cliRevision(): string {
  return revision
}

/**
 * Switches persistence to the CLI's file API. Called once, before the store
 * module is imported. `workspace` is the persisted payload as the CLI read it
 * from disk (`null` for a fresh folder — the store then seeds itself).
 */
export function installCli(next: CliInfo, loaded: { revision: string; workspace: string | null }) {
  mode = 'cli'
  info = next
  revision = loaded.revision
  cache = loaded.workspace
  watchDiskChanges()
}

/**
 * The function that turns a persisted payload into the runtime project
 * documents written beside the workspace. Registered after the app is
 * imported (it needs the serializers, which need the stores).
 */
export function setDeriveProjects(fn: (payload: string) => DerivedProjects) {
  deriveProjects = fn
}

/** Registered once the app is imported (it needs the stores). Without it a disk change marks the tab stale. */
export function setLiveReload(next: LiveReload) {
  liveReload = next
}

/** Nothing of this tab's would be lost by loading the file: no write pending or in flight, no editor autosave waiting. */
function isClean(): boolean {
  return !dirty && !inFlight && timer === null && status !== 'stale' && status !== 'error' && !!liveReload && !liveReload.hasPendingEdits()
}

/** The file moved under this tab: load it when the tab is clean, else stop saving (`stale`). */
async function reloadOrStale() {
  if (reloading) return
  if (!isClean()) return setStatus('stale')
  reloading = true
  try {
    const res = await fetch(`${WORKSPACE_API}/workspace`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const body = (await res.json()) as { revision: string; workspace: unknown | null }
    // A deleted file, or an edit that landed while the request was out: keep the tab's copy.
    if (body.workspace == null || !isClean()) return setStatus('stale')
    cache = JSON.stringify(body.workspace)
    revision = body.revision
    liveReload!.apply()
    setStatus('saved')
  } catch (err) {
    console.warn('[gummy studio] could not reload the workspace from disk:', err)
    setStatus('stale')
  } finally {
    reloading = false
  }
}

function schedule() {
  dirty = true
  if (status === 'stale') return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
}

async function flush() {
  timer = null
  if (!dirty || inFlight || status === 'stale' || cache === null) return
  dirty = false
  inFlight = true
  setStatus('saving')
  try {
    // Only the projects changed since the last write (the deriver tracks it), as folders —
    // `projectFolders`, a field an older CLI ignores rather than writing a folder payload into `<key>.json`.
    let derived: DerivedProjects = { projectFolders: {}, commit: () => {} }
    try {
      if (deriveProjects) derived = deriveProjects(cache)
    } catch (err) {
      // A serializer bug must not lose the workspace itself: save it, skip the projects.
      console.error('[gummy studio] could not derive the runtime projects:', err)
    }
    const res = await fetch(`${WORKSPACE_API}/workspace`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revision, workspace: JSON.parse(cache), projectFolders: derived.projectFolders }),
    })
    if (res.status === 409) {
      setStatus('stale')
      return
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const body = (await res.json()) as { revision: string }
    revision = body.revision
    derived.commit()
    setStatus('saved')
  } catch (err) {
    console.error('[gummy studio] could not save the workspace:', err)
    dirty = true
    setStatus('error')
  } finally {
    inFlight = false
    // Edits that landed while the request was out go in the next write.
    if (dirty && (status as CliStatus) !== 'stale') schedule()
  }
}

/** The persisted payload as last handed to the storage (CLI mode: the cache; else what localStorage holds). */
export function currentPayload(storageKey: string): string | null {
  return mode === 'cli' ? cache : localStorage.getItem(storageKey)
}

/**
 * "Save to project": write what is pending right now instead of waiting for
 * the debounce, and report how it went. In localStorage mode there is
 * nothing to flush — the caller writes the files itself (see `saveToProject.ts`).
 */
export async function flushNow(): Promise<CliStatus> {
  if (mode !== 'cli') return 'saved'
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  dirty = true
  await flush()
  // A write that was already in flight when we were called: wait for the one it schedules after it.
  while (inFlight) await new Promise((r) => setTimeout(r, 50))
  return status
}

/** The CLI pushes a `changed` event when the file on disk no longer matches what this tab loaded. */
function watchDiskChanges() {
  if (typeof EventSource === 'undefined') return
  try {
    const source = new EventSource(`${WORKSPACE_API}/events`)
    source.addEventListener('changed', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { revision: string }
      if (data.revision !== revision) void reloadOrStale()
    })
  } catch (err) {
    console.warn('[gummy studio] disk watch unavailable:', err)
  }
}

/** The one storage `persist` gets; see the module doc. */
export const studioStorage: StateStorage = {
  getItem: (name) => (mode === 'cli' ? cache : localStorage.getItem(name)),
  setItem: (name, value) => {
    if (mode === 'cli') {
      cache = value
      schedule()
    } else {
      localStorage.setItem(name, value)
    }
  },
  removeItem: (name) => {
    if (mode === 'cli') {
      cache = null
    } else {
      localStorage.removeItem(name)
    }
  },
}

function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** The save status for the banner / topbar. Always `saved` outside CLI mode. */
export function useCliStatus(): CliStatus {
  return useSyncExternalStore(subscribe, () => status, () => status)
}
