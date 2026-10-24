# Prompt: Azure SSO auth for Gummy (component + function, studio-configurable)

> Grilled design, 2026-10-23 — **implemented the same day** on `feature/azure-sso-auth` (see the Azure SSO bullet in `CLAUDE.md`). Kept as the record of the decisions. Port of Banpu's `@banpugroup/react-auth` (MSAL 2.x: env-built
> singleton, `getAccessToken`, an `AuthProvider` that shows a landing card when signed out,
> "Loading…" while MSAL is in progress, fetches the user profile by email after sign-in, shows
> "Access Denied" when that call fails, and exposes `{ username, userProfile, login, logout }`)
> onto Gummy's config-driven runtime. Everything below was decided; implement it as written and
> follow `CLAUDE.md` (rtk-prefixed commands, theming rule, `bun:test`, the public surface in
> `packages/ui/src/index.ts`, workspace migrations, grilled-design memory).

## Goal

A Banpu app built with Gummy signs its users in through Azure AD with **zero auth code in the
app**: the studio workspace holds one or more shared **Auth** entries (e.g. "Banpu Azure"), a
project **selects** one, the export writes it as `project.auth`, and `<GummyApp>` applies it —
gate screens, bearer token, profile slice, user menu, sign-out. Hand-wired apps get the same
thing from one standalone `<AzureAuth>` wrapper.

## Decisions (the design tree, resolved)

1. **Runtime placement — `project.auth` applied by `GummyApp`.** `GummyApp` wraps its tree in the
   Azure provider when `project.auth?.provider === "azure"` and derives the token getter from
   it. Escape hatches: an explicit `getToken` / `http` prop wins; `auth={false}` disables the
   gate (token empty); `auth={{ mock }}` is the preview / local-dev mode (below).
2. **Studio placement — a workspace-level library of auth entries, picked per project.** New
   portal page `/library/auth` beside Apis / Models / Templates; each project has an **Auth**
   section on its Env page with a select *None | <entry>*. *None* is valid (an app without
   sign-in). Same model as endpoints: shared definitions, attached per project.
3. **Environment values are env-var references.** The entry stores the **names** of the vars
   (`tenantId`, `clientId`, `redirectUri`, `scope`; defaults `AZURE_TENANT_ID`,
   `AZURE_CLIENT_ID`, `AZURE_REDIRECT_URL`, `AZURE_API_SCOPE`) plus dev default values.
   Runtime reads them from `project.env` merged with `GummyApp`'s `env` prop — exactly how
   `API_URL` works, so one entry serves dev / staging / prod through `.env`. `redirectUri`
   defaults to `window.location.origin` when blank; tenant / client / scope are required.
   Seeded dev values stay **empty** (nothing tenant-specific in the repo).
4. **The auth entry owns the profile fetch.** It references a library **endpoint** + `paths`
   + `emailParam` (the `:param` / query key that receives the signed-in email, like
   `personParam` on `switchprofile`) + `stateKey` (default `me`). The provider runs it through
   `useReadApi`, writes the result with `setLoad` as a state slice (so `$status`, skeletons and
   every `{ type: "state", key: "me" }` binding work unchanged), holds the gate until it
   succeeds, shows **Denied** on failure. **Denied = a failed request** (non-2xx / thrown) in
   v1; a response `CondExpression` (`deniedWhen`) is typed but not authored yet. No profile
   endpoint ⇒ no gate beyond sign-in. Picking the entry **auto-attaches** the endpoint to the
   project's `endpointIds`.
5. **Built-in screens, text-configurable.** `screens: { landing: { title, message, buttonLabel },
   denied: { title, message, buttonLabel }, loading: { message } }` with defaults; the landing
   title falls back to the app-bar title at runtime and both cards show `appBar.logo` / `icon`
   when set. A centred Paper card, accent button, Radix vars (dark-mode aware). Landing button
   = sign in, denied button = sign out (as react-auth). Code escape hatch:
   `GummyApp authScreens={{ landing, denied, loading }}` React components receiving
   `{ signIn, signOut, error, email }`.
