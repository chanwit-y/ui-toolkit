/**
 * Writes the Book shop demo's studio workspace and its exported project (see
 * the grilled design `bookshop-demo`):
 *
 *   demo/gummy/workspace.json            the studio state `gummy studio` opens
 *   demo/gummy/projects/book-shop/       project.json + pages/*.json, what the demo renders
 *
 * Run once from the repo root:   bun apps/studio/scripts/bookshop.ts [--force] [--out <gummy dir>]
 *
 * After that, workspace.json is the source of truth — edit the project in
 * `gummy studio` (in demo/). The script refuses to overwrite an existing
 * workspace.json unless --force, which would throw those edits away.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bookshopFolders, bookshopWorkspace, bookshopWorkspaceFile } from '../src/components/seed/bookshop/project'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const force = args.includes('--force')
const outAt = args.indexOf('--out')
const out = resolve(outAt >= 0 && args[outAt + 1] ? args[outAt + 1] : join(here, '..', '..', '..', 'demo', 'gummy'))

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
/** Same rule as the CLI: a file holding exactly this text is left alone. */
function write(file: string, text: string): boolean {
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return true
}

const workspaceFile = join(out, 'workspace.json')
if (existsSync(workspaceFile) && !force) {
  console.error(`${workspaceFile} exists — it is the source of truth now (edit the project in \`gummy studio\`).`)
  console.error('Pass --force to replace it with a freshly generated Book shop.')
  process.exit(1)
}

const workspace = bookshopWorkspace()
const written: string[] = []
if (write(workspaceFile, json(bookshopWorkspaceFile(workspace)))) written.push('workspace.json')

for (const [key, folder] of Object.entries(bookshopFolders(workspace))) {
  const dir = join(out, 'projects', key)
  if (write(join(dir, 'project.json'), json(folder.project))) written.push(`projects/${key}/project.json`)
  for (const [name, body] of Object.entries(folder.pages)) {
    if (write(join(dir, 'pages', `${name}.json`), json(body))) written.push(`projects/${key}/pages/${name}.json`)
  }
  // Page files the manifest no longer names go, like the CLI's prune.
  const pagesDir = join(dir, 'pages')
  for (const file of existsSync(pagesDir) ? readdirSync(pagesDir) : []) {
    if (file.endsWith('.json') && !(file.slice(0, -5) in folder.pages)) {
      unlinkSync(join(pagesDir, file))
      written.push(`removed projects/${key}/pages/${file}`)
    }
  }
}

console.log(`Book shop → ${out}`)
for (const f of written) console.log(`  ${f}`)
if (written.length === 0) console.log('  (nothing changed)')
