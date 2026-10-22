import type { Bin, Container, PageLoad } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Replace / Switch Profile demo page (`/profile`): the two profile elements
 * over the mock profile service, sharing the `profile` state slice (see the
 * grilled design). The logged-in profile is the page load `me` (an admin
 * with two positions); `replaceprofile` offers its trigger only while
 * `me.isAdmin`, `switchprofile` lists the active person's profiles — once as
 * the list, once as a dropdown — from one shared, per-person cache (Confirm's
 * fetch feeds the switch; a pick calls no API). Every other block binds to
 * `{ type: "state", key: "profile" }`, so it follows whichever profile is
 * active — a switch, a replacement, a return; the person's rows are the
 * `profileList` slice.
 *
 * Try: search "tian" and Confirm (two positions to switch between), "nadia"
 * (no active profile — the dialog says so and nothing changes), "broken"
 * (the profiles call fails — same), then "Return to my profile". Reload the
 * tab: the impersonation survives (sessionStorage, re-fetched); the switch
 * survives a new tab too (localStorage).
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const me = { type: "state", key: "me" } as const;
const profile = { type: "state", key: "profile" } as const;
const isAdmin = { left: { source: "state", key: "me", path: "isAdmin" }, operator: "eq", right: { val: true } } as const;

/** The logged-in profile, loaded for the page (the app would load it once, globally). */
export const profileLoads: PageLoad[] = [
  { key: "me", loading: "skeleton", api: { name: "me", paths: ["data"] } },
];

export const containerProfileDemo: Container[] = [
  {
    id: "1",
    name: "ProfileDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Replace / Switch Profile", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Two elements sharing one global-state slice (`profile`): `replaceprofile` lets an admin read the app as another person (search → pick → Confirm; the current profile is kept as the original and a banner offers the way back), `switchprofile` lists the active person's positions. Both persist their choice and re-fetch on load.",
        },
      },

      ...section("Replace profile", "The trigger shows only while the logged-in profile (`me`) has isAdmin — a condition over global state, so it stays while impersonating a non-admin. Search \"tian\", \"nadia\" (no active profile) or \"broken\" (the profiles call fails)."),
      {
        ...full,
        type: "replaceprofile",
        element: {
          name: "replaceProfile",
          initial: me,
          searchApi: { name: "searchProfiles", paths: ["data"] },
          profilesApi: { name: "profilesByPerson", paths: ["data"], query: { exceptJobStatus: { type: "value", key: "none", value: "T" } } },
          canReplace: isAdmin,
        },
      },

      ...section("Switch profile", "Every profile the active person holds — the admin's two positions, then the replaced person's. Picking one makes it active (no API call); the choice is remembered in localStorage and restored on load when still listed, else the primary assignment (`isPrimaryAssignment`) wins — the admin's is the second row."),
      {
        ...half,
        type: "switchprofile",
        element: {
          name: "switchProfile",
          initial: me,
          api: { name: "profilesByPerson", paths: ["data"], query: { exceptJobStatus: { type: "value", key: "none", value: "T" } } },
          hideWhenSingle: false,
        },
      },
      {
        ...half,
        type: "switchprofile",
        element: {
          name: "switchProfileDropdown",
          initial: me,
          api: { name: "profilesByPerson", paths: ["data"], query: { exceptJobStatus: { type: "value", key: "none", value: "T" } } },
          display: "dropdown",
          showSubtitle: false,
          title: "Position",
          hideWhenSingle: false,
        },
      },
      {
        ...full,
        type: "html",
        element: {
          value: { type: "state", key: "profileList" },
          html: "<p class=\"dt-muted\">The active person holds <strong>{{length}}</strong> profile(s) — the <code>profileList</code> slice, filled by whichever element fetched it first.</p>",
        },
      },
      {
        ...half,
        type: "card",
        element: {
          header: {
            title: "No active profile",
            titleValue: { ...profile, path: "jobTitle" },
            subheader: "",
            subheaderValue: { ...profile, path: "companyModel.name" },
            avatar: { name: "activeAvatar", fallback: "?", fallbackValue: { ...profile, path: "firstNameEn" } },
          },
          content: {
            id: "profile-card-content",
            name: "ProfileCardContent",
            isArray: false,
            bins: [
              {
                ...full,
                type: "html",
                element: {
                  value: profile,
                  html: "<p><strong>{{firstNameEn}} {{lastNameEN}}</strong> · <span class=\"dt-muted\">{{email}}</span></p><p class=\"dt-muted\">Unit: {{businessUnitModel.name}} · user id <code>{{userId}}</code> · person <code>{{personId}}</code></p>",
                },
              },
            ],
            ...DEFAULT_CONTAINER_GRID,
            gap: "2",
          },
          variant: "outlined",
        },
      },

      ...section("Bound elsewhere", "Anything binds to the slice like to a page load: a typography on `profile.jobTitle`, the original profile (while impersonating) on `profileOriginal`."),
      { ...half, type: "typography", element: { text: "—", value: { ...profile, path: "jobTitle" }, variant: "body1" } },
      {
        ...half,
        type: "typography",
        element: { text: "Not impersonating", value: { type: "state", key: "profileOriginal", path: "jobTitle" }, variant: "body1", color: "gray" },
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
  },
];
