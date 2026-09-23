import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Server filter & sort demo page (`/server-filter`). A `datatable` filters and
 * sorts **through its API**:
 *
 * - `filterContainer` — a container of ordinary input bins. The table renders
 *   it as its filter form (behind a Filter button, or `filterDisplay: "inline"`
 *   as a bar) with its own Apply / Clear. Nothing is sent until Apply, which
 *   returns to page 1 and calls the API.
 * - `{ type: "filter", key: "<field name>" }` — the DataValue that maps a filter
 *   field into the request. It works in any of the three maps: `api.query`,
 *   `api.body` and `api.params` (a URL `:param`). A blank filter leaves its key
 *   out; a `value` on the DataValue is the fallback while it is blank.
 * - `filterDefaults` — the filters the table opens with; Clear returns to them.
 * - `api.sort` — `sortKey` + `orderKey` receive the sorted column's field
 *   (`sortField`, else the accessor) and direction. The header sort icons then
 *   call the API instead of sorting the fetched rows.
 *
 * One table per placement, over the mock API's `/collection/page` (GET + POST)
 * and `/collection/region/:region/page`; the last one has no `pagination`
 * block — filter and sort still go to the API, the table pages in memory.
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
  // The API sorts editors by `updated_by_name`; spelled out to show `sortField`.
  column("updated_by_name", "Updated By", { sortField: "updated_by_name" }),
];

type Span = Bin["md"];

const textFilter = (name: string, label: string, placeholder: string, span: Span = "12"): Bin => ({
  sm: "12", md: span, lg: span, xl: span,
  type: "textfield",
  justifySelf: "stretch",
  alignSelf: "stretch",
  element: { name, label, dataType: "text", isRequired: false, errorMessage: "", placeholder },
});

const selectFilter = (
  name: string,
  label: string,
  options: { value: string; label: string }[],
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
    keys: { id: "value", search: "label", display: "label" },
    defaultData: {},
    options,
  } as Bin["element"],
});

const EDITORS = ["Admin", "Somchai", "Yuki", "Maria"].map((v) => ({ value: v, label: v }));
const REGIONS = [
  { value: "r-sea", label: "Southeast Asia" },
  { value: "r-ea", label: "East & South Asia" },
  { value: "r-eu", label: "Europe" },
  { value: "r-an", label: "Antarctica (no countries)" },
];

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

export const containerServerFilterDemo: Container[] = [
  {
    id: "1",
    name: "ServerFilterDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Server filter & sort", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: 'Filters are a form the table owns (filterContainer); { type: "filter", key } DataValues map its fields into the request\'s query, body or URL params, and Apply calls the API. api.sort sends the clicked column and direction the same way. Open the network tab to watch the requests.',
        },
      },
      ...section(
        "Filters in the query string + server sort",
        "GET /collection/page?offset&limit&name&code&updatedBy&sortBy&sortDir — name / code / updatedBy come from the Filter popover (api.query), sortBy / sortDir from the header sort icons (api.sort, placement inferred: the endpoint has no body). Blank filters are left out of the URL.",
      ),
      table({
        name: "dtFilterQuery",
        title: "Countries — query filters",
        filterContainer: filterForm("filterQuery", [
          textFilter("filterName", "Name contains", "e.g. land"),
          textFilter("filterCode", "Code is", "e.g. TH"),
          selectFilter("filterEditors", "Updated by (any of)", EDITORS, "12", "multiAutocomplete"),
        ]),
        api: {
          name: "countriesPagedGet",
          paths: ["data"],
          query: {
            name: { type: "filter", key: "filterName" },
            code: { type: "filter", key: "filterCode" },
            updatedBy: { type: "filter", key: "filterEditors" },
          },
          pagination: paging,
          sort: { ...sort, default: { field: "name", order: "asc" } },
        },
      }),
      ...section(
        "Filters in the request body, inline, with a default",
        'POST /collection/page — the same filters mapped into api.body beside a fixed collectionId. filterDisplay: "inline" lays the form out as a bar; filterDefaults opens the table already filtered to Admin (Clear returns to that). The sort goes in the body too, with orderValues sending 1 / -1 instead of "asc" / "desc".',
      ),
      table({
        name: "dtFilterBody",
        title: "Countries — body filters",
        filterDisplay: "inline",
        filterDefaults: { filterEditor: "Admin" },
        filterContainer: filterForm("filterBody", [
          textFilter("filterName", "Name contains", "e.g. an", "6"),
          selectFilter("filterEditor", "Updated by", EDITORS, "6"),
        ]),
        api: {
          name: "countriesPaged",
          paths: ["data"],
          body: {
            collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
            name: { type: "filter", key: "filterName" },
            updatedBy: { type: "filter", key: "filterEditor" },
          },
          pagination: { ...paging, placement: "body" },
          sort: { ...sort, placement: "body", orderValues: { asc: 1, desc: -1 } },
        },
      }),
      ...section(
        "A filter mapped to a URL param",
        'GET /collection/region/:region/page — the Region filter feeds api.params.region. A URL param can\'t be blank, so the DataValue carries value: "all" as its fallback: no region picked ⇒ /collection/region/all/page. Antarctica shows the "no rows match" state.',
      ),
      table({
        name: "dtFilterParam",
        title: "Countries — region in the URL",
        filterButton: { label: "Region", icon: "map", variant: "outlined" },
        filterContainer: filterForm("filterParam", [selectFilter("filterRegion", "Region", REGIONS)]),
        api: {
          name: "regionCountriesPaged",
          paths: ["data"],
          params: { region: { type: "filter", key: "filterRegion", value: "all" } },
          pagination: paging,
          sort,
        },
      }),
      ...section(
        "Without server pagination",
        "No pagination block: the API still receives the filters and the sort (one call per Apply / sort click, no limit ⇒ every match comes back) and the table pages the result in memory.",
      ),
      table({
        name: "dtFilterClient",
        title: "Countries — filtered by the API, paged in memory",
        filterContainer: filterForm("filterClient", [
          textFilter("filterName", "Name contains", "e.g. ia"),
          selectFilter("filterEditor", "Updated by", EDITORS),
        ]),
        api: {
          name: "countriesPagedGet",
          paths: ["data"],
          query: {
            name: { type: "filter", key: "filterName" },
            updatedBy: { type: "filter", key: "filterEditor" },
          },
          sort,
        },
      }),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
