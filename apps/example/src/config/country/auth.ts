import type { AzureAuthConfig } from "@gummy-ui/ui";

/**
 * Azure SSO for the example app (see the grilled design `azure-sso-auth`):
 * what a studio project carries as `project.auth`. The var **names** are
 * the defaults (`AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_REDIRECT_URL`
 * / `AZURE_API_SCOPE`, read off the `env` handed to `<AzureAuth>`); the
 * profile fetch calls `profileByEmail` with the signed-in email in its
 * `email` query key and lands in the `me` slice every page binds to.
 * App.tsx mounts it in **mock** mode (no tenant here): the mock account is
 * signed in and the profile fetch still runs against the mock API.
 */
export const auth: AzureAuthConfig = {
  provider: "azure",
  profile: {
    api: { name: "profileByEmail", paths: ["data"] },
    emailParam: "email",
    stateKey: "me",
  },
  screens: {
    landing: { message: "Sign in with your work account to open the example." },
  },
  userMenu: { show: true },
};

/** The mock API's admin (apps/api/src/routes/userProfile.ts `ME_EMAIL`). */
export const MOCK_EMAIL = "chanwit_y@gummay.co.th";
