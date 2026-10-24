#!/usr/bin/env node
/**
 * `gummy` — the Gummy UI command line (see the grilled library / CLI design).
 *
 *   gummy init [dir] [--name <package name>] [--force]
 *   gummy studio [--port 3300] [--dir gummy] [--host 127.0.0.1] [--open] [--demo]
 *
 * `init` scaffolds the consumer starter (this package's `template/`, the
 * monorepo's `demo/` as a template): a Vite + React app that mounts
 * `<GummyApp>` over `gummy/projects/<key>.json`, with the registries for
 * custom actions / components and a one-page starter project.
 *
 * Serves the prebuilt studio (the `dist/` of the `@gummy-ui/studio` package
 * this one depends on) and a small file API over the consumer's `./gummy/`
 * folder:
 *
 *   GET  /__gummy/info            { dir, name, demo, version }
 *   GET  /__gummy/workspace       { revision, workspace | null }   — workspace.json
 *   PUT  /__gummy/workspace       { revision, workspace, projectFolders } → { revision }
 *                                  409 when `revision` is not the file's current one;
 *                                  `projectFolders: { <key>: { project, pages } }` holds the
 *                                  projects that changed (an older studio sends `projects`,
 *                                  written as single files)
 *   PUT  /__gummy/files           { files: { "<relative path>": text } }  — written under ./gummy/ (the
 *                                  Export dialog's stubs and HANDOFF); plain path segments only
 *   GET  /__gummy/events          server-sent `changed` events when the file changes on disk
 *
 * The studio serialises everything in the browser; the CLI only stores files:
 * `workspace.json` (the studio's own state, migrated by the studio on load)
 * and `projects/<key>/` (the runtime documents `<GummyApp>` renders:
 * `project.json` + one `pages/<page>.json` per page, loaded on first visit).
 * A file whose content didn't change is not rewritten (no needless dev-server
 * reload); page files the manifest no longer names are removed; a project
 * folder or file is never deleted.
 * Node 18+, no dependencies, localhost only by default.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, watch, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))

/** The studio build: `@gummy-ui/studio`'s `dist/`, resolved from this package's dependencies. */
function studioDist() {
  try {
    const require = createRequire(import.meta.url)
    return join(dirname(require.resolve('@gummy-ui/studio/package.json')), 'dist')
  } catch {
    return null
  }
}
const DIST = studioDist()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

function usage() {
  console.log(`gummy ${pkg.version}

Usage:
  gummy init [dir] [options]   scaffold a starter app that renders gummy/projects/<key>/ with <GummyApp>
  gummy studio [options]       serve the studio over ./gummy in the current folder

init options:
  --name <name>  the package name (default: the folder's name)
  --force        write into a folder that is not empty (existing files are overwritten)

studio options:
  --port <n>     port to listen on (default 3300)
  --host <h>     interface to bind (default 127.0.0.1)
  --dir <path>   the folder holding workspace.json and projects/ (default gummy)
  --open         open the browser once the server is up
  --demo         a fresh folder starts with the Country demo instead of an empty project

  -h, --help     this help`)
}

function parseArgs(argv) {
  const opts = { command: argv[0], port: 3300, host: '127.0.0.1', dir: 'gummy', open: false, demo: false, help: false, name: '', force: false, target: '' }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]
    const value = () => argv[++i]
    if (a === '--port') opts.port = Number(value())
    else if (a.startsWith('--port=')) opts.port = Number(a.slice(7))
    else if (a === '--host') opts.host = value()
    else if (a.startsWith('--host=')) opts.host = a.slice(7)
    else if (a === '--dir') opts.dir = value()
    else if (a.startsWith('--dir=')) opts.dir = a.slice(6)
    else if (a === '--open') opts.open = true
    else if (a === '--demo') opts.demo = true
    else if (a === '--name') opts.name = value()
    else if (a.startsWith('--name=')) opts.name = a.slice(7)
    else if (a === '--force') opts.force = true
    else if (a === '-h' || a === '--help') opts.help = true
    else if (!a.startsWith('-') && !opts.target) opts.target = a
    else {
      console.error(`Unknown option: ${a}`)
      process.exit(2)
    }
  }
  return opts
}

/** The consumer package's name without its scope, else the folder name. */
function projectName(cwd) {
  try {
    const name = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).name
    if (typeof name === 'string' && name.trim()) return name.replace(/^@[^/]+\//, '')
  } catch {
    // no package.json
  }
  return basename(cwd)
}

/** A path inside the served folder: plain segments, none of them `.` or `..`, no leading slash. */
const safeRelativePath = (rel) =>
  typeof rel === 'string' &&
  rel.length > 0 &&
  rel.split('/').every((s) => /^[A-Za-z0-9._-]+$/.test(s) && s !== '.' && s !== '..')

const TEMPLATE = join(here, '..', 'template')

