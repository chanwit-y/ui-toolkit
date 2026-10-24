import type { Bin, Container } from "@gummy-ui/ui";

/**
 * Azure SSO demo page (`/auth`): what the app's `<AzureAuth>` (App.tsx,
 * config/country/auth.ts) publishes and what a config can do with it. The
 * `auth` slice carries the account (`status` / `email` / `name`), the `me`
 * slice the fetched profile; both bind like any page data. `SignOut` /
 * `SignIn` are button actions; `fn:tokenLength` reads `ctx.auth.getToken()`.
 *
 * Try: Sign out (the landing card replaces the app; Sign in brings it back —
 * instantly in mock mode), then start the app with
 * `VITE_AUTH_MOCK_EMAIL=nobody@banpu.co.th` for the denied card (404), or
 * `nadia_s@banpu.co.th` (only a terminated profile ⇒ 403).
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;
const third = { sm: "12", md: "4", lg: "4", xl: "4" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const bound = (label: string, key: string, path: string, span = third): Bin => ({
  ...span,
  type: "typography",
  element: { text: `${label}: —`, variant: "body2", value: { type: "state", key, path } },
});

const quarter = { sm: "6", md: "3", lg: "3", xl: "3" } as const;

const button = (label: string, element: Record<string, unknown>, span: Record<string, string> = quarter): Bin => ({
  ...(span as typeof quarter),
  type: "button",
  justifySelf: "start",
  alignSelf: "end",
  element: { label, actions: [], ...element } as Bin["element"],
});

export const containerAuthDemo: Container[] = [
  {
    id: "1",
    name: "AuthDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Azure SSO", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The app is wrapped in <AzureAuth> (App.tsx) with the config in config/country/auth.ts — the same block a studio project carries as `project.auth`. In mock mode the configured account is signed in without Microsoft and the profile fetch still runs against the mock API.",
        },
      },

      ...section("The `auth` slice", "Published by the provider: the account and its status. Bindable anywhere (`{ type: \"state\", key: \"auth\", path }`), readable by conditions."),
      bound("Status", "auth", "status"),
      bound("Email", "auth", "email"),
      bound("Name", "auth", "name"),

      ...section("The profile (`me`)", "The configured profile endpoint, called with the signed-in email, drilled by `paths` and stored under `profile.stateKey`. The app waits on the loading card until it lands and shows the denied card when it fails."),
      bound("Profile load", "me", "$status"),
      bound("Job title", "me", "jobTitle"),
      bound("Company", "me", "companyModel.name"),
      bound("Business unit", "me", "businessUnitModel.name"),
      bound("Person id", "me", "personId"),
      bound("Primary assignment", "me", "isPrimaryAssignment"),

      ...section("Actions", "SignOut / SignIn are built-in button actions; fn:tokenLength is a custom action reading ctx.auth (src/actions.ts). The user menu top-right does the same Sign out."),
      button("Sign out", { icon: "logOut", variant: "outlined", actions: ["SignOut"] }),
      button("Sign in", { icon: "logIn", variant: "text", actions: ["SignIn"] }),
      button("Token length", { icon: "shieldCheck", actions: ["fn:tokenLength"] }),

      ...section("Conditions", "A block shown only while the profile is an admin — `{ source: \"state\", key: \"me\", path: \"isAdmin\" }`."),
      {
        ...half,
        type: "typography",
        condition: { left: { source: "state", key: "me", path: "isAdmin" }, operator: "eq", right: { val: true } },
        element: { text: "You are an admin: this block is gated on me.isAdmin.", variant: "body2", color: "green" },
      },
    ],
  },
];
