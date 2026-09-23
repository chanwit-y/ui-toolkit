import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Pagination demo page (`/pagination`). Three `datatable` bins over the same
 * countries data, one per way of paging:
 *
 * - **Query string** — `api.pagination` on a GET endpoint that declares only a
 *   `query` model: offset/limit/search go into the query string. Nothing says
 *   so in the config — the placement is inferred from the endpoint.
 * - **Request body** — the POST endpoint declares a `body` model, so the same
 *   keys land in the body. `placement: "body"` is written out here to show the
 *   explicit form (it is what inference would pick anyway).
 * - **Client side** — no `pagination` block: the table fetches everything once
 *   and pages, sorts and filters in memory, which is what a table does by
 *   default.
 *
 * In both server modes the table sends `offsetKey = pageIndex * pageSize` and
 * `limitKey = pageSize` on every page change, the search box (when `searchKey`
 * is set) is debounced into the request, and the total row count is read off
 * the response at `totalPath`.
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

const columns: DataTableColumnDef[] = [
  { accessor: "code", header: "Code", align: "start", enableSorting: false, enableColumnFilter: false },
  { accessor: "name", header: "Name", align: "start", enableSorting: false, enableColumnFilter: false },
  {
    accessor: "updated_at",
    header: "Update Date",
    align: "start",
    useDateFormat: "DD/MM/YYYY HH:mm",
    enableSorting: false,
    enableColumnFilter: false,
  },
  { accessor: "updated_by_name", header: "Updated By", align: "start", enableSorting: false, enableColumnFilter: false },
];

const table = (element: Record<string, unknown>): Bin => ({
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "stretch",
  element: { columns, ...element } as Bin["element"],
});

const queryBins: Bin[] = [
  ...section(
    "Query string (GET)",
    'api.pagination on "countriesPagedGet" — GET /collection/page?offset=0&limit=5&search= . The endpoint declares a query model and no body, so the keys go to the query string; no placement needed.',
  ),
  table({
    name: "dtPagedQuery",
    title: "Countries — query placement",
    api: {
      name: "countriesPagedGet",
      paths: ["data"],
      pagination: {
        offsetKey: "offset",
        limitKey: "limit",
        searchKey: "search",
        totalPath: ["total"],
        defaultPageSize: 5,
        pageSizeOptions: [5, 10, 20],
      },
    },
  }),
];

const bodyBins: Bin[] = [
  ...section(
    "Request body (POST)",
    'api.pagination on "countriesPaged" with placement: "body" — POST /collection/page { offset, limit, search }. The static body values are placeholders the table overwrites on every page change.',
  ),
  table({
    name: "dtPagedBody",
    title: "Countries — body placement",
    api: {
      name: "countriesPaged",
      paths: ["data"],
      body: {
        offset: { type: "value", key: "offset", value: 0 },
        limit: { type: "value", key: "limit", value: 5 },
        search: { type: "value", key: "search", value: "" },
      },
      pagination: {
        placement: "body",
        offsetKey: "offset",
        limitKey: "limit",
        searchKey: "search",
        totalPath: ["total"],
        defaultPageSize: 5,
        pageSizeOptions: [5, 10, 20],
      },
    },
  }),
];

const clientBins: Bin[] = [
  ...section(
    "Client side (no pagination block)",
    'No api.pagination — "countries" is fetched once (limit 100 in the body) and the table pages, sorts and filters the rows in memory. Column sort and filter icons are back, since they act on the loaded set. canSearch: false hides the header search box.',
  ),
  table({
    name: "dtPagedClient",
    title: "Countries — in-memory paging",
    canSearch: false,
    columns: columns.map((c) => ({ ...c, enableSorting: true })),
    api: {
      name: "countries",
      paths: ["data"],
      body: {
        collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
        offset: { type: "value", key: "offset", value: 0 },
        limit: { type: "value", key: "limit", value: 100 },
      },
    },
  }),
];

export const containerPaginationDemo: Container[] = [
  {
    id: "1",
    name: "PaginationDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Pagination", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The data table's server-side paging: where offset/limit go (query string or body), and the in-memory default for comparison. Page through each table and watch the Network tab.",
        },
      },
      ...queryBins,
      ...bodyBins,
      ...clientBins,
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
