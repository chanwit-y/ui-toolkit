import type { AzureAuthProfile, GummyProjectAuth } from '@gummy-ui/ui'
import { DEFAULT_AUTH_ENV_NAMES, DEFAULT_USER_MENU_KEYS } from '@gummy-ui/ui'
import { urlParams } from '../Api/warnings'
import type { EndpointDef } from '../Api/types'
import type { EnvVarDef } from '../Env/types'
import { createFormListCrudRef, type FormListCrudRef, type NavParamSource } from '../Layout/types'
import type { PageLoadDef } from './pageLoads'

/**
 * Azure SSO in the studio (see the grilled design `azure-sso-auth`): the
 * shared library holds **auth entries** (`library.auth`), a project picks one
 * (`snapshot.authId`), and the export writes it as the runtime document's
 * `auth` block. An entry stores the env var **names** (the values come from
 * the project's Env rows, seeded + locked on pick), the profile fetch
 * (a library endpoint + the key that receives the signed-in email), the
 * screen texts and the app-bar user menu keys.
 */

export const AUTH_ID_PREFIX = 'auth-'
/** Emitted where a project's picked entry no longer exists. */
export const MISSING_AUTH = 'MISSING_AUTH'
/** The pseudo page load the profile fetch shows up as (bindings pick it like a global load). */
export const AUTH_PROFILE_LOAD_ID = 'load-auth-profile'

export type AuthEnvRole = 'tenantId' | 'clientId' | 'redirectUri' | 'scope'
export const AUTH_ENV_ROLES: { role: AuthEnvRole; label: string; hint: string }[] = [
  { role: 'tenantId', label: 'Tenant id', hint: 'The Azure AD directory (tenant) id' },
  { role: 'clientId', label: 'Client id', hint: 'The app registration (client) id' },
  { role: 'redirectUri', label: 'Redirect URL', hint: 'Blank at runtime ⇒ the page origin' },
  { role: 'scope', label: 'API scope', hint: 'api://<client-id>/.default or a named scope' },
]

export type AuthScreenTextDef = { title: string; message: string; buttonLabel: string }

export type AuthDef = {
  /** Stable id (`auth-…`) the projects reference. */
  id: string
  name: string
  provider: 'azure'
  /** Env var names per setting. */
  env: Record<AuthEnvRole, string>
  /** Dev default values per setting, seeded into a project's Env rows on pick. */
  devValues: Record<AuthEnvRole, string>
  loginMode: 'redirect' | 'popup'
  cacheLocation: 'localStorage' | 'sessionStorage'
  profile: {
    enabled: boolean
    read: FormListCrudRef
    /** Dot path to the profile record inside the response (`data`). */
    paths: string
    /** The `:param` / query key that receives the signed-in email. */
    emailParam: string
    stateKey: string
  }
  /** `''` = the engine default text. */
  screens: { landing: AuthScreenTextDef; denied: AuthScreenTextDef; loading: { message: string } }
  /** Paths into the profile record (fallback lists; a `{{a}} {{b}}` template is allowed). */
  userMenu: { show: boolean; nameKey: string[]; subtitleKey: string[]; avatarKey: string[]; companyKey: string[]; idKey: string[]; idLabel: string }
}

export function createAuthDef(name = 'Azure SSO'): AuthDef {
  return {
    id: `${AUTH_ID_PREFIX}${crypto.randomUUID()}`,
    name,
    provider: 'azure',
    env: { ...DEFAULT_AUTH_ENV_NAMES },
    devValues: { tenantId: '', clientId: '', redirectUri: '', scope: '' },
    loginMode: 'redirect',
    cacheLocation: 'localStorage',
    profile: { enabled: false, read: createFormListCrudRef(), paths: 'data', emailParam: 'email', stateKey: 'me' },
    screens: {
      landing: { title: '', message: '', buttonLabel: '' },
      denied: { title: '', message: '', buttonLabel: '' },
      loading: { message: '' },
    },
    userMenu: {
      show: true,
      nameKey: [DEFAULT_USER_MENU_KEYS.nameKey as string],
      subtitleKey: [DEFAULT_USER_MENU_KEYS.subtitleKey as string],
      avatarKey: [DEFAULT_USER_MENU_KEYS.avatarKey as string],
      companyKey: [DEFAULT_USER_MENU_KEYS.companyKey as string],
      idKey: [...(DEFAULT_USER_MENU_KEYS.idKey as string[])],
      idLabel: '',
    },
  }
}

