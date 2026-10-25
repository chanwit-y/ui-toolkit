import { assertGummyProject, type GummyProject } from '@gummy-ui/ui/headless'
import { projectToRuntime } from '../../components/Workspace/runtimeProject'
import type { WorkspaceData } from '../../components/Workspace/types'
import { input, PROJECT, type Tool } from './shared'

/** Where each `MISSING_*` sentinel sits in the runtime document (an export of a reference that resolves to nothing). */
function missingRefs(doc: unknown): string[] {
  const out: string[] = []
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'string') {
      const m = /MISSING_[A-Z_]+/.exec(node)
      if (m) out.push(`${path}: ${m[0]}`)
    } else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`))
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k)
  }
  walk(doc, '')
  return out
}

export type ValidationReport = { ok: boolean; errors: string[]; warnings: string[] }

/** A project's runtime document and what is wrong with it: the engine's structural check, then every dangling reference. */
export function validateProject(ws: WorkspaceData, projectId: string): ValidationReport & { document?: GummyProject } {
  const project = ws.projects.find((p) => p.id === projectId)
  if (!project) return { ok: false, errors: [`no project ${projectId}`], warnings: [] }
  let document: GummyProject
  try {
    document = projectToRuntime(project, ws.library)
  } catch (err) {
    return { ok: false, errors: [`export failed: ${(err as Error).message}`], warnings: [] }
  }
  const errors: string[] = []
  try {
    assertGummyProject(document)
  } catch (err) {
    errors.push((err as Error).message)
  }
  const warnings = missingRefs(document).map((w) => `reference to nothing at ${w}`)
  for (const id of project.snapshot.endpointIds) {
    if (!ws.library.endpoints.some((e) => e.id === id)) warnings.push(`attached endpoint ${id} is not in the library`)
  }
  return { ok: errors.length === 0, errors, warnings, document }
}

export const outputTools: Tool[] = [
  {
    name: 'validate_project',
    description:
      'Build the project’s runtime document (what <GummyApp> renders) and check it: errors = the document fails the engine’s checks; warnings = references that resolve to nothing (MISSING_PAGE / MISSING_ENDPOINT / MISSING_LOAD …, with their path).',
    inputSchema: input({ project: PROJECT }, ['project']),
    write: false,
    run: (s, i) => {
      const { ok, errors, warnings } = validateProject(s.ws, s.project(i.project).id)
      return { ok, errors, warnings }
    },
  },
  {
    name: 'export_project',
    description: 'The project’s runtime document (GummyProject, schemaVersion 1) with its pages inline — the same JSON the save writes split into gummy/projects/<key>/.',
    inputSchema: input({ project: PROJECT }, ['project']),
    write: false,
    run: (s, i) => projectToRuntime(s.project(i.project), s.ws.library),
  },
]
