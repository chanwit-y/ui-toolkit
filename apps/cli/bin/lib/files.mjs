/**
 * The file rules `gummy studio` and `gummy mcp` share: how a project folder is
 * written under `gummy/projects/` (see the grilled design
 * `split-pages-lazy-load`) and how a revision is computed. Node 18+, no
 * dependencies.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/** The consumer package's name without its scope, else the folder name. */
export function projectName(cwd) {
  try {
    const name = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).name
    if (typeof name === 'string' && name.trim()) return name.replace(/^@[^/]+\//, '')
  } catch {
    // no package.json
  }
  return basename(cwd)
}

/** The file key a project is written under: its name as a slug. */
export const slug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project'

export const hash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16)

/** Write `text` unless the file already holds exactly that; true when it wrote. */
export function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return true
}

export const PROJECT_KEY = /^[a-z0-9][a-z0-9-]*$/
const PAGE_FILE = /^[A-Za-z0-9_-]+$/

/**
 * One project as a folder (see the grilled design `split-pages-lazy-load`):
 * `projects/<key>/project.json` + `pages/<name>.json`, unchanged files left
 * alone, page files the manifest no longer names removed. Returns the files
 * written and removed (relative to `projectsDir`).
 */
export function writeProjectFolder(projectsDir, key, folder) {
  const out = { written: [], removed: [] }
  if (!folder || typeof folder !== 'object' || !folder.project || typeof folder.project !== 'object') return out
  const dir = join(projectsDir, key)
  const pagesDir = join(dir, 'pages')
  const pages = folder.pages && typeof folder.pages === 'object' ? folder.pages : {}
  const keep = new Set()
  for (const [name, body] of Object.entries(pages)) {
    if (!PAGE_FILE.test(name)) continue
    keep.add(`${name}.json`)
    if (writeIfChanged(join(pagesDir, `${name}.json`), JSON.stringify(body, null, 2) + '\n')) out.written.push(`${key}/pages/${name}.json`)
  }
  // A page the manifest still points at but that came without a body (already split) is kept too.
  for (const page of Object.values(folder.project.pages ?? {})) {
    const m = typeof page?.src === 'string' ? /^pages\/([A-Za-z0-9_-]+\.json)$/.exec(page.src) : null
    if (m) keep.add(m[1])
  }
  if (writeIfChanged(join(dir, 'project.json'), JSON.stringify(folder.project, null, 2) + '\n')) out.written.push(`${key}/project.json`)
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir)) {
      if (!file.endsWith('.json') || keep.has(file)) continue
      unlinkSync(join(pagesDir, file))
      out.removed.push(`${key}/pages/${file}`)
    }
  }
  return out
}
