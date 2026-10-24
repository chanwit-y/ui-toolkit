import { createContext, useContext } from "react";
import type { AzureAuthConfig } from "./config";

export type AuthStatus = "signedOut" | "signingIn" | "signedIn" | "denied";

export type AuthAccount = { email: string; name?: string; id: string };

/** What the studio's dev tools force in mock mode. */
export type AuthForcedState = "signedOut" | "signedIn" | "denied";

export type AuthContextValue = {
  status: AuthStatus;
  account: AuthAccount | null;
  /** The profile slice's data (`config.profile`), once loaded. */
  profile: unknown;
  /** The profile fetch's failure while `status` is `denied`. */
  error: unknown;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
  /** `true` under `mock` (no MSAL, the given account is signed in). */
  mock: boolean;
  config: AzureAuthConfig;
  /** Mock mode only: force one of the screens (the studio's Auth dev-tools tab). */
  debug?: { forced: AuthForcedState | null; force: (state: AuthForcedState | null) => void };
};

export const AuthContext = createContext<AuthContextValue | null>(null);

/** The mounted `AzureAuth`; throws outside one. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("[gummy-ui] useAuth() needs an <AzureAuth> (or <GummyApp> with project.auth) above the component.");
  return value;
}

/** The mounted `AzureAuth`, or `null` outside one (buttons, the user menu). */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}
