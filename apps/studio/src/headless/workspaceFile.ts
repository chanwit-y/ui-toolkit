import { freshWorkspace } from '../components/Workspace/commands'
import { migrateWorkspace, WORKSPACE_VERSION } from '../components/Workspace/migrate'
import { MOCK_USERS } from '../components/Workspace/mockUsers'
import { projectFileKeys, projectFolders, type ProjectFolder } from '../components/Workspace/runtimeProject'
import type { WorkspaceData } from '../components/Workspace/types'
import { ToolError } from './errors'

/*
 * `gummy/workspace.json` as the headless side sees it: the studio's persist
 * payload (`{ state, version }`), migrated on read exactly like the studio
 * migrates it, written back in the same shape the `gummy studio` CLI writes
 * (two-space JSON plus a newline), so the file diffs cleanly whichever of
 * them saved last.
 */

/** Parse and migrate a `workspace.json` text. A newer workspace than this build is refused, never downgraded. */
export function readWorkspace(text: string): WorkspaceData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new ToolError(`workspace.json is not valid JSON: ${(err as Error).message}`)
  }
  const state = (parsed as { state?: unknown } | null)?.state
  if (!state || typeof state !== 'object') throw new ToolError('workspace.json has no `state` — is it a Gummy Studio workspace?')
  const version = (state as { version?: unknown }).version
  if (typeof version === 'number' && version > WORKSPACE_VERSION) {
    throw new ToolError(
      `workspace.json is version ${version}, made by a newer studio than this MCP knows (${WORKSPACE_VERSION}) — upgrade @gummy-ui/cli.`,
    )
  }
  const migrated = migrateWorkspace(state)
  if (!migrated) throw new ToolError('workspace.json could not be read (unknown version or no projects).')
  return { version: WORKSPACE_VERSION, ...migrated }
}

/** The text the CLI would write for this workspace. */
export function writeWorkspace(workspace: WorkspaceData): string {
  // The studio's `partialize` key order, so a save from either side diffs only in what changed.
  const { appearance, user, projects, library, activity } = workspace
  const state = { version: WORKSPACE_VERSION, appearance, user, projects, library, activity }
  return JSON.stringify({ state, version: WORKSPACE_VERSION }, null, 2) + '\n'
}

/** A workspace for a folder that has none yet: one empty project named after the app, as `gummy studio` starts one. */
export function newWorkspace(projectName: string): WorkspaceData {
  return {
    version: WORKSPACE_VERSION,
    appearance: 'light',
    user: MOCK_USERS[0].name,
    activity: [],
    ...freshWorkspace(projectName),
  }
}

/**
 * The runtime folders (`projects/<key>/`) to write after a change: those whose
 * project, file key or the shared library (embedded in every document) differ
 * from `before` — what the studio's autosave deriver would send.
 */
export function changedFolders(before: WorkspaceData | null, after: WorkspaceData): Record<string, ProjectFolder> {
  if (!before) return projectFolders(after.projects, after.library)
  const libraryChanged = JSON.stringify(before.library) !== JSON.stringify(after.library)
  const beforeKeys = projectFileKeys(before.projects)
  const signature = new Map(before.projects.map((p, i) => [p.id, `${beforeKeys[i]}\u0000${JSON.stringify(p)}`]))
  return projectFolders(after.projects, after.library, (p, key) => libraryChanged || signature.get(p.id) !== `${key}\u0000${JSON.stringify(p)}`)
}