6. **Wiring.** (1) Token: `HttpClientFactory` built with the provider's `getAccessToken` (silent
   acquire for the configured scope; `InteractionRequiredAuthError` ⇒ redirect to re-auth).
   (2) New button actions **`SignIn`** / **`SignOut`** in the `ButtonAction` union (studio:
   two entries in the Add-action select); sign-out clears the MSAL account and the profile /
   impersonation slices (`profile`, `profileOriginal`, `profileList`, `me`). (3) **AppShell user
   menu** configured on the entry: `userMenu: { show (default true), nameKey, subtitleKey,
   avatarKey }` — lodash paths (fallback lists allowed, `ApprovalKeyPath` style) into the
   profile slice, defaults for the Banpu shape (`firstNameEn` + `lastNameEN`, `jobTitle`,
   `avatar`), falling back to the account's name / email from the `auth` slice when there is no
   profile endpoint; rendered by `AppShell` beside the consumer `header` slot as avatar + name
   opening a Radix dropdown with Sign out. Items fixed in v1.
7. **Mock mode.** `auth={{ mock: { email, name } }}` on `GummyApp` (and `<AzureAuth mock>`): no
   MSAL, that account is signed in, the configured profile fetch **still runs** against the
   API, so the `me` slice, the user menu, `SignOut` and the denied flow all behave. The studio
   Live Preview passes the studio's current mock user; its dev tools gain an **Auth** tab (the
   account, the `auth` / profile slice status, and three buttons forcing *signed out* /
   *signed in* / *denied* so the screens can be reviewed). The `demo/` starter reads
   `VITE_AUTH_MOCK_EMAIL` → mock mode.
8. **MSAL 2.x stays** (`@azure/msal-browser` ^2.28.1, `@azure/msal-react` ^1.4.5 — the Banpu
   versions) as a regular dependency of `@gummy-ui/ui`. The **instance is created from config at
   mount**, not from env at import: `auth/azure/MsalInstance.ts`'s singleton and `Env.ts` go
   away; the exported `getAccessToken` reads the mounted instance and throws a clear error when
   no auth is mounted. The old unused `azureCtx` / `AzureAuthProvider` / `useAzureAuth` exports
   are replaced by `useAuth()`.
9. **Seeds, demos, mock API** — all four: mock route, library seed, `demo/` + `gummy init`
   template, `apps/example` Auth page (details below).
10. **Studio UI** as specified below; export resolves the picked entry into `project.auth`;
    `GummyProject.auth?` is **optional**, so `schemaVersion` stays 1; workspace `version: 51`.
11. **Code surface**: the `auth` slice, `useAuth()`, `ActionContext.auth`, the standalone
    `<AzureAuth>` (details below).

## Library (`packages/ui`)

### Types (`components/core/project.ts` + `components/@types`)

```ts
export type AuthKeyPath = string | string[];                // lodash path or fallback list
export type AzureAuthConfig = {
  provider: "azure";
  /** Env var NAMES read from project.env (+ GummyApp env overrides). */
  env: { tenantId: string; clientId: string; redirectUri: string; scope: string };
  loginMode?: "redirect" | "popup";                          // default redirect
  cacheLocation?: "localStorage" | "sessionStorage";         // default localStorage
  /** Optional profile fetch; absent ⇒ signed-in is enough. */
  profile?: {
    api: API;                                                // engine API ref (name + params/query/body DataValues + paths)
    emailParam: string;                                      // the :param / query key that receives the email
    stateKey?: string;                                       // default "me"
    deniedWhen?: CondExpression;                             // typed, not authored in v1
  };
  screens?: {
    landing?: { title?: string; message?: string; buttonLabel?: string };
    denied?:  { title?: string; message?: string; buttonLabel?: string };
    loading?: { message?: string };
  };
  userMenu?: { show?: boolean; nameKey?: AuthKeyPath; subtitleKey?: AuthKeyPath; avatarKey?: AuthKeyPath };
};
export type GummyProjectAuth = AzureAuthConfig;              // union later
// GummyProject gains `auth?: GummyProjectAuth`; assertGummyProject checks provider === "azure",
// the four env names are strings, and profile.api.name is in `api`.
```

### Engine pieces

