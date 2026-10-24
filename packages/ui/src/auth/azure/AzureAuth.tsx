import { InteractionRequiredAuthError, InteractionStatus, PublicClientApplication, type AccountInfo, type Configuration } from "@azure/msal-browser";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import type { HttpClientFactory } from "../../api";
import type { TModelMaster } from "../../model/master";
import type { AppBarConfig } from "../../components/@types";
import { GlobalLoads } from "../../components/core/GlobalLoads";
import { clearProfileSession } from "../../components/core/profileSession";
import { getStateStore } from "../../components/core/stateStore";
import { AUTH_STATE_KEY, profileLoad, profileStateKey, resolveAzureEnv, type AzureAuthConfig } from "./config";
import { AuthContext, type AuthAccount, type AuthContextValue, type AuthForcedState, type AuthStatus } from "./context";
import { AuthDeniedScreen, AuthLandingScreen, AuthLoadingScreen, screenText, type AuthScreens } from "./screens";
import { mountAuth } from "./session";
import { isIEorEdge } from "./VersionBrowser";

export const LOGIN_MICROSOFTONLINE_URL = "https://login.microsoftonline.com/";

/** The account a mock-mode provider signs in (the studio Live Preview, local dev). */
export type AuthMock = { email: string; name?: string };

export type AzureAuthProps = {
  config: AzureAuthConfig;
  /** The env the configured var names are read from (`project.env` + overrides). */
  env?: Record<string, string | undefined>;
  /** No MSAL: this account is signed in; the profile fetch still runs. */
  mock?: AuthMock | false;
  /** Replacement screen components. */
  screens?: AuthScreens;
  /**
   * What the profile fetch needs (`config.profile`): the same trio
   * `GlobalLoads` takes. Without them a configured profile is skipped with a
   * warning and signed-in is enough.
   */
  http?: HttpClientFactory;
  model?: TModelMaster;
  api?: Record<string, any>;
  /** The app bar, for the screens' branding. */
  appBar?: AppBarConfig;
  children: ReactNode;
};

/**
 * Azure SSO as a component (see the grilled design `azure-sso-auth`): shows
 * the landing screen until the user signs in, the loading screen while MSAL
 * (and the profile fetch) is busy, the denied screen when the profile fetch
 * fails, and the children once everything is in. Publishes the account as the
 * `auth` global-state slice, the profile as `config.profile.stateKey`, and
 * registers itself for `getAccessToken()` / the `SignIn` / `SignOut` actions.
 * `GummyApp` mounts it from `project.auth`; a hand-wired app wraps its shell.
 */
export function AzureAuth(props: AzureAuthProps): ReactElement {
  // A mock ⇄ real switch remounts the whole provider (hook order per branch is fixed).
  return props.mock ? <MockAuth key="mock" {...props} mock={props.mock} /> : <MsalAuth key="msal" {...props} />;
}

// ---- the MSAL-backed provider ----

