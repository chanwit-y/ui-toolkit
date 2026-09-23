import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Filter via API demo page (`/filter-api`). The Server filter page maps filter
 * fields into the request; this one is about the **options** of those fields
 * coming from the API. A `filterContainer` is an ordinary engine form, so its
 * `autocomplete` / `multiAutocomplete` bins use the same `api` block as any
 * form field — in each of the engine's three loading modes:
 *
 * - **load once** — `api` with no `query`: fetched at mount (react-query,
 *   cached for the session), then filtered in memory as you type.
 * - **search as you type** — `api.query` carries a `{ type: "value" }`
 *   DataValue that receives the typed text (debounced 500 ms).
 * - **dependent** — `observeTo: "<parent field>"` + `api.params` with a
 *   `{ type: "observe" }` entry: refetched with the parent's value whenever it
 *   changes (the parent sets `canObserve: true`), the child's own value cleared.
 *   Until the parent has a value the child has no options.
 *
 * Whatever loaded the options, the picked value reaches the table's request
 * through the usual `{ type: "filter", key }` DataValue. Field names are
 * app-wide for observe (one Subject per name), so the pair below uses names
 * no other table on the page shares.
 */
const section = (text: string, caption: string): Bin[] => [
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text, variant: "subtitle1", weight: "medium" },
  },
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text: caption, variant: "body2", color: "gray" },
  },
];

const column = (accessor: string, header: string, extra: Partial<DataTableColumnDef> = {}): DataTableColumnDef => ({
  accessor,
  header,
  align: "start",
  enableSorting: true,
  enableColumnFilter: false,
  ...extra,
});

const columns: DataTableColumnDef[] = [
  column("code", "Code"),
  column("name", "Name"),
  column("updated_at", "Update Date", { useDateFormat: "DD/MM/YYYY HH:mm" }),
  column("updated_by_name", "Updated By"),
];

type Span = Bin["md"];

/** An `autocomplete` / `multiAutocomplete` whose options come from an endpoint. */
const apiSelect = (
  name: string,
  label: string,
  element: Record<string, unknown>,
  span: Span = "12",
  type: "autocomplete" | "multiAutocomplete" = "autocomplete",
): Bin => ({
  sm: "12", md: span, lg: span, xl: span,
  type,
  justifySelf: "stretch",
  alignSelf: "stretch",
  element: {
    name,
    label,
    dataType: type === "multiAutocomplete" ? "array" : "string",
    isRequired: false,
    errorMessage: "",
    canObserve: false,
    observeTo: "",
    isSingleLoad: false,
    defaultData: {},
    options: [],
    ...element,
  } as Bin["element"],
});

const filterForm = (id: string, bins: Bin[]): Container => ({
  id,
  name: id,
  isArray: false,
  bins,
  ...DEFAULT_CONTAINER_GRID,
  gap: "3",
});

const paging = {
  offsetKey: "offset",
  limitKey: "limit",
  totalPath: ["total"],
  defaultPageSize: 5,
  pageSizeOptions: [5, 10, 20],
};

const sort = { sortKey: "sortBy", orderKey: "sortDir" };

const table = (element: Record<string, unknown>): Bin => ({
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: { columns, canSearch: false, ...element } as Bin["element"],
});

export const containerFilterApiDemo: Container[] = [
  {
    id: "1",
    name: "FilterApiDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Filter via API", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The filter form is a real engine form, so an autocomplete inside it loads its options through the same api block as any form field — once at mount, as you type, or from another filter's value. The picked value still reaches the request through a { type: \"filter\", key } DataValue. Open the network tab to watch both the option and the page requests.",
        },
      },
      ...section(
        "Options loaded once",
        "Region is an autocomplete over GET /collection/regions with no query: fetched when the form mounts, then matched in memory as you type. The region id feeds api.params.region of GET /collection/region/:region/page, with value: \"all\" as the fallback while nothing is picked.",
      ),
      table({
        name: "dtOptionsOnce",
        title: "Countries — region options loaded once",
        filterButton: { label: "Region", icon: "map", variant: "outlined" },
        filterContainer: filterForm("filterOptionsOnce", [
          apiSelect("apiRegion", "Region", {
            placeholder: "Pick a region",
            inputIcon: "map",
            keys: { id: "_id", search: "name", display: "name" },
            api: { name: "regions", paths: ["data"] },
          }),
        ]),
        api: {
          name: "regionCountriesPaged",
          paths: ["data"],
          params: { region: { type: "filter", key: "apiRegion", value: "all" } },
          pagination: paging,
          sort: { ...sort, default: { field: "name", order: "asc" } },
        },
      }),
      ...section(
        "Options searched as you type",
        "Countries is a multiAutocomplete over GET /collection/search?search=… — api.query.search is a { type: \"value\" } DataValue the field fills with the typed text (debounced). Its id key is the country code, so the selection is a list of codes sent as api.query.codes of GET /collection/page (blank ⇒ left out).",
      ),
      table({
        name: "dtOptionsSearch",
        title: "Countries — picked from a searched list",
        filterButton: { label: "Countries", icon: "flag", variant: "outlined" },
        filterContainer: filterForm("filterOptionsSearch", [
          apiSelect(
            "apiCodes",
            "Countries (any of)",
            {
              placeholder: "Type to search countries…",
              inputIcon: "flag",
              itemAvatar: "avatar",
              itemSubtitle: "code",
              keys: { id: "code", search: "name", display: "name" },
              api: {
                name: "searchCountries",
                paths: ["data"],
                query: { search: { type: "value", key: "search" } },
              },
            },
            "12",
            "multiAutocomplete",
          ),
        ]),
        api: {
          name: "countriesPagedGet",
          paths: ["data"],
          query: { codes: { type: "filter", key: "apiCodes" } },
          pagination: paging,
          sort: { ...sort, default: { field: "name", order: "asc" } },
        },
      }),
      ...section(
        "Dependent options: region → country",
        "Region loads once and publishes its value (canObserve). Country observes it (observeTo: \"depRegion\"): api.params.region is a { type: \"observe\" } entry, so every region change refetches GET /collection/region/:region/page?name=… with the typed text and clears the country. Until a region is picked the country list is empty. Both reach the table: region → api.params.region, country code → api.query.code.",
      ),
      table({
        name: "dtOptionsDependent",
        title: "Countries — region then country",
        filterContainer: filterForm("filterOptionsDependent", [
          apiSelect("depRegion", "Region", {
            placeholder: "Pick a region first",
            inputIcon: "map",
            canObserve: true,
            keys: { id: "_id", search: "name", display: "name" },
            api: { name: "regions", paths: ["data"] },
          }, "6"),
          apiSelect("depCountry", "Country", {
            placeholder: "Then a country of that region",
            inputIcon: "flag",
            itemAvatar: "avatar",
            itemSubtitle: "code",
            observeTo: "depRegion",
            keys: { id: "code", search: "name", display: "name" },
            api: {
              name: "regionCountriesPaged",
              paths: ["data"],
              params: { region: { type: "observe", key: "depRegion" } },
              query: { name: { type: "value", key: "search" } },
            },
          }, "6"),
        ]),
        api: {
          name: "regionCountriesPaged",
          paths: ["data"],
          params: { region: { type: "filter", key: "depRegion", value: "all" } },
          query: { code: { type: "filter", key: "depCountry" } },
          pagination: paging,
          sort: { ...sort, default: { field: "name", order: "asc" } },
        },
      }),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
