import type { WorkspaceData } from '../../components/Workspace/types'
import { ToolError } from '../errors'
import { Session } from '../session'
import { libraryTools } from './library'
import { outputTools, validateProject } from './output'
import { logicTools, projectTools } from './project'
import { readTools } from './read'
import { input, type JsonSchema, type Tool } from './shared'
import { signinTools } from './signin'
import { structureTools } from './structure'
import { templateTools } from './templates'
import { testEndpointTool } from './testEndpoint'

/*
 * The MCP's tool surface (see the grilled design `mcp-server`): a small,
 * generic, schema-driven set — reads, structure, config patches, library,
 * validate / export — plus `batch`. `runTool` is the one entry point: it runs
 * a tool against a workspace and says whether the workspace changed, so the
 * server (the CLI) only does the file I/O.
 */

export type { Tool } from './shared'

const BASE_TOOLS: Tool[] = [
  ...readTools,
  ...structureTools,
  ...projectTools,
  ...logicTools,
  ...libraryTools,
  ...signinTools,
  ...templateTools,
  testEndpointTool,
  ...outputTools,
]
const BY_NAME = new Map(BASE_TOOLS.map((t) => [t.name, t]))

const BATCH: Tool = {
  name: 'batch',
  description:
    'Run several tool calls as one all-or-nothing change, saved once. A later operation can use an earlier result: a string "$1" is operation 1’s output, "$2.id" / "$2.canvases[0].items[1].id" a path into it. Read tools are allowed (to look something up mid-batch).',
  inputSchema: input(
    {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: { tool: { type: 'string' }, input: { type: 'object' } },
          required: ['tool', 'input'],
          additionalProperties: false,
        },
      },
      dryRun: { type: 'boolean', description: 'Run every operation and report, without saving.' },
    },
    ['operations'],
  ),
  write: true,
  run: async (s, i) => {
    const ops = i.operations
    if (!Array.isArray(ops) || !ops.length) throw new ToolError('needs at least one operation', 'operations')
    const outputs: unknown[] = []
    for (const [k, op] of ops.entries()) {
      const { tool, input: opInput } = (op ?? {}) as { tool?: string; input?: Record<string, unknown> }
      const def = tool ? BY_NAME.get(tool) : undefined
      if (!def) throw new ToolError(`unknown tool "${tool}"${tool === 'batch' ? ' (batches don’t nest)' : ''}`, `operations[${k}].tool`)
      try {
        // One batch, one dry-run switch: an operation's own `dryRun` is ignored.
        const opArgs = { ...(substitute(opInput ?? {}, outputs) as Record<string, unknown>) }
        delete opArgs.dryRun
        outputs.push(await def.run(s, opArgs))
      } catch (err) {
        if (err instanceof ToolError) throw new ToolError(`${tool}: ${err.message}`, `operations[${k}]`)
        throw err
      }
    }
    return outputs
  },
}

export const TOOLS: Tool[] = [...BASE_TOOLS, BATCH]

/** `"$2.canvases[0].id"` → that path of operation 2's output; other values recurse. */
function substitute(value: unknown, outputs: unknown[]): unknown {
  if (typeof value === 'string') {
    const m = /^\$(\d+)((?:\.[A-Za-z_$][\w$]*|\[\d+\])*)$/.exec(value)
    if (!m) return value
    const n = Number(m[1])
    if (n < 1 || n > outputs.length) throw new ToolError(`"${value}" refers to operation ${n}, but only ${outputs.length} ran before it`)
    let cur: unknown = outputs[n - 1]
    for (const part of m[2].match(/\.[A-Za-z_$][\w$]*|\[\d+\]/g) ?? []) {
      const key = part.startsWith('[') ? Number(part.slice(1, -1)) : part.slice(1)
      cur = cur == null ? undefined : (cur as Record<string | number, unknown>)[key]
      if (cur === undefined) throw new ToolError(`"${value}": nothing at ${part} of operation ${n}’s output`)
    }
    return cur
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, outputs))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, outputs)]))
  return value
}

