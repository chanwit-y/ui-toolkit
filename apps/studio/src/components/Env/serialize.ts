import type { EnvVarDef } from './types'

/**
 * Lowers the env vars onto the two artifacts the code pane shows: a
 * paste-ready `.env` and the App-wiring snippet that consumes it. Names are
 * `VITE_`-prefixed on export — Vite only exposes prefixed vars to client code
 * (matching how `apps/example` reads `import.meta.env.VITE_API_URL`) — unless
 * the author already typed the prefix themselves.
 */

/** The exported (Vite-visible) name for a var. */
export function exportName(name: string): string {
  const trimmed = name.trim()
  return trimmed.startsWith('VITE_') ? trimmed : `VITE_${trimmed}`
}

/** The `.env` file: one KEY=value line per named var (unnamed rows skipped). */
export function toDotEnv(vars: EnvVarDef[]): string {
  const lines = vars
    .filter((v) => v.name.trim())
    .map((v) => `${exportName(v.name)}=${v.value}`)
  return lines.length === 0 ? '# no variables defined' : `${lines.join('\n')}\n`
}

/**
 * The wiring snippet: how the exported config files consume the `.env` —
 * `HttpClientFactory` takes `VITE_API_URL` as its base URL and `Core` renders
 * the model/api/container trio, mirroring `apps/example/src/App.tsx`.
 */
export function toWiringTs(vars: EnvVarDef[]): string {
  const apiUrl = exportName(
    vars.find((v) => v.name.trim() === 'API_URL')?.name ?? 'API_URL',
  )
  return `import { Core, HttpClientFactory } from "@gummy-ui/ui";
import { model } from "./model";
import { api } from "./api";
import { containers } from "./container";

const http = new HttpClientFactory(
  import.meta.env.${apiUrl} ?? "",
  async () => "", // token getter (see auth/azure getAccessToken)
  "1.0.0",
  30000,
);

export const ui = new Core(http, model, api, containers).run();
`
}