/** A stored entry with every field present (older / hand-edited payloads). */
export function normalizeAuthDef(raw: Partial<AuthDef> & { id: string }): AuthDef {
  const base = createAuthDef(raw.name)
  return {
    ...base,
    ...raw,
    env: { ...base.env, ...raw.env },
    devValues: { ...base.devValues, ...raw.devValues },
    profile: { ...base.profile, ...raw.profile, read: raw.profile?.read ?? base.profile.read },
    screens: {
      landing: { ...base.screens.landing, ...raw.screens?.landing },
      denied: { ...base.screens.denied, ...raw.screens?.denied },
      loading: { ...base.screens.loading, ...raw.screens?.loading },
    },
    userMenu: { ...base.userMenu, ...Object.fromEntries(Object.entries(raw.userMenu ?? {}).filter(([, v]) => v !== undefined)) },
  }
}

/** The var name of one setting (`''` ⇒ the engine default). */
export function authEnvName(def: AuthDef, role: AuthEnvRole): string {
  return def.env[role].trim() || DEFAULT_AUTH_ENV_NAMES[role]
}

/** The profile endpoint id, when the profile fetch is on and points somewhere. */
export function authProfileEndpointId(def: AuthDef | undefined): string | null {
  return def?.profile.enabled ? def.profile.read.endpointId : null
}

/**
 * The profile fetch as a page-load definition, so bindings / conditions /
 * param sources pick "the signed-in profile" like a global load and the
 * export resolves its id to the slice key. Not a real load: it is never
 * exported to `globalLoads` (the engine's auth provider fetches it).
 */
export function authProfileLoad(def: AuthDef | undefined): PageLoadDef | null {
  if (!def?.profile.enabled || def.profile.read.endpointId == null) return null
  return {
    id: AUTH_PROFILE_LOAD_ID,
    key: def.profile.stateKey.trim() || 'me',
    read: def.profile.read,
    paths: def.profile.paths,
    loading: 'skeleton',
    errorMessage: '',
  }
}

/**
 * The project's Env rows after picking `def`: the four var names present and
 * **locked** (a row that already exists keeps its value and just locks; a
 * new one takes the entry's dev value). `null` unlocks them (never deletes).
 */
export function authEnvRows(def: AuthDef | null, vars: EnvVarDef[], previous?: AuthDef | null): EnvVarDef[] {
  const prevNames = new Set(previous ? AUTH_ENV_ROLES.map((r) => authEnvName(previous, r.role)) : [])
  let next = vars.map((v) => (prevNames.has(v.name.trim()) && v.name !== 'API_URL' ? { ...v, locked: false } : v))
  if (!def) return next
  for (const { role } of AUTH_ENV_ROLES) {
    const name = authEnvName(def, role)
    const at = next.findIndex((v) => v.name.trim() === name)
    if (at >= 0) next = next.map((v, i) => (i === at ? { ...v, locked: true } : v))
    else next = [...next, { id: `auth-env-${role}-${crypto.randomUUID()}`, name, value: def.devValues[role] ?? '', locked: true }]
  }
  return next
}

const same = (a: string, b: string) => a.trim() === b.trim()

function keyPath(paths: string[]): string | string[] | undefined {
  const list = paths.map((p) => p.trim()).filter(Boolean)
  if (list.length === 0) return undefined
  return list.length === 1 ? list[0] : list
}

/** A literal param source → an engine `value` DataValue (anything else can't resolve above the router). */
function literalValue(src: NavParamSource): Record<string, unknown> | undefined {
  if (src.type === 'value') return { type: 'value', key: 'none', value: src.value }
  return undefined
}

/**
 * The runtime `auth` block of an entry: provider, the env var names (only
 * when they differ from the engine defaults), the profile fetch (when on and
 * its endpoint is attached — the email key is left out of `params`, the
 * engine fills it), the texts and user-menu keys that were set.
 */
