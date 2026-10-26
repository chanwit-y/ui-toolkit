# Sign-in (Azure SSO)

Sign-in is a **shared library entry** (`upsert_auth`) a project picks
(`set_project_auth`).

- The entry names the env vars holding the Azure settings (`env`: tenantId,
  clientId, redirectUri, scope — defaults `AZURE_TENANT_ID`, …) and their
  dev values (`devValues`); picking it adds those vars to the project's env,
  locked.
- `profile`: `{ enabled, read: { endpointId, params, extra }, paths,
  emailParam, stateKey }` — after sign-in the app fetches the signed-in
  person's record (the email goes into `emailParam`, a URL `:param` or a
  query key) into the `stateKey` slice (`me`). A failed fetch shows the
  denied screen. Bind to it like a load: `{ source: "state", key: "me",
  path: "role" }`, or hide manager-only items with
  `dataWhen: { loadId: "me", test: "compare", path: "role", op: "eq", value: "manager" }`.
- `screens` (landing / denied / loading texts), `userMenu` (name, job title,
  avatar, company, id paths), `loginMode`, `cacheLocation`.
- Buttons: `SignIn` / `SignOut` actions.
