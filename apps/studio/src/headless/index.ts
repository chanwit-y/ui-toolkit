/**
 * `@gummy-ui/studio/headless` — the studio's editing rules without the studio
 * UI (see the grilled design `mcp-server`, `docs/prompts/mcp-server.md`). The
 * `gummy mcp` server (in `@gummy-ui/cli`) loads this bundle and does only the
 * file I/O: read `workspace.json` → `readWorkspace` → `runTool` → when it
 * returns a workspace, `writeWorkspace` + `changedFolders` → write. The same
 * pure commands drive the studio's own stores, so an edit made here is an
 * edit the studio could have made.
 */
import { WORKSPACE_VERSION } from '../components/Workspace/migrate'
import { GUIDES } from './guides'

export { WORKSPACE_VERSION }
export { ToolError } from './errors'
export { changedFolders, newWorkspace, readWorkspace, writeWorkspace } from './workspaceFile'
export { describeChanges, runTool, toolList, TOOLS, type ToolRun } from './tools'
export { validateProject } from './tools/output'
export { ITEM_TYPES, listItemTypes } from './itemTypes'
export { GUIDES, PENDING_GUIDES } from './guides'

/** The guides as MCP resources. */
export function resourceList(): { uri: string; name: string; description: string; mimeType: string; text: string }[] {
  return Object.entries(GUIDES).map(([topic, text]) => ({
    uri: `gummy://guide/${topic}`,
    name: topic === 'start' ? 'Start here' : topic,
    description: text.split('\n').find((l) => l.startsWith('# '))?.slice(2) ?? topic,
    mimeType: 'text/markdown',
    text,
  }))
}

/** The server's `instructions` — what a client reads before calling anything. */
export const INSTRUCTIONS = `Gummy Studio authoring (workspace v${WORKSPACE_VERSION}). You edit the studio workspace (gummy/workspace.json); every write regenerates the runtime project folders the app renders, and an open studio tab reloads.
Start with get_workspace_summary and read the resource gummy://guide/start. Before configuring a component type call describe_item_type (schema + defaults + guide). Config edits are deep-merge patches checked against the schema; references (pages, endpoints, loads, items, custom actions / components) may be given by name. Use batch for multi-step changes that must land together, dryRun to preview, validate_project to check a project. Deletes need confirm: true.`