/** The file key a project is written under: its name as a slug. */
const slug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project'

/** Every file under `dir`, as paths relative to it. */
function listFiles(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    if (statSync(full).isDirectory()) out.push(...listFiles(full, rel))
    else out.push(rel)
  }
  return out
}

/**
 * `gummy init [dir]`: copy the template into `dir` with the placeholders
 * filled — `__NAME__` the package name, `__KEY__` its slug (the project file
 * name), `__CLI_VERSION__` / `__UI_VERSION__` the versions to depend on.
 */
function init(opts) {
  const target = resolve(process.cwd(), opts.target || '.')
  const name = (opts.name || basename(target)).replace(/^@[^/]+\//, '')
  const key = slug(name)
  if (!existsSync(TEMPLATE)) {
    console.error(`The starter template is missing (${TEMPLATE}). Reinstall @gummy-ui/cli.`)
    process.exit(1)
  }
  if (existsSync(target) && readdirSync(target).length > 0 && !opts.force) {
    console.error(`${target} is not empty — pass --force to write into it anyway (template files are overwritten).`)
    process.exit(1)
  }
  const vars = {
    __NAME__: name,
    __KEY__: key,
    __CLI_VERSION__: `^${pkg.version}`,
    __UI_VERSION__: `^${pkg.version}`,
  }
  const fill = (text) => text.replace(/__(NAME|KEY|CLI_VERSION|UI_VERSION)__/g, (m) => vars[m])
  const written = []
  for (const rel of listFiles(TEMPLATE)) {
    const outRel = fill(rel)
    const out = join(target, outRel)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, fill(readFileSync(join(TEMPLATE, rel), 'utf8')))
    written.push(outRel)
  }
  const rel = target === process.cwd() ? '.' : target.startsWith(process.cwd()) ? target.slice(process.cwd().length + 1) : target
  console.log(`gummy ${pkg.version} — created ${name} in ${rel}`)
  for (const f of written) console.log(`  ${f}`)
  console.log(`
Next:
  ${rel === '.' ? '' : `cd ${rel}\n  `}npm install
  npm run dev        # the app at http://localhost:5173 (renders gummy/projects/${key}/)
  npm run studio     # the studio at http://127.0.0.1:3300 — every save updates gummy/projects/${key}/`)
}

const hash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16)

/** Write `text` unless the file already holds exactly that; true when it wrote. */
function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return true
}

const PROJECT_KEY = /^[a-z0-9][a-z0-9-]*$/
const PAGE_FILE = /^[A-Za-z0-9_-]+$/

/**
 * One project as a folder (see the grilled design `split-pages-lazy-load`):
 * `projects/<key>/project.json` + `pages/<name>.json`, unchanged files left
 * alone, page files the manifest no longer names removed. Returns the files
 * written and removed (relative to `projectsDir`).
 */
function writeProjectFolder(projectsDir, key, folder) {
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

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })
  res.end(text)
}

