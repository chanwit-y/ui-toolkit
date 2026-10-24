import { GummyApp, ThemeToggle } from "@gummy-ui/ui";
import { loadPage, project } from "./project";
import { actions } from "./actions";
import { components } from "./components";

/**
 * Sign-in comes from the project document (`auth`, an Azure SSO entry picked
 * in the studio): <GummyApp> shows the sign-in screen, passes the token and
 * loads the profile by itself — nothing to wire here. Until a tenant exists,
 * `VITE_AUTH_MOCK_EMAIL` signs that account in without Microsoft (the profile
 * fetch still runs); the `VITE_AZURE_*` vars make it real. Remove the mock
 * before shipping. A project without `auth` needs no token at all; pass
 * `getToken` to <GummyApp> only to override the SSO token.
 */
const authMock = import.meta.env.VITE_AUTH_MOCK_EMAIL ? { mock: { email: import.meta.env.VITE_AUTH_MOCK_EMAIL as string } } : undefined;
const env = {
  API_URL: import.meta.env.VITE_API_URL ?? "",
  AZURE_TENANT_ID: import.meta.env.VITE_AZURE_TENANT_ID ?? "",
  AZURE_CLIENT_ID: import.meta.env.VITE_AZURE_CLIENT_ID ?? "",
  AZURE_REDIRECT_URL: import.meta.env.VITE_AZURE_REDIRECT_URL ?? "",
  AZURE_API_SCOPE: import.meta.env.VITE_AZURE_API_SCOPE ?? "",
};

/**
 * The whole app is the studio's project document rendered by the engine.
 * `gummy/projects/<key>/` is what `gummy studio` (or Export to project)
 * writes — the routes in `project.json`, each page in `pages/`, loaded on its
 * first visit through `loadPage`; `./project` picks which one to render. The only code this app owns
 * is what the JSON cannot carry — the custom actions, the custom components
 * and the per-environment settings.
 */
export function App() {
  return (
    <GummyApp
      project={project}
      loadPage={loadPage}
      // Per-environment settings override the project's `env` (API_URL is the HTTP base URL, AZURE_* the sign-in).
      env={env}
      auth={authMock}
      actions={actions}
      components={components}
      header={<ThemeToggle />}
      footer={<span className="text-xs">gummy-demo</span>}
    />
  );
}
