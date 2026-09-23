import type { TMenu } from "@gummy-ui/ui";

/**
 * App-shell menu (see the grilled design): items point at page keys from
 * `pages.ts`, so the sidebar highlights whatever route is current. Every item
 * kind is exercised — a page link, a group of fixed-param links (each active
 * only for its own country), a divider and an external link.
 */
export const menu: TMenu = [
  { label: "Countries", icon: "globe", navigate: { page: "countryList" } },
  { label: "Form list", icon: "list", navigate: { page: "formListDemo" } },
  { label: "Repeater", icon: "grid", navigate: { page: "repeaterDemo" } },
  { label: "Data table", icon: "list", navigate: { page: "dataTableDemo" } },
  { label: "Column resize", icon: "columns", navigate: { page: "columnResizeDemo" } },
  { label: "HTML columns", icon: "code", navigate: { page: "htmlColumnDemo" } },
  { label: "Pagination", icon: "database", navigate: { page: "paginationDemo" } },
  { label: "Server filter", icon: "filter", navigate: { page: "serverFilterDemo" } },
  { label: "Filter via API", icon: "search", navigate: { page: "filterApiDemo" } },
  { label: "Cell tooltip", icon: "info", navigate: { page: "cellTooltipDemo" } },
  { label: "Table layout", icon: "table", navigate: { page: "tableLayoutDemo" } },
  { label: "Card", icon: "creditCard", navigate: { page: "cardDemo" } },
  { label: "HTML content", icon: "code", navigate: { page: "htmlContentDemo" } },
  { label: "Drawer", icon: "panelRight", navigate: { page: "drawerDemo" } },
  { label: "Switch", icon: "toggleLeft", navigate: { page: "switchDemo" } },
  { label: "Upload", icon: "upload", navigate: { page: "uploadDemo" } },
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
