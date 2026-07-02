/**
 * Editor-side shape for the Env page. A var's `name` is the logical key
 * (API_URL); the export prefixes it for Vite (`VITE_API_URL`) since only
 * prefixed vars reach client code. `locked` marks the seeded rows studio
 * itself understands (API_URL drives the Live Preview's HttpClientFactory):
 * their name can't change and the row can't be removed — the value stays
 * editable.
 */
export type EnvVarDef = {
  /** Stable id for React keys + store ops; never serialized. */
  id: string
  name: string
  value: string
  /** Name fixed + row not removable (studio consumes this var by name). */
  locked: boolean
}

/** The one var studio consumes itself (Live Preview base URL). */
export const API_URL_NAME = 'API_URL'
