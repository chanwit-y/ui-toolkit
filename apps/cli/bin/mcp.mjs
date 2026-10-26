/**
 * `gummy mcp [--dir gummy]` — the Gummy Studio MCP server over stdio (see the
 * grilled design `mcp-server`, `docs/prompts/mcp-server.md`).
 *
 * Every ability lives in `@gummy-ui/studio/headless` (the studio's own editing
 * rules, bundled for Node); this file only does the I/O. Per tool call:
 * read `<dir>/workspace.json` (or start a fresh workspace named after the app)
 * → migrate → run the tool → when it changed the workspace, check the file
 * did not move meanwhile (retry if it did), write it in the studio's own
 * format and rewrite the changed `projects/<key>/` folders with the same
 * rules as `gummy studio`. A `gummy studio` running over the same folder
 * sees the change and its clean tabs reload. stdout is the protocol — logs
 * go to stderr.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { PROJECT_KEY, projectName, writeProjectFolder } from './lib/files.mjs'

const RETRIES = 3

async function loadHeadless() {
  try {
    return await import('@gummy-ui/studio/headless')
  } catch (err) {
    console.error(`Cannot load @gummy-ui/studio/headless (${err.message}). Reinstall @gummy-ui/cli — or, in the monorepo, build the studio first.`)
    process.exit(1)
  }
}

export async function mcp(opts, version) {
  const h = await loadHeadless()
  const cwd = process.cwd()
  const dir = resolve(cwd, opts.dir)
  const workspaceFile = join(dir, 'workspace.json')
  const projectsDir = join(dir, 'projects')
  const appName = projectName(cwd)
  // Reported relative to the folder holding `gummy/` (the app), whatever directory the client started us in.
  const rel = (file) => relative(dirname(dir), file) || file

  const readText = () => (existsSync(workspaceFile) ? readFileSync(workspaceFile, 'utf8') : null)

  /** Run one tool against the file, saving when it changed something. */
  async function call(name, args) {
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      const text = readText()
      const before = text === null ? h.newWorkspace(appName) : h.readWorkspace(text)
      const run = await h.runTool(before, name, args)
      if (!run.workspace) return run.output
      // Someone (the studio, git, an editor) wrote the file while we worked: start over from theirs.
      if (readText() !== text) continue
      mkdirSync(dirname(workspaceFile), { recursive: true })
      writeFileSync(workspaceFile, h.writeWorkspace(run.workspace))
      const written = [rel(workspaceFile)]
      const removed = []
      for (const [key, folder] of Object.entries(h.changedFolders(text === null ? null : before, run.workspace))) {
        if (!PROJECT_KEY.test(key)) continue
        const r = writeProjectFolder(projectsDir, key, folder)
        written.push(...r.written.map((f) => rel(join(projectsDir, f))))
        removed.push(...r.removed.map((f) => rel(join(projectsDir, f))))
      }
      return { ...run.output, saved: { written, ...(removed.length ? { removed } : {}) } }
    }
    throw new Error(`${rel(workspaceFile)} kept changing while the tool ran — try again.`)
  }

  const server = new Server(
    { name: 'gummy', version },
    { capabilities: { tools: {}, resources: {} }, instructions: h.INSTRUCTIONS },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: h.toolList() }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    try {
      const output = await call(name, args ?? {})
      return { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] }
    } catch (err) {
      // A refusal (bad input, unknown reference…) goes back to the client to act on; anything else is logged too.
      if (err?.name !== 'ToolError') console.error(err)
      return { isError: true, content: [{ type: 'text', text: String(err?.message ?? err) }] }
    }
  })

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: h.resourceList().map(({ text: _text, ...r }) => r),
  }))

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const r = h.resourceList().find((x) => x.uri === req.params.uri)
    if (!r) throw new Error(`no resource ${req.params.uri}`)
    return { contents: [{ uri: r.uri, mimeType: r.mimeType, text: r.text }] }
  })

  await server.connect(new StdioServerTransport())
  console.error(`gummy mcp ${version} — ${rel(workspaceFile)}${existsSync(workspaceFile) ? '' : ` (new — the first write creates it with a project "${appName}")`}, workspace v${h.WORKSPACE_VERSION}`)
}