export function authToEngine(def: AuthDef, endpoints: EndpointDef[]): GummyProjectAuth {
  const out: GummyProjectAuth = { provider: 'azure' }
  const env: Partial<Record<AuthEnvRole, string>> = {}
  for (const { role } of AUTH_ENV_ROLES) {
    const name = authEnvName(def, role)
    if (name !== DEFAULT_AUTH_ENV_NAMES[role]) env[role] = name
  }
  if (Object.keys(env).length) out.env = env
  if (def.loginMode === 'popup') out.loginMode = 'popup'
  if (def.cacheLocation === 'sessionStorage') out.cacheLocation = 'sessionStorage'

  const endpoint = def.profile.enabled ? endpoints.find((e) => e.id === def.profile.read.endpointId) : undefined
  if (def.profile.enabled && endpoint) {
    const emailParam = def.profile.emailParam.trim() || 'email'
    const params: Record<string, unknown> = {}
    for (const k of urlParams(endpoint.url)) {
      if (k === emailParam) continue
      const src = def.profile.read.params[k]
      const dv = src ? literalValue(src) : undefined
      if (dv) params[k] = dv
    }
    const query: Record<string, unknown> = {}
    for (const [k, src] of Object.entries(def.profile.read.extra)) {
      if (!k.trim() || k === emailParam) continue
      const dv = literalValue(src)
      if (dv) query[k] = dv
    }
    const paths = def.profile.paths.split('.').map((s) => s.trim()).filter(Boolean)
    out.profile = {
      api: {
        name: endpoint.name.trim(),
        ...(paths.length ? { paths } : {}),
        ...(Object.keys(params).length ? { params } : {}),
        ...(Object.keys(query).length ? { query } : {}),
      } as AzureAuthProfile['api'],
      emailParam,
      ...(def.profile.stateKey.trim() && def.profile.stateKey.trim() !== 'me' ? { stateKey: def.profile.stateKey.trim() } : {}),
    }
  }

  const text = (t: AuthScreenTextDef) => ({
    ...(t.title.trim() ? { title: t.title.trim() } : {}),
    ...(t.message.trim() ? { message: t.message.trim() } : {}),
    ...(t.buttonLabel.trim() ? { buttonLabel: t.buttonLabel.trim() } : {}),
  })
  const screens = {
    ...(Object.keys(text(def.screens.landing)).length ? { landing: text(def.screens.landing) } : {}),
    ...(Object.keys(text(def.screens.denied)).length ? { denied: text(def.screens.denied) } : {}),
    ...(def.screens.loading.message.trim() ? { loading: { message: def.screens.loading.message.trim() } } : {}),
  }
  if (Object.keys(screens).length) out.screens = screens

  const nameKey = keyPath(def.userMenu.nameKey)
  const subtitleKey = keyPath(def.userMenu.subtitleKey)
  const avatarKey = keyPath(def.userMenu.avatarKey)
  const companyKey = keyPath(def.userMenu.companyKey)
  const idKey = keyPath(def.userMenu.idKey)
  const idLabel = (def.userMenu.idLabel ?? '').trim()
  const userMenu = {
    ...(def.userMenu.show ? {} : { show: false }),
    ...(nameKey !== undefined && !same(String(nameKey), DEFAULT_USER_MENU_KEYS.nameKey as string) ? { nameKey } : {}),
    ...(subtitleKey !== undefined && !same(String(subtitleKey), DEFAULT_USER_MENU_KEYS.subtitleKey as string) ? { subtitleKey } : {}),
    ...(avatarKey !== undefined && !same(String(avatarKey), DEFAULT_USER_MENU_KEYS.avatarKey as string) ? { avatarKey } : {}),
    ...(companyKey !== undefined && !same(String(companyKey), DEFAULT_USER_MENU_KEYS.companyKey as string) ? { companyKey } : {}),
    ...(idKey !== undefined && String(idKey) !== String(DEFAULT_USER_MENU_KEYS.idKey) ? { idKey } : {}),
    ...(idLabel && idLabel !== DEFAULT_USER_MENU_KEYS.idLabel ? { idLabel } : {}),
  }
  if (Object.keys(userMenu).length) out.userMenu = userMenu
  return out
}

/** Entries whose name is duplicated (after trimming), by name. */
export function duplicateAuthNames(defs: AuthDef[]): Set<string> {
  const seen = new Map<string, number>()
  for (const d of defs) {
    const name = d.name.trim()
    if (!name) continue
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name))
}
