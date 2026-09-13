import type { TMenu } from "@gummy-ui/ui";

/**
 * App-shell menu (see the grilled design): items point at page keys from
 * `pages.ts`, so the sidebar highlights whatever route is current. Every item
 * kind is exercised — a page link, a group of fixed-param links (each active
 * only for its own country), a divider and an external link.
 */
export const menu: TMenu = [
  { label: "Countries", icon: "globe", navigate: { page: "countryList" } },
  {
    label: "Shortcuts",
    icon: "bookmark",
    items: [
      {
        label: "Thailand",
        icon: "flag",
        navigate: { page: "countryDetail", params: { id: { type: "value", key: "none", value: "1" } } },
      },
      {
        label: "Japan",
        icon: "flag",
        navigate: { page: "countryDetail", params: { id: { type: "value", key: "none", value: "3" } } },
      },
    ],
  },
  { divider: true },
  { label: "Gummy UI on GitHub", icon: "code", href: "https://github.com/", newTab: true },
];
