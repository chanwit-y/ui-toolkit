#!/usr/bin/env node
/**
 * `gummy` — the Gummy UI command line (see the grilled library / CLI design).
 *
 *   gummy studio [--port 3300] [--dir gummy] [--host 127.0.0.1] [--open] [--demo]
 *
 * Serves the prebuilt studio (this package's `dist/`) and a small file API
 * over the consumer's `./gummy/` folder:
 *
 *   GET  /__gummy/info            { dir, name, demo, version }
 *   GET  /__gummy/workspace       { revision, workspace | null }   — workspace.json
 *   PUT  /__gummy/workspace       { revision, workspace, projects } → { revision }
 *                                  409 when `revision` is not the file's current one
 *   GET  /__gummy/events          server-sent `changed` events when the file changes on disk
 *
 * The studio serialises everything in the browser; the CLI only stores files:
 * `workspace.json` (the studio's own state, migrated by the studio on load)
 * and `projects/<key>.json` (the runtime documents `<GummyApp>` renders).
 * Node 18+, no dependencies, localhost only by default.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
const DIST = join(here, '..', 'dist')

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
  gummy studio [options]   serve the studio over ./gummy in the current folder

Options:
  --port <n>     port to listen on (default 3300)
  --host <h>     interface to bind (default 127.0.0.1)
  --dir <path>   the folder holding workspace.json and projects/ (default gummy)
  --open         open the browser once the server is up
  --demo         a fresh folder starts with the Country demo instead of an empty project
  -h, --help     this help`)
}

function parseArgs(argv) {
  const opts = { command: argv[0], port: 3300, host: '127.0.0.1', dir: 'gummy', open: false, demo: false, help: false }
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
    else if (a === '-h' || a === '--help') opts.help = true
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

const hash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16)

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
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`The studio build is missing (${DIST}). Reinstall @gummy-ui/studio.`)
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
        if ((body.revision ?? '') !== current) {
          return send(res, 409, { error: 'workspace.json changed on disk', revision: current })
        }
        const text = JSON.stringify(body.workspace, null, 2) + '\n'
        const revision = hash(text)
        lastWritten = revision
        writeFileSync(workspaceFile, text)
        const projects = body.projects && typeof body.projects === 'object' ? body.projects : {}
        for (const [key, project] of Object.entries(projects)) {
          if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) continue
          writeFileSync(join(projectsDir, `${key}.json`), JSON.stringify(project, null, 2) + '\n')
        }
        return send(res, 200, { revision, projects: Object.keys(projects) })
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
    console.log(`  projects   ${projectsDir}/<key>.json`)
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
else {
  console.error(`Unknown command: ${opts.command}\n`)
  usage()
  process.exit(2)
}
