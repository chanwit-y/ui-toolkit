import { createAuthDef, normalizeAuthDef, type AuthDef } from '../../components/Workspace/auth'
import { ToolError } from '../errors'
import { resolveRefs, type RefScope } from '../refs'
import { assertMatches } from '../schemas'
import { CONFIRM, deepMerge, obj, optionalObject, str, writeInput, type Tool } from './shared'

/*
 * Shared sign-in entries (Azure SSO, see the grilled design `azure-sso-auth`):
 * library-level, picked per project with `set_project_auth`.
 */

/** Endpoint names → ids inside an entry patch (the profile fetch's `read.endpointId`). */
function libraryScope(endpoints: { id: string; name: string }[]): RefScope {
  return {
    pages: [],
    endpoints: endpoints.map((e) => ({ id: e.id, names: [e.name] })),
    loads: [],
    actions: [],
    components: [],
    items: [],
    usedEndpoints: new Set(),
  }
}

export const signinTools: Tool[] = [
  {
    name: 'upsert_auth',
    description:
      'Create or update a shared sign-in entry (Azure SSO): env var names + devValues (tenantId, clientId, redirectUri, scope), loginMode, cacheLocation, the profile fetch { enabled, read: { endpointId, params, extra }, paths, emailParam, stateKey } (its data becomes the `stateKey` slice, "me" by default), the landing / denied / loading screen texts and the user menu keys. A deep-merge patch checked against AuthDef; projects pick it with set_project_auth.',
    inputSchema: writeInput({ name: str('Entry name.'), auth: obj('Patch, e.g. { "profile": { "enabled": true, "read": { "endpointId": "staffByEmail" }, "paths": "data" } }'), rename: str('') }, ['name']),
    write: true,
    run: (s, i) => {
      const list = s.ws.library.auth ?? []
      const name = String(i.name)
      const existing = list.find((a) => a.id === name || a.name === name)
      const finalName = i.rename ? String(i.rename) : (existing?.name ?? name)
      if (list.some((a) => a.name === finalName && a.id !== existing?.id)) throw new ToolError(`a sign-in entry "${finalName}" already exists`, 'rename')
      const patch = resolveRefs(optionalObject(i.auth, 'auth') ?? {}, libraryScope(s.ws.library.endpoints), 'auth')
      const def = { ...deepMerge(existing ? normalizeAuthDef(existing) : createAuthDef(finalName), patch), name: finalName } as AuthDef
      if (def.id !== (existing?.id ?? def.id)) throw new ToolError('the id cannot change', 'auth.id')
      assertMatches('AuthDef', def, 'auth')
      if (def.profile.enabled && !def.profile.read.endpointId) s.warn(`${def.name}: the profile fetch is on but has no endpoint`)
      s.ws = { ...s.ws, library: { ...s.ws.library, auth: existing ? list.map((a) => (a.id === existing.id ? def : a)) : [...list, def] } }
      s.log(existing ? (i.rename ? 'renamed' : 'updated') : 'created', 'auth', def.name, existing && i.rename ? `was ${existing.name}` : 'Azure SSO', null)
      return def
    },
  },
  {
    name: 'delete_auth',
    description: 'Delete a shared sign-in entry. Needs confirm: true; without it, lists the projects that pick it (they keep the dangling pick, exported as no sign-in).',
    inputSchema: writeInput({ auth: str('Entry name or id.'), confirm: CONFIRM }, ['auth']),
    write: true,
    run: (s, i) => {
      const list = s.ws.library.auth ?? []
      const def = list.find((a) => a.id === i.auth || a.name === i.auth)
      if (!def) throw new ToolError(`no sign-in entry "${i.auth}"`, 'auth')
      const users = s.ws.projects.filter((p) => p.snapshot.authId === def.id).map((p) => p.name)
      if (i.confirm !== true) return { confirmRequired: true, wouldRemove: def.name, pickedBy: users }
      s.ws = { ...s.ws, library: { ...s.ws.library, auth: list.filter((a) => a.id !== def.id) } }
      s.log('deleted', 'auth', def.name, '', null)
      return { deleted: def.name }
    },
  },
]