- `auth/azure/AzureAuth.tsx` — **standalone** `<AzureAuth config env mock screens children>`:
  builds the `PublicClientApplication` from the resolved env (memoised per values), mounts
  `MsalProvider`, handles the redirect, publishes the **`auth` state slice**
  `{ status: "signedOut" | "signingIn" | "signedIn" | "denied", email, name, accountId, error? }`
  (`stateKey` fixed `auth`, cleared on sign-out), runs the profile fetch (`useReadApi` with the
  email injected into `emailParam`, result written with `setLoad(stateKey)`, held until it lands
  ⇒ loading screen, failure ⇒ denied screen), and renders landing / loading / denied / children.
  `mock` skips MSAL entirely. Context + **`useAuth()`**:
  `{ status, account: { email, name, id } | null, profile, error, signIn(), signOut(), getToken(), mock }`,
  throws a clear error outside a provider.
- `auth/azure/screens.tsx` — `AuthLandingScreen` / `AuthDeniedScreen` / `AuthLoadingScreen`
  (Paper card, Typography, accent Button, logo slot; Radix vars only; `styles/auth.css` partial
  `@import`ed by `styles.css` and the studio `index.css`).
- `auth/azure/token.ts` — `getAccessToken()` over the mounted instance (silent acquire for the
  scope, interaction-required ⇒ redirect / popup per `loginMode`; mock ⇒ `""`).
- `GummyApp`: `auth?: false | { mock: { email: string; name?: string } }` and
  `authScreens?` props; when `project.auth` is set and `auth !== false`, wraps
  `DataProvider`'s children in `<AzureAuth config={project.auth} env={mergedEnv} mock screens>`
  and builds the `HttpClientFactory` with the provider's `getAccessToken` unless `getToken` /
  `http` is given. Unregistered-env warning once at mount when a required var is blank (not in
  mock mode).
- `AppShell`: `userMenu?: { show, nameKey, subtitleKey, avatarKey }` prop (set by `GummyApp` from
  `project.auth.userMenu`): avatar + name beside `header`, Radix `DropdownMenu` with the name
  block (name / subtitle / email) and **Sign out**; reads the profile slice through
  `useDataValue`, falls back to the `auth` slice. Hidden when no auth is mounted.
- `Button.tsx`: `SignIn` / `SignOut` actions (`useAuth()`; warn-and-skip without a provider).
  `ActionContext.auth = { email, name, status, signOut, getToken }`.
- Sign-out clears `auth`, the profile slice and the Replace / Switch Profile session
  (`profileSession.ts` helper) before `instance.logout()`.
- `IconData` gains `shieldCheck`, `logIn`, `logOut`.
- Exports: `AzureAuth`, `useAuth`, `getAccessToken`, the three screens, `AzureAuthConfig`.
- Tests (`bun:test`): env resolution (names → values, redirect default), the `auth` slice
  transitions, profile-request building (`emailParam` into params vs query), `GummyProject`
  assertions for `auth`.

### Mock API (`apps/api/src/routes/userProfile.ts`)

`GET /collection/profiles/email?email=` — the Banpu envelope for a known email (the `USERS`
people), **404** for an unknown one, **403** for a person whose only profile is terminated
(`nadia`), so the denied path is testable.

### `apps/example`

Wrap the hand-wired `AppShell` in `<AzureAuth config env mock={{ email: "chanwit_y@banpu.co.th" }}>`
(config in `config/country/auth.ts`, mirroring the seeded entry) and add the **Auth** page
(`/auth`, `config/country/authDemo.ts`, menu icon `shieldCheck`): typographies bound to the
`auth` and `me` slices, a `$status` line, `SignIn` / `SignOut` buttons, a custom action that
calls `ctx.auth.getToken()` and snackbars its length.

### `demo/` starter + `apps/cli/template`

`gummy-demo.json` gains `auth`; `App.tsx` passes
`auth={import.meta.env.VITE_AUTH_MOCK_EMAIL ? { mock: { email: import.meta.env.VITE_AUTH_MOCK_EMAIL } } : undefined}`
and the four `VITE_AZURE_*` vars through `env`; `.env.example` lists them; `README` / HANDOFF
explain the vars and removing the mock. Keep `template/src` in step with `demo/src`.

## Studio (`apps/studio`)

