/**
 * Dev-only performance instrumentation. All helpers compile to cheap no-ops in
 * production (`import.meta.env.DEV` is statically false), so they can stay in
 * the hot paths without shipping overhead.
 */

const ENABLED = import.meta.env.DEV

/** Time a synchronous function, logging its duration via `performance.measure`. */
export function measure<T>(label: string, fn: () => T): T {
  if (!ENABLED) return fn()

  const start = `${label}:start`
  performance.mark(start)
  try {
    return fn()
  } finally {
    const measureName = `⏱ ${label}`
    performance.measure(measureName, { start })
    const entries = performance.getEntriesByName(measureName)
    const last = entries[entries.length - 1]
    if (last) {
      console.debug(`[perf] ${label}: ${last.duration.toFixed(2)}ms`)
    }
    performance.clearMarks(start)
    performance.clearMeasures(measureName)
  }
}

/** Read the dev-only `?seed=N` URL param (clamped) for benchmark seeding. */
export function readSeedCount(): number {
  if (!ENABLED || typeof window === 'undefined') return 0
  const raw = new URLSearchParams(window.location.search).get('seed')
  if (!raw) return 0
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(500, Math.max(0, Math.round(n)))
}
