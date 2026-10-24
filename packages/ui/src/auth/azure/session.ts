import type { AuthForcedState } from "./context";

/**
 * The auth mounted in this page (one at a time): what `getAccessToken()` —
 * the token getter a `HttpClientFactory` is built with before the provider
 * renders — and the `SignIn` / `SignOut` button actions reach. Registered by
 * `AzureAuth` during its render (before any child effect can fire a request)
 * and released on unmount.
 */
export type MountedAuth = {
  getToken: () => Promise<string>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  mock: boolean;
  /** Mock mode only: force a screen (`null` = back to the real state) — the studio's dev tools. */
  force?: (state: AuthForcedState | null) => void;
};

let mounted: MountedAuth | null = null;

export function mountAuth(auth: MountedAuth): () => void {
  mounted = auth;
  return () => {
    if (mounted === auth) mounted = null;
  };
}

/** The mounted auth, or `null` outside an `AzureAuth`. */
export function mountedAuth(): MountedAuth | null {
  return mounted;
}

/**
 * The signed-in user's bearer token for the configured API scope (silent
 * acquire; interaction when MSAL needs it), `""` in mock mode. Throws when
 * no `AzureAuth` (or `GummyApp` with `project.auth`) is mounted — pass it
 * as the `HttpClientFactory` token getter only under one.
 */
export async function getAccessToken(): Promise<string> {
  if (!mounted)
    throw new Error("[gummy-ui] getAccessToken: no <AzureAuth> is mounted — render it (or <GummyApp> with project.auth) above the components that call the API.");
  return mounted.getToken();
}
