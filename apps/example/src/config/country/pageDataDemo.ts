import type { Bin, Container, DataTableColumnDef, DataValue, PageLoad } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Page data demo (`/page-data/:code`): data loaded once for the whole page
 * (`PageElement.loads`) and bound anywhere on it with `{ type: "state" }`
 * values. Four loads, fired in dependency order by the engine:
 *
 * - `country`  ← `countryDetail` with `:id` = the URL's `:code` — blocking
 *               (the loading overlay) with an error snackbar.
 * - `region`   ← `regionByCountry`, `:code` read from the `country` slice —
 *               held until the country lands (a chained load).
 * - `regionCountries` ← `regionCountriesPaged`, `:region` = `region._id` —
 *               two deep. The United States belongs to no region, so this
 *               chain stops at a failed `region`.
 * - `lookups`  ← `regions` — a **global** load (`globalLoads`, mounted once
 *               by `<GlobalLoads>` in App.tsx): fetched when the app starts
 *               and kept across pages, so returning here doesn't refetch it.
 *
 * On the page: a card bound to the country, the region's name / blurb, a
 * data table whose rows *are* the `regionCountries` slice (a row click opens
 * that country here — the loads refetch, keeping the old data meanwhile), a
 * select whose options are the `lookups` slice, a field seeded from the
 * country, per-load `$status` lines, a "Not found" block shown by a
 * `source: "state"` condition, and Reload buttons (`ReloadDataTable` with the
 * load's key).
 */
export const pageDataLoads: PageLoad[] = [
  {
    key: "country",
    blocking: true,
    errorMessage: "Country not found.",
    api: { name: "countryDetail", paths: ["data"], params: { id: { type: "url", key: "code" } } },
  },
  {
    key: "region",
    api: { name: "regionByCountry", paths: ["data"], params: { code: { type: "state", key: "country", path: "code" } } },
  },
  {
    key: "regionCountries",
    api: { name: "regionCountriesPaged", paths: ["data"], params: { region: { type: "state", key: "region", path: "_id" } } },
  },
];

/** App-wide loads (`<GlobalLoads>` in App.tsx): readable from every page. */
export const globalLoads: PageLoad[] = [{ key: "lookups", api: { name: "regions", paths: ["data"] } }];

const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const state = (key: string, path?: string): DataValue => ({ type: "state", key, ...(path ? { path } : {}) });

const text = (t: string, element: Record<string, unknown> = {}, span: Partial<Bin> = full): Bin => ({
  ...full,
  ...span,
  type: "typography",
  element: { text: t, variant: "body2", ...element } as Bin["element"],
});

const section = (title: string, caption: string): Bin[] => [
  text(title, { variant: "subtitle1", weight: "medium" }),
  text(caption, { color: "gray" }),
];

const notFound = { left: { source: "state", key: "country", path: "$status" }, operator: "eq", right: { val: "error" } } as const;
const found = { ...notFound, operator: "neq" } as const;

/** One "key: status" line per load — `$status` reads the slice's load state. */
const statusLine = (key: string): Bin[] => [
  text(key, { weight: "medium" }, { sm: "6", md: "3", lg: "2", xl: "2" }),
  text("idle", { color: "gray", value: state(key, "$status") }, { sm: "6", md: "3", lg: "1", xl: "1" }),
];

const jump = (label: string, code: string): Bin => ({
  sm: "4", md: "2", lg: "2", xl: "1",
  type: "button",
  element: {
    label,
    variant: "outlined",
    actions: ["Navigate"],
    navigate: { page: "pageDataDemo", params: { code: { type: "value", key: "none", value: code } } },
  },
});

const cardContent: Container = {
  id: "page-data-card-body",
  name: "PageDataCardBody",
  isArray: false,
  bins: [
    text("Region", { variant: "caption", color: "gray" }),
    text("No region", { variant: "subtitle2", value: state("region", "name") }),
    text("", { color: "gray", value: state("region", "description") }),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "1",
};

const columns: DataTableColumnDef[] = [
  { accessor: "code", header: "Code", align: "start", enableSorting: true, enableColumnFilter: false },
  { accessor: "name", header: "Name", align: "start", enableSorting: true, enableColumnFilter: false },
  { accessor: "updated_by_name", header: "Updated By", align: "start", enableSorting: true, enableColumnFilter: true },
];

export const containerPageDataDemo: Container[] = [
  {
    id: "1",
    name: "PageDataDemo",
    isArray: false,
    bins: [
      text("Page data", { variant: "h3" }),
      text(
        "Three loads declared on the page (loads) plus one global load (lookups, fetched once for the whole app), each stored under its key and bound anywhere below with { type: \"state\", key, path }. A load that reads another slice waits for it; the rest fire in parallel.",
        { color: "gray" },
      ),
      jump("Thailand", "TH"),
      jump("Japan", "JP"),
      jump("France", "FR"),
      jump("United States", "US"),
      jump("Unknown", "XX"),

      ...section("Load status", "$status of each slice: idle, held (waiting on a :param or another slice), loading, success, error."),
      ...statusLine("country"),
      ...statusLine("region"),
      ...statusLine("regionCountries"),
      ...statusLine("lookups"),

      // Shown by a condition on the slice's status, not on the context.
      {
        ...full,
        type: "typography",
        condition: notFound,
        element: { text: "Country not found — try one of the buttons above.", variant: "subtitle1", color: "red" },
      },

      ...section("Bound display", "A card whose header and media read the country slice, with the chained region in its content."),
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        condition: found,
        element: {
          name: "pageDataCountry",
          variant: "outlined",
          header: {
            title: "Loading…",
            titleValue: state("country", "name"),
            subheader: "—",
            subheaderValue: state("country", "code"),
            avatar: { size: "md", fallback: "?", srcValue: state("country", "avatar"), fallbackValue: state("country", "code") },
          },
          media: { height: 140, alt: "Flag", srcValue: state("country", "image") },
          content: cardContent,
          actions: [
            { label: "Reload country", icon: "refresh", variant: "text", actions: ["ReloadDataTable"], reloadDataTable: "country" },
          ],
          actionsAlign: "end",
        } as Bin["element"],
      },
      {
        sm: "12", md: "6", lg: "8", xl: "8",
        type: "typography",
        condition: found,
        element: { text: "", variant: "body2", color: "gray", value: state("region", "about") },
      },

      ...section("Rows from a slice", "The table's items are the regionCountries slice — in-memory paging, sorting and search. A row opens that country on this page."),
      {
        ...full,
        type: "datatable",
        element: {
          name: "dtPageDataRegion",
          title: "Countries in the same region",
          columns,
          items: state("regionCountries"),
          rowNavigate: { page: "pageDataDemo", params: { code: { type: "row", key: "code" } } },
        } as Bin["element"],
      },

      ...section("Options and initial values", "The select's options are the lookups slice; the text field starts from the country's name."),
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "autocomplete",
        element: {
          name: "pageDataRegion",
          label: "Region (options from lookups)",
          dataType: "string",
          isRequired: false,
          errorMessage: "",
          canObserve: false,
          observeTo: "",
          isSingleLoad: false,
          inputIcon: "map",
          itemSubtitle: "description",
          keys: { id: "_id", search: "name", display: "name" },
          defaultData: {},
          options: [],
          optionsValue: state("lookups"),
        } as Bin["element"],
      },
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "textfield",
        element: { name: "pageDataName", label: "Name (initial value from country)", dataType: "string", isRequired: false, errorMessage: "", value: state("country", "name") },
      },
      {
        sm: "12", md: "4", lg: "3", xl: "3",
        type: "button",
        element: { label: "Reload region countries", icon: "refresh", variant: "outlined", actions: ["ReloadDataTable"], reloadDataTable: "regionCountries" },
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "3",
    alignItems: "start",
  },
];
