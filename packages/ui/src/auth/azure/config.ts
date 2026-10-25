import { get } from "lodash";
import type { API, CondExpression, PageLoad } from "../../components/@types";
import { urlParamNames } from "../../components/core/urlParams";

/**
 * Azure SSO (see the grilled design `azure-sso-auth`): the auth block a
 * project document carries (`project.auth`) and the pure helpers around it.
 * The provider itself is `AzureAuth.tsx`.
 */

/** The global-state slice the provider publishes the signed-in account to. */
export const AUTH_STATE_KEY = "auth";
/** Where the profile fetch lands unless `profile.stateKey` says otherwise. */
export const DEFAULT_AUTH_PROFILE_STATE_KEY = "me";

/** A lodash path, a `{{path}} {{path}}` template, or a list of paths tried in order. */
export type AuthKeyPath = string | string[];

/** The **names** of the env vars holding the Azure settings (values come from `project.env` + `GummyApp env`). */
export type AzureAuthEnvNames = {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
};

export const DEFAULT_AUTH_ENV_NAMES: AzureAuthEnvNames = {
  tenantId: "AZURE_TENANT_ID",
  clientId: "AZURE_CLIENT_ID",
  redirectUri: "AZURE_REDIRECT_URL",
  scope: "AZURE_API_SCOPE",
};

/**
 * The profile fetched once the user is signed in: an engine {@link API} ref
 * whose `emailParam` (a URL `:param` or a query key) receives the account's
 * email; the drilled response lands in the `stateKey` slice. The app is held
 * on the loading screen until it succeeds and shows the denied screen when
 * the request fails.
 */
export type AzureAuthProfile = {
  api: API;
  emailParam: string;
  stateKey?: string;
  /** Reserved: a condition over the response that also means "denied" (not evaluated yet). */
  deniedWhen?: CondExpression;
};

export type AuthScreenText = { title?: string; message?: string; buttonLabel?: string };

export type AzureAuthScreensText = {
  landing?: AuthScreenText;
  denied?: AuthScreenText;
  loading?: { message?: string };
};

/**
 * The app-bar user menu: paths into the profile slice (fallback: the
 * account). The trigger shows avatar · name / subtitle; the card shows the
 * company and Sign out on top, then the avatar, name, `idLabel: id` and the
 * subtitle (the corporate profile menu).
 */
export type AuthUserMenuConfig = {
  /** Default true. */
  show?: boolean;
  nameKey?: AuthKeyPath;
  /** The job title line. */
  subtitleKey?: AuthKeyPath;
  avatarKey?: AuthKeyPath;
  /** The card's header (the company). */
  companyKey?: AuthKeyPath;
  /** The identifier line (`idLabel: value`); hidden when it resolves empty. */
  idKey?: AuthKeyPath;
  /** Default "Employee ID". */
  idLabel?: string;
};

export const DEFAULT_USER_MENU_KEYS: Required<Omit<AuthUserMenuConfig, "show">> = {
  nameKey: "{{firstNameEn}} {{lastNameEN}}",
  subtitleKey: "jobTitle",
  avatarKey: "avatar",
  companyKey: "companyModel.name",
  idKey: ["employeeId", "personId", "userId"],
  idLabel: "Employee ID",
};

export type AzureAuthConfig = {
  provider: "azure";
  /** Env var names; every key defaults (see {@link DEFAULT_AUTH_ENV_NAMES}). */
  env?: Partial<AzureAuthEnvNames>;
  /** `redirect` (default) or `popup`. */
  loginMode?: "redirect" | "popup";
  /** MSAL token cache (default `localStorage`). */
  cacheLocation?: "localStorage" | "sessionStorage";
  profile?: AzureAuthProfile;
  screens?: AzureAuthScreensText;
  userMenu?: AuthUserMenuConfig;
};

export const DEFAULT_SCREEN_TEXT = {
  landing: { title: undefined, message: "You're not signed in. Sign in with your organisation account to continue.", buttonLabel: "Sign in" },
  denied: { title: "Access denied", message: "Sorry, you don't have permission to use this application.", buttonLabel: "Sign out" },
  loading: { message: "Signing you in…" },
} as const;

export type ResolvedAzureEnv = {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  /** Required settings whose var is blank, by var **name** (so the warning says what to set). */
  missing: string[];
};

/**
 * The Azure settings read out of `env` by the configured var names. The
 * redirect URI falls back to the page origin (what an SPA registration
 * usually is); tenant, client and scope are required. Pure.
 */
export function resolveAzureEnv(config: AzureAuthConfig, env: Record<string, string | undefined> = {}, origin?: string): ResolvedAzureEnv {
  const names = { ...DEFAULT_AUTH_ENV_NAMES, ...config.env };
  const read = (name: string) => (env[name] ?? "").trim();
  const tenantId = read(names.tenantId);
  const clientId = read(names.clientId);
  const scope = read(names.scope);
  const redirectUri = read(names.redirectUri) || origin || (typeof window !== "undefined" ? window.location.origin : "");
  const missing: string[] = [];
  if (!tenantId) missing.push(names.tenantId);
  if (!clientId) missing.push(names.clientId);
  if (!scope) missing.push(names.scope);
  return { tenantId, clientId, redirectUri, scope, missing };
}

/**
 * The profile fetch as a {@link PageLoad} chained on the `auth` slice: the
 * email goes into `emailParam` — a `:param` of the endpoint URL when it is
 * one, else a query key — as a `state` DataValue, so the load is **held**
 * while nobody is signed in and refetches when the account changes. Pure.
 */
export function profileLoad(config: AzureAuthConfig, endpointUrl: string | undefined): PageLoad | undefined {
  const p = config.profile;
  if (!p) return undefined;
  const email = { type: "state", key: AUTH_STATE_KEY, path: "email" } as const;
  const inUrl = urlParamNames(endpointUrl).includes(p.emailParam);
  const api: API = {
    ...p.api,
    params: { ...p.api.params, ...(inUrl ? { [p.emailParam]: email } : {}) },
    query: { ...p.api.query, ...(inUrl ? {} : { [p.emailParam]: email }) },
  };
  return { key: p.stateKey ?? DEFAULT_AUTH_PROFILE_STATE_KEY, loading: "none", api };
}

/** The slice key the profile lands in (`me` unless configured). */
export function profileStateKey(config: AzureAuthConfig): string {
  return config.profile?.stateKey ?? DEFAULT_AUTH_PROFILE_STATE_KEY;
}

const PLACEHOLDER = /\{\{\s*([^}\s]+)\s*\}\}/g;

/**
 * Read an {@link AuthKeyPath} off an object: a list tries each path in
 * order and takes the first non-empty value; a string with `{{path}}`
 * placeholders is filled (plain text, no escaping — it is rendered as text);
 * any other string is a lodash path. `""` when nothing resolves.
 */
export function readKeyPath(source: unknown, key: AuthKeyPath | undefined): string {
  if (!key || source === undefined || source === null) return "";
  if (Array.isArray(key)) {
    for (const k of key) {
      const v = readKeyPath(source, k);
      if (v) return v;
    }
    return "";
  }
  if (key.includes("{{")) {
    const filled = key.replace(PLACEHOLDER, (_m, path: string) => toText(get(source, path)));
    return filled.replace(/\s+/g, " ").trim();
  }
  return toText(get(source, key));
}

function toText(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/** "Chanwit Yimneam" → "CY"; an email → its first letter. */
export function authInitials(name: string | undefined): string {
  const text = (name ?? "").trim();
  if (!text) return "?";
  const parts = text.split(/[\s._@-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
  return (first + second).toUpperCase() || "?";
}