/** What a write changed, by name — the dry-run report and the save summary. */
export function describeChanges(before: WorkspaceData, after: WorkspaceData): string[] {
  const out: string[] = []
  const diffList = <T extends { id: string }>(label: string, a: T[], b: T[], name: (x: T) => string) => {
    const was = new Map(a.map((x) => [x.id, x]))
    const now = new Map(b.map((x) => [x.id, x]))
    for (const x of b) if (!was.has(x.id)) out.push(`+ ${label} ${name(x)}`)
    for (const x of a) if (!now.has(x.id)) out.push(`- ${label} ${name(x)}`)
    for (const x of b) {
      const old = was.get(x.id)
      if (old && JSON.stringify(old) !== JSON.stringify(x)) out.push(`~ ${label} ${name(x)}`)
    }
  }
  diffList('model', before.library.models, after.library.models, (m) => m.name)
  diffList('endpoint', before.library.endpoints, after.library.endpoints, (e) => e.name)
  diffList('group', before.library.groups, after.library.groups, (g) => g.name)
  const was = new Map(before.projects.map((p) => [p.id, p]))
  for (const p of after.projects) {
    const old = was.get(p.id)
    if (!old) {
      out.push(`+ project ${p.name}`)
      continue
    }
    if (JSON.stringify(old) === JSON.stringify(p)) continue
    if (old.name !== p.name || old.description !== p.description) out.push(`~ project ${p.name}`)
    diffList(`page (${p.name})`, old.snapshot.pages, p.snapshot.pages, (pg) => `${pg.key} ${pg.path}`)
    for (const key of ['menu', 'shell', 'env', 'theme', 'endpointIds', 'globalLoads', 'customActions', 'customComponents', 'authId'] as const) {
      if (JSON.stringify(old.snapshot[key]) !== JSON.stringify(p.snapshot[key])) out.push(`~ ${p.name} ${key}`)
    }
  }
  const now = new Set(after.projects.map((p) => p.id))
  for (const p of before.projects) if (!now.has(p.id)) out.push(`- project ${p.name}`)
  return out
}

export type ToolRun = {
  /** What the tool answers (the MCP `content`). */
  output: unknown
  /** The changed workspace to save; `null` when nothing changed or on a dry run. */
  workspace: WorkspaceData | null
}

/** The tools' JSON-Schema input with `dryRun` described — what the server lists. */
export function toolList(): { name: string; description: string; inputSchema: JsonSchema }[] {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
}

/**
 * Run one tool against `workspace`. Throws `ToolError` for a call the tool
 * refuses (the workspace is then untouched). A write answers its output plus
 * the changes and, for every project it touched, the validation warnings.
 */
export async function runTool(workspace: WorkspaceData, name: string, args: unknown, opts: { actor?: string } = {}): Promise<ToolRun> {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new ToolError(`unknown tool "${name}"`)
  const raw = (args ?? {}) as Record<string, unknown>
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new ToolError('arguments must be an object')
  const { dryRun, ...rest } = raw
  const session = new Session(workspace, opts.actor ?? 'Claude (MCP)')
  const result = await tool.run(session, tool.name === 'batch' ? raw : rest)
  if (!tool.write) return { output: result, workspace: null }
  const changed = session.ws !== workspace
  const changes = changed ? describeChanges(workspace, session.ws) : []
  const touched = session.ws.projects.filter((p) => {
    const before = workspace.projects.find((x) => x.id === p.id)
    return !before || JSON.stringify(before) !== JSON.stringify(p)
  })
  const libraryChanged = JSON.stringify(workspace.library) !== JSON.stringify(session.ws.library)
  const validation = Object.fromEntries(
    (libraryChanged ? session.ws.projects : touched).map((p) => {
      const { ok, errors, warnings } = validateProject(session.ws, p.id)
      return [p.name, { ok, errors, warnings }]
    }),
  )
  const output = {
    ...(dryRun === true ? { dryRun: true } : {}),
    result,
    changes: changes.length ? changes : ['(no change)'],
    ...(session.warnings.length ? { notes: session.warnings } : {}),
    ...(Object.keys(validation).length ? { validation } : {}),
  }
  return { output, workspace: changed && dryRun !== true ? session.ws : null }
}
