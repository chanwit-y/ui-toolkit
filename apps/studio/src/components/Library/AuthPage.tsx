import {
  AuthDeniedScreen,
  AuthLandingScreen,
  AuthLoadingScreen,
  DEFAULT_AUTH_ENV_NAMES,
  DEFAULT_SCREEN_TEXT,
  DEFAULT_USER_MENU_KEYS,
  screenText,
} from '@gummy-ui/ui'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { urlParams } from '../Api/warnings'
import { Button, cn, ConfirmDialog, IconButton, Input, SegmentedControl, Select } from '../common'
import { PathListField, type PathFields } from '../Layout/ApprovalLineConfigPanel'
import { flattenModelFields, walkModelPath } from '../Layout/rowFields'
import {
  AUTH_ENV_ROLES,

  duplicateAuthNames,
  normalizeAuthDef,
  type AuthDef,
  type AuthEnvRole,
  type AuthScreenTextDef,
} from '../Workspace/auth'
import { useWorkspaceStore } from '../Workspace/workspaceStore'
import { LibraryScopeContext, useScopedEndpoints, useScopedModels } from './scope'

const NO_AUTH: AuthDef[] = []
const LOGIN_MODES = [
  { value: 'redirect', label: 'Redirect' },
  { value: 'popup', label: 'Popup' },
]
const CACHE_OPTIONS = [
  { value: 'localStorage', label: 'localStorage (stays signed in across tabs)' },
  { value: 'sessionStorage', label: 'sessionStorage (per tab)' },
]

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-ui-xs text-ink-3">{hint}</span>}
    </label>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5 border-t border-line pt-4">
      <div>
        <span className="sec-label block">{title}</span>
        {hint && <p className="mt-0.5 text-ui-sm text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** The three screen cards, drawn by the real library components with the entry's texts. */
function ScreenPreviews({ def }: { def: AuthDef }) {
  const noop = async () => {}
  const appBar = { title: 'Your app', icon: 'shieldCheck' as const }
  const text = (kind: 'landing' | 'denied' | 'loading', t: Partial<AuthScreenTextDef> | { message: string }) =>
    screenText(kind, Object.fromEntries(Object.entries(t).filter(([, v]) => (v as string).trim())))
  return (
    <div className="auth-preview grid gap-3 md:grid-cols-3" aria-hidden="true">
      <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-line bg-sunken">
        <AuthLandingScreen signIn={noop} signOut={noop} text={text('landing', def.screens.landing)} appBar={appBar} />
      </div>
      <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-line bg-sunken">
        <AuthLoadingScreen signIn={noop} signOut={noop} text={text('loading', def.screens.loading)} appBar={appBar} />
      </div>
      <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-line bg-sunken">
        <AuthDeniedScreen signIn={noop} signOut={noop} text={text('denied', def.screens.denied)} appBar={appBar} />
      </div>
    </div>
  )
}

function ScreenTextFields({ label, value, onChange, defaults, titleHint }: { label: string; value: AuthScreenTextDef; onChange: (next: AuthScreenTextDef) => void; defaults: { title?: string; message: string; buttonLabel: string }; titleHint?: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <Field label={`${label} title`} hint={titleHint}>
        <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder={defaults.title ?? 'the app bar title'} />
      </Field>
      <Field label={`${label} message`}>
        <Input value={value.message} onChange={(e) => onChange({ ...value, message: e.target.value })} placeholder={defaults.message} />
      </Field>
      <Field label={`${label} button`}>
        <Input value={value.buttonLabel} onChange={(e) => onChange({ ...value, buttonLabel: e.target.value })} placeholder={defaults.buttonLabel} />
      </Field>
    </div>
  )
}

function AuthForm({ def, usedBy }: { def: AuthDef; usedBy: string[] }) {
  const update = useWorkspaceStore((s) => s.updateAuth)
  const endpoints = useScopedEndpoints()
  const models = useScopedModels()
  const patch = (p: Partial<AuthDef>) => update(def.id, p)
  const profile = def.profile
  const setProfile = (p: Partial<AuthDef['profile']>) => patch({ profile: { ...profile, ...p } })
  const endpoint = endpoints.find((e) => e.id === profile.read.endpointId)

  // The keys the email can go into: the endpoint's URL :params and its query model's fields.
  const emailKeys = useMemo(() => {
    if (!endpoint) return []
    const query = endpoint.query ? models.find((m) => m.id === endpoint.query)?.fields.map((f) => f.name) ?? [] : []
    return [...new Set([...urlParams(endpoint.url), ...query])]
  }, [endpoint, models])

  // The profile record's fields (the response model walked along `paths`), for the user-menu pickers.
  const recordFields = useMemo<PathFields>(() => {
    if (!endpoint) return { fields: null, reason: 'Pick the profile endpoint to choose from its response fields.' }
    const model = endpoint.response ? models.find((m) => m.id === endpoint.response) : undefined
    if (!model) return { fields: null, reason: 'The endpoint has no response model — type the paths.' }
    const path = profile.paths.trim()
    if (!path) return { fields: flattenModelFields(model.fields) }
    const field = walkModelPath(model.fields, path)
    if (!field) return { fields: null, reason: `“${path}” is not in the ${model.name} model — type the paths.` }
    if (field.kind !== 'object') return { fields: null, reason: `“${path}” is not an object in ${model.name} — type the paths.` }
    return { fields: flattenModelFields(field.children) }
  }, [endpoint, models, profile.paths])

  const endpointOptions = [
    { value: '', label: '— none —' },
    ...(profile.read.endpointId && !endpoint ? [{ value: profile.read.endpointId, label: '⚠ missing endpoint' }] : []),
    ...endpoints.map((e) => ({ value: e.id, label: `${e.name.trim() || '(unnamed)'} · ${e.method} ${e.url}` })),
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
          <Field label="Name">
            <Input value={def.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Entry name" aria-label="Entry name" />
          </Field>
          <Field label="Provider">
            <Select options={[{ value: 'azure', label: 'Azure AD (MSAL)' }]} value="azure" onChange={() => {}} aria-label="Provider" />
          </Field>
        </div>
        <p className="text-ui-sm text-ink-3">
          {usedBy.length ? `Picked by ${usedBy.join(', ')}.` : 'Not picked by any project yet — pick it on a project’s Env page.'}
        </p>
      </div>

      <Section
        title="Environment"
        hint="The settings are read from env vars at runtime, so one entry serves dev, staging and prod. Picking the entry seeds these rows (locked) on the project's Env page; the dev values are what they start with."
      >
        <div className="space-y-2">
          <div className="grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 text-ui-xs font-medium uppercase tracking-wide text-ink-3">
            <span />
            <span>Env var name</span>
            <span>Dev value</span>
          </div>
          {AUTH_ENV_ROLES.map(({ role, label, hint }) => (
            <div key={role} className="grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5">
              <span className="text-ui-sm font-medium text-ink-2">{label}</span>
              <Input
                value={def.env[role]}
                onChange={(e) => patch({ env: { ...def.env, [role]: e.target.value } })}
                placeholder={DEFAULT_AUTH_ENV_NAMES[role as AuthEnvRole]}
                aria-label={`${label} env var name`}
                className="font-mono"
              />
              <Input
                value={def.devValues[role]}
                onChange={(e) => patch({ devValues: { ...def.devValues, [role]: e.target.value } })}
                placeholder="dev value (optional)"
                aria-label={`${label} dev value`}
                className="font-mono"
              />
              <span className="col-span-2 col-start-2 text-ui-xs text-ink-3">{hint}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sign-in" hint="How MSAL asks Microsoft: a full-page redirect (the usual) or a popup window.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Login mode">
            <SegmentedControl aria-label="Login mode" options={LOGIN_MODES} value={def.loginMode} onChange={(v) => patch({ loginMode: v as AuthDef['loginMode'] })} />
          </Field>
          <Field label="Token cache">
            <Select options={CACHE_OPTIONS} value={def.cacheLocation} onChange={(v) => patch({ cacheLocation: v as AuthDef['cacheLocation'] })} aria-label="Token cache" />
          </Field>
        </div>
      </Section>

      <Section
        title="Profile"
        hint="After sign-in the app fetches the user's profile from this endpoint with the signed-in email, waits for it, and shows the denied screen when the request fails. The record lands in a state slice every page can bind to."
      >
        <label className="flex items-center gap-2 text-ui">
          <input type="checkbox" checked={profile.enabled} onChange={(e) => setProfile({ enabled: e.target.checked })} />
          Fetch a profile after sign-in
        </label>
        {profile.enabled && (
          <div className="space-y-2">
            <Field label="Endpoint (shared library)">
              <Select
                options={endpointOptions}
                value={profile.read.endpointId ?? ''}
                onChange={(v) => setProfile({ read: { ...profile.read, endpointId: v === '' ? null : v, params: {} } })}
                aria-label="Profile endpoint"
              />
            </Field>
            <div className="grid gap-2 md:grid-cols-3">
              <Field label="Email goes into" hint="A :param of the URL or a key of the query model.">
                {emailKeys.length ? (
                  <Select
                    options={[...(emailKeys.includes(profile.emailParam) ? [] : [{ value: profile.emailParam, label: `${profile.emailParam || '(unset)'} ⚠ not declared` }]), ...emailKeys.map((k) => ({ value: k, label: k }))]}
                    value={profile.emailParam}
                    onChange={(v) => setProfile({ emailParam: v })}
                    aria-label="Email key"
                  />
                ) : (
                  <Input value={profile.emailParam} onChange={(e) => setProfile({ emailParam: e.target.value })} placeholder="email" className="font-mono" aria-label="Email key" />
                )}
              </Field>
              <Field label="Record path" hint="Dot path to the profile object in the response.">
                <Input value={profile.paths} onChange={(e) => setProfile({ paths: e.target.value })} placeholder="data" className="font-mono" aria-label="Record path" />
              </Field>
              <Field label="State key" hint="The slice pages bind to (Page data → Sign-in).">
                <Input value={profile.stateKey} onChange={(e) => setProfile({ stateKey: e.target.value })} placeholder="me" className="font-mono" aria-label="State key" />
              </Field>
            </div>
            {profile.read.endpointId && !endpoint && (
              <p className="text-ui-sm text-warn">The endpoint was deleted — projects using this entry sign in but fetch no profile.</p>
            )}
            {endpoint && urlParams(endpoint.url).some((k) => k !== profile.emailParam) && (
              <p className="text-ui-sm text-ink-3">
                Other URL params ({urlParams(endpoint.url).filter((k) => k !== profile.emailParam).map((k) => `:${k}`).join(', ')}) have no value here — the engine holds the fetch until they resolve; prefer an endpoint keyed only by the email.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="Screens" hint="The sign-in, loading and denied cards. Blank = the engine's default text; the landing title defaults to the app bar's title, and both cards show the app bar logo.">
        <ScreenTextFields label="Landing" value={def.screens.landing} onChange={(landing) => patch({ screens: { ...def.screens, landing } })} defaults={DEFAULT_SCREEN_TEXT.landing} />
        <ScreenTextFields label="Denied" value={def.screens.denied} onChange={(denied) => patch({ screens: { ...def.screens, denied } })} defaults={DEFAULT_SCREEN_TEXT.denied} />
        <Field label="Loading message">
          <Input value={def.screens.loading.message} onChange={(e) => patch({ screens: { ...def.screens, loading: { message: e.target.value } } })} placeholder={DEFAULT_SCREEN_TEXT.loading.message} />
        </Field>
        <ScreenPreviews def={def} />
      </Section>

      <Section title="User menu" hint="The signed-in user in the app bar: avatar, name and job title opening a card with the company and Sign out on top, then the avatar, name, the id line and the job title. The keys read the profile record; a {{a}} {{b}} template joins fields, a list tries each path in order. Without a profile the account's name / email is shown.">
        <label className="flex items-center gap-2 text-ui">
          <input type="checkbox" checked={def.userMenu.show} onChange={(e) => patch({ userMenu: { ...def.userMenu, show: e.target.checked } })} />
          Show the user menu
        </label>
        {def.userMenu.show && (
          <div className="grid gap-3 md:grid-cols-3">
            <PathListField label="Name" paths={def.userMenu.nameKey} onChange={(nameKey) => patch({ userMenu: { ...def.userMenu, nameKey } })} fields={recordFields} required />
            <PathListField label="Job title" paths={def.userMenu.subtitleKey} onChange={(subtitleKey) => patch({ userMenu: { ...def.userMenu, subtitleKey } })} fields={recordFields} />
            <PathListField label="Avatar URL" paths={def.userMenu.avatarKey} onChange={(avatarKey) => patch({ userMenu: { ...def.userMenu, avatarKey } })} fields={recordFields} />
            <PathListField label="Company (card header)" paths={def.userMenu.companyKey} onChange={(companyKey) => patch({ userMenu: { ...def.userMenu, companyKey } })} fields={recordFields} />
            <PathListField label="Id" paths={def.userMenu.idKey} onChange={(idKey) => patch({ userMenu: { ...def.userMenu, idKey } })} fields={recordFields} />
            <Field label="Id label" hint="Shown as “label: value”; the line is hidden when the id is empty.">
              <Input value={def.userMenu.idLabel} onChange={(e) => patch({ userMenu: { ...def.userMenu, idLabel: e.target.value } })} placeholder={DEFAULT_USER_MENU_KEYS.idLabel} />
            </Field>
          </div>
        )}
      </Section>
    </div>
  )
}

/**
 * The portal's Sign-in library page (see the grilled design `azure-sso-auth`):
 * the shared Azure SSO entries a project picks from on its Env page — the
 * env var names, the profile fetch, the screen texts and the user menu keys.
 */
export function AuthPage() {
  const entries = useWorkspaceStore((s) => s.library.auth ?? NO_AUTH)
  const projects = useWorkspaceStore((s) => s.projects)
  const addAuth = useWorkspaceStore((s) => s.addAuth)
  const deleteAuth = useWorkspaceStore((s) => s.deleteAuth)
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<AuthDef | null>(null)
  const selected = entries.find((a) => a.id === selectedId) ?? entries[0]
  const duplicates = useMemo(() => duplicateAuthNames(entries), [entries])
  const usedBy = (id: string) => projects.filter((p) => p.snapshot.authId === id).map((p) => p.name)

  return (
    <LibraryScopeContext.Provider value="library">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1060px] px-6 pb-16 pt-6">
          <div className="mb-4 flex items-end gap-3.5">
            <div>
              <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-ink">Sign-in</h1>
              <p className="mt-0.5 text-ui text-ink-2">
                Azure SSO entries shared by every project: pick one on a project's Env page and its app signs users in, passes the token, loads the profile and shows the user menu — no app code.
              </p>
            </div>
            <div className="flex-1" />
            <Button variant="primary" onClick={() => setSelectedId(addAuth().id)}>
              <Plus size={14} aria-hidden="true" />
              New entry
            </Button>
          </div>

          {entries.length === 0 ? (
            <div className="mt-4 rounded-[10px] border border-dashed border-line-strong px-6 py-10 text-center text-ui text-ink-2">
              <b className="mb-1 block text-[13.5px] text-ink">No sign-in entries yet.</b>
              Create one for your tenant; its profile endpoint comes from the{' '}
              <button type="button" className="font-semibold text-ink hover:underline" onClick={() => navigate('/library/apis')}>
                APIs
              </button>{' '}
              library.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <ul className="space-y-0.5">
                {entries.map((a) => {
                  const current = a.id === selected?.id
                  const name = a.name.trim() || '(unnamed)'
                  return (
                    <li key={a.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={cn('list-row flex min-w-0 flex-1 items-center gap-2 text-left', current && 'bg-panel-2 text-ink')}
                        aria-current={current ? 'true' : undefined}
                      >
                        <ShieldCheck size={14} aria-hidden="true" className="shrink-0 text-ink-3" />
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        {duplicates.has(a.name.trim()) && <span className="text-warn" title="Duplicate name">⚠</span>}
                        <span className="font-mono text-ui-xs text-ink-3">{usedBy(a.id).length}</span>
                      </button>
                      <IconButton label={`Delete ${name}`} onClick={() => setConfirm(a)} className="shrink-0 text-ink-3 hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </IconButton>
                    </li>
                  )
                })}
              </ul>
              <div className="rounded-[10px] border border-line bg-surface p-4">
                {selected ? <AuthForm key={selected.id} def={normalizeAuthDef(selected)} usedBy={usedBy(selected.id)} /> : null}
              </div>
            </div>
          )}
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`Delete “${confirm.name.trim() || 'this entry'}”?`}
          body={
            usedBy(confirm.id).length
              ? `${usedBy(confirm.id).join(', ')} still sign in with it — they will export auth: MISSING until they pick another entry.`
              : 'No project uses it.'
          }
          confirmLabel="Delete"
          onConfirm={() => {
            deleteAuth(confirm.id)
            setConfirm(null)
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </LibraryScopeContext.Provider>
  )
}
