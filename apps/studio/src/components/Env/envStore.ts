import { create } from 'zustand'
import { API_URL_NAME, type EnvVarDef } from './types'

/** Mirror gridStore's id strategy. */
function createId(): string {
  return crypto.randomUUID()
}

/** Unique "VAR_N" across the list. */
function nextVarName(vars: EnvVarDef[]): string {
  let n = vars.length + 1
  const taken = new Set(vars.map((v) => v.name))
  while (taken.has(`VAR_${n}`)) n++
  return `VAR_${n}`
}

type EnvStore = {
  vars: EnvVarDef[]

  addVar: () => void
  /** No-op for locked rows (API_URL) — studio consumes them by name. */
  removeVar: (id: string) => void
  renameVar: (id: string, name: string) => void
  updateValue: (id: string, value: string) => void
}

/**
 * The Env page's store. In-memory like every other studio store (grid, model,
 * api) — no persistence. Seeded with the one var studio itself understands:
 * `API_URL`, the Live Preview's HttpClientFactory base URL (see the grilled
 * design). Locked rows keep their name and can't be removed; their value is
 * editable like any other.
 */
export const useEnvStore = create<EnvStore>((set) => ({
  vars: [{ id: createId(), name: API_URL_NAME, value: '', locked: true }],

  addVar: () =>
    set((s) => ({
      vars: [
        ...s.vars,
        { id: createId(), name: nextVarName(s.vars), value: '', locked: false },
      ],
    })),

  removeVar: (id) =>
    set((s) => ({ vars: s.vars.filter((v) => v.id !== id || v.locked) })),

  renameVar: (id, name) =>
    set((s) => ({
      vars: s.vars.map((v) => (v.id === id && !v.locked ? { ...v, name } : v)),
    })),

  updateValue: (id, value) =>
    set((s) => ({ vars: s.vars.map((v) => (v.id === id ? { ...v, value } : v)) })),
}))

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __envStore?: typeof useEnvStore }).__envStore = useEnvStore
}

/** The current API_URL value ('' = unset) — the Live Preview's base URL. */
export function useApiUrl(): string {
  return useEnvStore(
    (s) => s.vars.find((v) => v.name === API_URL_NAME)?.value.trim() ?? '',
  )
}