- **Types** (`Workspace/types.ts`): `AuthDef { id: "auth-…", name, provider: 'azure',
  env: { tenantId, clientId, redirectUri, scope } (var names), devValues: Record<name, string>,
  loginMode, cacheLocation, profile: { enabled, read: FormListCrudRef, paths, emailParam,
  stateKey }, screens, userMenu: { show, nameKey: string[], subtitleKey: string[], avatarKey: string[] } }`
  in `workspace.library.auth: AuthDef[]`; `ProjectSnapshot.authId: string | null`.
- **Library page** `/library/auth` (`Library/AuthPage.tsx`, portal nav entry): list + form —
  name; Provider select (Azure); **Environment** (four var names + dev values); **Sign-in**
  (`loginMode` segmented control, cache select); **Profile** (`EndpointPicker`, `emailParam`
  among the endpoint's `:params` / query model keys, `paths`, `stateKey`); **Screens** (texts +
  a static preview of the three cards through the real screen components, inert); **User menu**
  (show + three `PathListField`s over the profile endpoint's row model via `rowFields.ts`).
  Activity log entries for create / rename / delete.
- **Project Env page**: an **Auth** section above Custom actions — the select *None | entries*;
  picking seeds the four env rows **locked** with the entry's dev values (existing rows keep
  their values), *None* unlocks them, never deletes. A hint when the picked entry was deleted
  (`MISSING_AUTH`).
- **Export** (`Workspace/runtimeProject.ts`): `authId` → `project.auth` (endpoint id → name,
  `read` / `paths` → the engine `API`, `emailParam` pruned from exported `params` like
  `personParam`, key lists → string | string[], defaults left implicit); the profile endpoint is
  **auto-attached** to `endpointIds` on pick (store action) and at export as a safety net. The
  Live Preview wiring check warns when it is unbuildable; HANDOFF gains an "Azure SSO" section.
- **Live Preview**: `auth={{ mock: { email, name } }}` from the studio user — `MOCK_USERS`
  gains an `email` per user (`chanwit_y@banpu.co.th`, …, matching the mock API people); the
  dev tools **Auth** tab (account, slices, the three force buttons wired through a preview-only
  `authDebug` context the provider exposes when mounted with `mock`).
- **Buttons**: `SignIn` / `SignOut` in the Add-action select (builtin keys), chips as usual.
- **Workspace `version: 51`**, `migrateV50`: `library.auth: []`, `authId: null` on every
  project, the seeded **"Banpu Azure"** entry (var names, empty dev values, profile over the
  seeded `profileByEmail` endpoint + `profileByEmailQuery` / existing `meRes` models via
  `seedLibraryAdditions`, `emailParam: "email"`, `stateKey: "me"`, default texts, user menu with
  the Banpu keys), the seeded demo project picking it with its env rows seeded, and its seeded
  **Profile** page's own `me` page load removed (the auth slice fills `me`) — all guarded on
  the seed ids.

## Verification

- `rtk bun run --filter @gummy-ui/ui typecheck`, `rtk bun test packages/ui/src`, studio `tsc -b`
  from `apps/studio` (see memory `studio-verify-workflow`), `rtk bun run build`.
- `rtk bun run dev`: the example's **Auth** page shows the mock account, the `me` slice, Sign
  out → landing card → Sign in (mock: instant). Point `VITE_AUTH_MOCK_EMAIL` at an unknown email
  → denied card.
- Studio: `/library/auth` seeded entry renders with the screen previews; the demo project's Env
  page shows the locked `AZURE_*` rows; Live Preview opens signed in as the studio user with the
  user menu top-right; the dev-tools Auth tab forces the three screens; Export shows
  `project.auth` in the JSON and the HANDOFF section.
- `demo/`: `bun run demo` with `VITE_AUTH_MOCK_EMAIL` set renders; unset with blank `AZURE_*`
  vars logs the one-time warning and shows the landing card (MSAL would redirect on click).
- Save a `grilled design` memory (`azure-sso-auth`) and add the feature bullet to `CLAUDE.md`.

## Out of scope (v1)

MSAL 3/4 upgrade; optional peer dependency / dynamic import of MSAL; `deniedWhen` authoring;
custom user-menu items; canvas-designed auth screens; providers other than Azure; the photo
endpoint for avatars.