function MsalAuth(props: AzureAuthProps) {
  const { config, env } = props;
  const resolved = useMemo(() => resolveAzureEnv(config, env), [config, env]);
  const sig = `${resolved.tenantId}|${resolved.clientId}|${resolved.redirectUri}|${config.cacheLocation ?? ""}`;
  const instance = useMemo(() => {
    const msalConfig: Configuration = {
      auth: {
        authority: `${LOGIN_MICROSOFTONLINE_URL}${resolved.tenantId || "common"}`,
        clientId: resolved.clientId,
        redirectUri: resolved.redirectUri,
      },
      cache: { cacheLocation: config.cacheLocation ?? "localStorage", storeAuthStateInCookie: isIEorEdge() > 0 },
    };
    return new PublicClientApplication(msalConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    if (resolved.missing.length > 0)
      console.warn(`[gummy-ui] AzureAuth: env var(s) ${resolved.missing.map((m) => `"${m}"`).join(", ")} are blank — sign-in cannot work until they are set (or pass \`mock\` for local development).`);
  }, [resolved.missing]);

  return (
    <MsalProvider instance={instance}>
      <MsalSession {...props} scope={resolved.scope} />
    </MsalProvider>
  );
}

function MsalSession(props: AzureAuthProps & { scope: string }) {
  const { config, scope, mock: _mock, ...rest } = props;
  void _mock;
  const { instance, accounts, inProgress } = useMsal();
  const account = accounts[0] as AccountInfo | undefined;
  const popup = config.loginMode === "popup";
  const scopes = useMemo(() => (scope ? [scope] : []), [scope]);

  const status: AuthStatus = inProgress !== InteractionStatus.None ? "signingIn" : account ? "signedIn" : "signedOut";
  const authAccount = useMemo<AuthAccount | null>(
    () => (account ? { email: account.username, name: account.name, id: account.homeAccountId } : null),
    [account],
  );

  const signIn = useCallback(async () => {
    if (popup) await instance.loginPopup({ scopes });
    else await instance.loginRedirect({ scopes });
  }, [instance, popup, scopes]);

  const signOut = useCallback(async () => {
    clearAuthSlices(config);
    const request = account ? { account } : undefined;
    if (popup) await instance.logoutPopup(request);
    else await instance.logoutRedirect(request);
  }, [instance, popup, account, config]);

  const getToken = useCallback(async () => {
    const current = instance.getAllAccounts()[0];
    if (!current) return "";
    try {
      const result = await instance.acquireTokenSilent({ account: current, scopes });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        if (popup) return (await instance.acquireTokenPopup({ account: current, scopes })).accessToken;
        await instance.acquireTokenRedirect({ account: current, scopes });
        return "";
      }
      throw err;
    }
  }, [instance, popup, scopes]);

  return <AuthSession {...rest} config={config} status={status} account={authAccount} signIn={signIn} signOut={signOut} getToken={getToken} mock={false} />;
}

// ---- the mock provider ----

function MockAuth(props: AzureAuthProps & { mock: AuthMock }) {
  const { mock, config, ...rest } = props;
  const [signedIn, setSignedIn] = useState(true);
  const [forced, setForced] = useState<AuthForcedState | null>(null);
  const account = useMemo<AuthAccount>(() => ({ email: mock.email, name: mock.name, id: `mock:${mock.email}` }), [mock.email, mock.name]);

  const signIn = useCallback(async () => {
    setForced(null);
    setSignedIn(true);
  }, []);
  const signOut = useCallback(async () => {
    clearAuthSlices(config);
    setForced(null);
    setSignedIn(false);
  }, [config]);
  const getToken = useCallback(async () => "", []);
  const debug = useMemo(() => ({ forced, force: setForced }), [forced]);

  const status: AuthStatus = forced === "signedOut" ? "signedOut" : forced ? "signedIn" : signedIn ? "signedIn" : "signedOut";
  return (
    <AuthSession
      {...rest}
      config={config}
      status={status}
      account={status === "signedIn" ? account : null}
      signIn={signIn}
      signOut={signOut}
      getToken={getToken}
      mock
      debug={debug}
    />
  );
}

// ---- shared: slices, registration, the gate ----

/** The account and profile slices, and the Replace / Switch Profile session, before a sign-out. */
function clearAuthSlices(config: AzureAuthConfig) {
  getStateStore(AUTH_STATE_KEY).getState().setLoad({ data: { status: "signedOut" }, status: "success" });
  getStateStore(profileStateKey(config)).getState().clear();
  clearProfileSession();
}

type SessionProps = Omit<AzureAuthProps, "mock"> & {
  status: AuthStatus;
  account: AuthAccount | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
  mock: boolean;
  debug?: AuthContextValue["debug"];
};