function studio(opts) {
  if (!DIST || !existsSync(join(DIST, 'index.html'))) {
    console.error(
      DIST
        ? `The studio build is missing (${DIST}). Reinstall @gummy-ui/studio.`
        : 'Cannot find @gummy-ui/studio — install it beside @gummy-ui/cli (it is a dependency of this package).',
    )
    process.exit(1)
  }
  const cwd = process.cwd()
  const dir = resolve(cwd, opts.dir)
  const workspaceFile = join(dir, 'workspace.json')
  const projectsDir = join(dir, 'projects')
  const name = projectName(cwd)
  mkdirSync(projectsDir, { recursive: true })

  /** The revision of what is on disk right now (`''` when there is no file). */
  const diskRevision = () => (existsSync(workspaceFile) ? hash(readFileSync(workspaceFile, 'utf8')) : '')
  let lastWritten = diskRevision()
  const clients = new Set()
  const warnedLegacy = new Set()

  // Pushes a `changed` event when someone else writes the file (a git pull,
  // an editor); our own writes update `lastWritten` first and are skipped.
  let watchTimer = null
  try {
    watch(dir, { persistent: false }, (_event, file) => {
      if (file && file !== 'workspace.json') return
      if (watchTimer) clearTimeout(watchTimer)
      watchTimer = setTimeout(() => {
        const rev = diskRevision()
        if (rev === lastWritten) return
        lastWritten = rev
        for (const c of clients) c.write(`event: changed\ndata: ${JSON.stringify({ revision: rev })}\n\n`)
      }, 150)
    })
  } catch (err) {
    console.warn(`Cannot watch ${dir}: ${err.message}`)
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname

    try {
      if (path === '/__gummy/info') {
        return send(res, 200, { dir: opts.dir, name, demo: opts.demo, version: pkg.version })
      }
      if (path === '/__gummy/workspace' && req.method === 'GET') {
        if (!existsSync(workspaceFile)) return send(res, 200, { revision: '', workspace: null })
        const text = readFileSync(workspaceFile, 'utf8')
        return send(res, 200, `{"revision":${JSON.stringify(hash(text))},"workspace":${text}}`)
      }
      if (path === '/__gummy/workspace' && req.method === 'PUT') {
        const body = await readJson(req)
        const current = diskRevision()
        // A write is stale when the file changed under the studio. A file that
        // was deleted (or never existed) cannot be newer than the studio's copy,
        // so the studio's copy wins and recreates it.
        if (current !== '' && (body.revision ?? '') !== current) {
          return send(res, 409, { error: 'workspace.json changed on disk', revision: current })
        }
        const text = JSON.stringify(body.workspace, null, 2) + '\n'
        const revision = hash(text)
        lastWritten = revision
        writeFileSync(workspaceFile, text)
        const folders = body.projectFolders && typeof body.projectFolders === 'object' ? body.projectFolders : {}
        const written = []
        const removed = []
        for (const [key, folder] of Object.entries(folders)) {
          if (!PROJECT_KEY.test(key)) continue
          const r = writeProjectFolder(projectsDir, key, folder)
          written.push(...r.written)
          removed.push(...r.removed)
          // The single file of an earlier version shadows nothing (the folder wins in the starter's picker), but it is stale.
          if (existsSync(join(projectsDir, `${key}.json`)) && !warnedLegacy.has(key)) {
            warnedLegacy.add(key)
            console.log(`  note: ${opts.dir}/projects/${key}.json is superseded by ${opts.dir}/projects/${key}/ — delete it when you're ready.`)
          }
        }
        // An older studio build: one single-file document per project, as before.
        const legacy = body.projects && typeof body.projects === 'object' ? body.projects : {}
        for (const [key, project] of Object.entries(legacy)) {
          if (!PROJECT_KEY.test(key)) continue
          if (writeIfChanged(join(projectsDir, `${key}.json`), JSON.stringify(project, null, 2) + '\n')) written.push(`${key}.json`)
        }
        return send(res, 200, { revision, projects: [...Object.keys(folders), ...Object.keys(legacy)], written, removed })
      }
      if (path === '/__gummy/files' && req.method === 'PUT') {
        const body = await readJson(req)
        const files = body.files && typeof body.files === 'object' ? body.files : {}
        const written = []
        for (const [rel, text] of Object.entries(files)) {
          if (!safeRelativePath(rel) || typeof text !== 'string') continue
          const target = join(dir, rel)
          mkdirSync(dirname(target), { recursive: true })
          writeFileSync(target, text)
          written.push(rel)
        }
        return send(res, 200, { files: written })
      }
      if (path === '/__gummy/events') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-store',
          connection: 'keep-alive',
        })
        res.write(`event: hello\ndata: ${JSON.stringify({ revision: diskRevision() })}\n\n`)
        clients.add(res)
        req.on('close', () => clients.delete(res))
        return
      }
      if (path.startsWith('/__gummy/')) return send(res, 404, { error: 'not found' })

      // The prebuilt studio: a file under dist/, else index.html (SPA routes).
      const safe = resolve(DIST, '.' + decodeURIComponent(path))
      const file = safe.startsWith(DIST) && extname(safe) && existsSync(safe) ? safe : join(DIST, 'index.html')
      const type = MIME[extname(file)] ?? 'application/octet-stream'
      res.writeHead(200, {
        'content-type': type,
        'cache-control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
      })
      res.end(readFileSync(file))
    } catch (err) {
      console.error(err)
      send(res, 500, { error: String(err?.message ?? err) })
    }
  })

  server.listen(opts.port, opts.host, () => {
    const origin = `http://${opts.host === '0.0.0.0' ? 'localhost' : opts.host}:${opts.port}`
    console.log(`gummy studio ${pkg.version}`)
    console.log(`  workspace  ${workspaceFile}${existsSync(workspaceFile) ? '' : '  (new — starts with ' + (opts.demo ? 'the Country demo' : `an empty project "${name}"`) + ')'}`)
    console.log(`  projects   ${projectsDir}/<key>/  (project.json + pages/*.json)`)
    console.log(`  studio     ${origin}`)
    if (opts.open) {
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      spawn(cmd, [origin], { shell: process.platform === 'win32', stdio: 'ignore', detached: true }).unref()
    }
  })
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${opts.port} is in use — pass --port <n>.` : err.message)
    process.exit(1)
  })
}

const opts = parseArgs(process.argv.slice(2))
if (opts.help || !opts.command) {
  usage()
  process.exit(opts.help ? 0 : 2)
}
if (opts.command === 'studio') studio(opts)
else if (opts.command === 'init') init(opts)
else {
  console.error(`Unknown command: ${opts.command}\n`)
  usage()
  process.exit(2)
}
