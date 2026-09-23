import type { TPageMaster } from "@gummy-ui/ui";
import {
  containerCountryList,
  containerCountryStateDetail,
} from "./container";
import { containerColumnResizeDemo } from "./columnResizeDemo";
import { containerDataTableDemo } from "./dataTableDemo";
import { containerFormListDemo } from "./formListDemo";
import { containerHtmlColumnDemo } from "./htmlColumnDemo";
import { containerPaginationDemo } from "./paginationDemo";
import { containerRepeaterDemo } from "./repeaterDemo";
import { containerServerFilterDemo } from "./serverFilterDemo";
import { containerFilterApiDemo } from "./filterApiDemo";
import { containerCellTooltipDemo } from "./cellTooltipDemo";
import { containerTableLayoutDemo } from "./tableLayoutDemo";
import { containerCardDemo } from "./cardDemo";
import { containerHtmlContentDemo } from "./htmlContentDemo";
import { containerUploadDemo } from "./uploadDemo";

/**
 * Router demo: the pages the example app serves, keyed by name. Navigating
 * elements (`ButtonElement.navigate`, `DataTableElement.rowNavigate`) refer to
 * these keys; `PageRouter` fills each `path` template from the target's
 * `params` and mounts `containers` through `Core` when the route matches.
 *
 * Wiring in `App.tsx`, inside the app's own `<BrowserRouter>`:
 *
 *   <PageRouter http={http} model={model} api={api} pages={pages} notFound={<NotFound />} />
 */
export const pages = {
  countryList: {
    path: "/",
    title: "Countries",
    containers: containerCountryList,
    // The home page has no trail worth showing: hide the AppShell strip here.
    breadcrumb: false,
  },
  countryDetail: {
    // `:id` feeds the container's state loader (`{ type: "url", key: "id" }`).
    // `?next=` is read by the "Next country" button's replace-navigation.
    path: "/country/:id",
    // Breadcrumb "Countries / Thailand": `parent` places the page under the
    // list, and the title reads the loaded record's name out of the
    // `countryDetail` state slice (filled by the container's `load`). It is
    // also the document title once the record arrives.
    parent: "countryList",
    title: { type: "state", key: "countryDetail", path: "name" },
    containers: containerCountryStateDetail,
  },
  formListDemo: {
    // The `formlist` component on its own: a full-CRUD list and a
    // create-and-delete-only one (see ./formListDemo.ts).
    path: "/form-list",
    parent: "countryList",
    title: "Form list",
    containers: containerFormListDemo,
  },
  repeaterDemo: {
    // The read-only `repeater`: a card grid that links to the detail page and
    // a nested repeater over a row field (see ./repeaterDemo.ts).
    path: "/repeater",
    parent: "countryList",
    title: "Repeater",
    containers: containerRepeaterDemo,
  },
  dataTableDemo: {
    // Column pinning on a deliberately overflowing table (see ./dataTableDemo.ts).
    path: "/data-table",
    parent: "countryList",
    title: "Data table",
    containers: containerDataTableDemo,
  },
  columnResizeDemo: {
    // Drag-to-resize columns on both tables: default, configured sizes and
    // limits with pins, editable, and switched off (see ./columnResizeDemo.ts).
    path: "/column-resize",
    parent: "countryList",
    title: "Column resize",
    containers: containerColumnResizeDemo,
  },
  htmlColumnDemo: {
    // `html` column templates: helpers, images + inline style, nested paths
    // and what the sanitiser drops (see ./htmlColumnDemo.ts).
    path: "/html-columns",
    parent: "countryList",
    title: "HTML columns",
    containers: containerHtmlColumnDemo,
  },
  paginationDemo: {
    // The data table's server paging: offset/limit in the query string (GET)
    // or the body (POST), beside the in-memory default (see ./paginationDemo.ts).
    path: "/pagination",
    parent: "countryList",
    title: "Pagination",
    containers: containerPaginationDemo,
  },
  serverFilterDemo: {
    // Custom filters (`filterContainer` + `type:"filter"` DataValues in the
    // query, body or URL params) and `api.sort`, all through the API (see
    // ./serverFilterDemo.ts).
    path: "/server-filter",
    parent: "countryList",
    title: "Server filter & sort",
    containers: containerServerFilterDemo,
  },
  filterApiDemo: {
    // Filter fields whose options come from the API: loaded once, searched as
    // you type, or dependent on another filter (see ./filterApiDemo.ts).
    path: "/filter-api",
    parent: "countryList",
    title: "Filter via API",
    containers: containerFilterApiDemo,
  },
  cellTooltipDemo: {
    // The line clamp's tooltip: a cut cell shows its whole text on hover
    // (see ./cellTooltipDemo.ts).
    path: "/cell-tooltip",
    parent: "countryList",
    title: "Cell tooltip",
    containers: containerCellTooltipDemo,
  },
  tableLayoutDemo: {
    // Row header, group headers and merged cells (see ./tableLayoutDemo.ts).
    path: "/table-layout",
    parent: "countryList",
    title: "Table layout",
    containers: containerTableLayoutDemo,
  },
  cardDemo: {
    // The `card` element after MUI's Card: slots, media, expand, action area
    // and cards in a repeater (see ./cardDemo.ts).
    path: "/card",
    parent: "countryList",
    title: "Card",
    containers: containerCardDemo,
  },
  htmlContentDemo: {
    // The `html` element: static markup, a template bound to a repeater
    // item, inside a card, and what the sanitiser strips (see ./htmlContentDemo.ts).
    path: "/html-content",
    parent: "countryList",
    title: "HTML content",
    containers: containerHtmlContentDemo,
  },
  uploadDemo: {
    // The `uploadfile` config on its own: single / multiple, accept presets
    // and the list / grid preview with its viewer (see ./uploadDemo.ts).
    // Not `/upload`: the dev server proxies that prefix to the API.
    path: "/file-upload",
    parent: "countryList",
    title: "Upload",
    containers: containerUploadDemo,
  },
} satisfies TPageMaster;

export type PageKey = keyof typeof pages;