function AuthSession({ config, screens, http, model, api, appBar, children, status, account, signIn, signOut, getToken, mock, debug }: SessionProps) {
  // Registered during render, through a proxy that always calls the latest
  // functions: a child's effect (the profile fetch) may ask for the token
  // before this component's own effects run.
  const latest = useRef({ getToken, signIn, signOut, debug });
  latest.current = { getToken, signIn, signOut, debug };
  const [release] = useState(() =>
    mountAuth({
      mock,
      getToken: () => latest.current.getToken(),
      signIn: () => latest.current.signIn(),
      signOut: () => latest.current.signOut(),
      ...(mock ? { force: (state: AuthForcedState | null) => latest.current.debug?.force(state) } : {}),
    }),
  );
  useEffect(() => release, [release]);

  // The `auth` slice: what conditions / bindings / chained loads read.
  useEffect(() => {
    getStateStore(AUTH_STATE_KEY).getState().setLoad({
      data: { status, email: account?.email, name: account?.name, accountId: account?.id },
      status: "success",
    });
  }, [status, account]);

  const endpointUrl = (api?.[config.profile?.api.name ?? ""] as { url?: string } | undefined)?.url;
  const load = useMemo(() => profileLoad(config, endpointUrl), [config, endpointUrl]);
  const canFetch = !!(load && http && model && api);
  useEffect(() => {
    if (load && !canFetch) console.warn(`[gummy-ui] AzureAuth: profile "${load.api.name}" needs \`http\`, \`model\` and \`api\` — skipped, signed-in is enough.`);
    if (load && api && !api[load.api.name]) console.warn(`[gummy-ui] AzureAuth: profile endpoint "${load.api.name}" is not in \`api\`.`);
  }, [load, canFetch, api]);

  const profileStore = useMemo(() => getStateStore(profileStateKey(config)), [config]);
  const profileStatus = profileStore((s) => s.status);
  const profile = profileStore((s) => s.data);
  const profileError = profileStore((s) => s.error);

  // The gate waits for the profile once per account: after it has landed,
  // a page load that writes (and clears on unmount) the same slice must not
  // throw the app back onto the loading screen.
  const [settledFor, setSettledFor] = useState<string | null>(null);
  useEffect(() => {
    if (status === "signedIn" && account && profileStatus === "success") setSettledFor(account.id);
    if (status !== "signedIn") setSettledFor(null);
  }, [status, account, profileStatus]);
  const waiting = canFetch && status === "signedIn" && settledFor !== account?.id;
  const gated = waiting;
  const forced = debug?.forced ?? null;
  const screen: "landing" | "loading" | "denied" | null =
    forced === "denied"
      ? "denied"
      : forced === "signedIn"
        ? null
        : status === "signedOut"
          ? "landing"
          : status === "signingIn"
            ? "loading"
            : gated && profileStatus === "error"
              ? "denied"
              : gated && profileStatus !== "success"
                ? "loading"
                : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      status: screen === "denied" ? "denied" : status,
      account,
      profile,
      error: screen === "denied" ? profileError : undefined,
      signIn,
      signOut,
      getToken,
      mock,
      config,
      debug,
    }),
    [screen, status, account, profile, profileError, signIn, signOut, getToken, mock, config, debug],
  );

  const screenProps = { signIn, signOut, email: account?.email, appBar, error: profileError };
  let body: ReactNode;
  if (screen === "landing") body = createElement(screens?.landing ?? AuthLandingScreen, { ...screenProps, text: screenText("landing", config.screens?.landing) });
  else if (screen === "loading") body = createElement(screens?.loading ?? AuthLoadingScreen, { ...screenProps, text: screenText("loading", config.screens?.loading) });
  else if (screen === "denied") body = createElement(screens?.denied ?? AuthDeniedScreen, { ...screenProps, text: screenText("denied", config.screens?.denied) });
  else body = children;

  return (
    <AuthContext.Provider value={value}>
      {/* Always mounted while configured: held (nothing fetched) until the `auth` slice has an email. */}
      {canFetch && <GlobalLoads http={http!} model={model!} api={api!} loads={[load!]} />}
      {body}
    </AuthContext.Provider>
  );
}
