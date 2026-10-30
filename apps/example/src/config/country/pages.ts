import type { TPageMaster } from "@gummy-ui/ui";
import {
  containerCountryList,
  containerCountryStateDetail,
} from "./container";
import { containerColumnResizeDemo } from "./columnResizeDemo";
import { containerDataTableDemo } from "./dataTableDemo";
import { containerFormListDemo } from "./formListDemo";
import { containerFileCollectionDemo } from "./fileCollectionDemo";
import { containerHtmlColumnDemo } from "./htmlColumnDemo";
import { containerPaginationDemo } from "./paginationDemo";
import { containerRepeaterDemo } from "./repeaterDemo";
import { containerServerFilterDemo } from "./serverFilterDemo";
import { containerFilterApiDemo } from "./filterApiDemo";
import { containerCellTooltipDemo } from "./cellTooltipDemo";
import { containerTableLayoutDemo } from "./tableLayoutDemo";
import { containerFormatsDemo } from "./formatsDemo";
import { containerDataGridDemo } from "./dataGridDemo";
import { containerChartsDemo } from "./chartsDemo";
import { containerCardDemo } from "./cardDemo";
import { containerHtmlContentDemo } from "./htmlContentDemo";
import { containerDrawerDemo } from "./drawerDemo";
import { containerSwitchDemo } from "./switchDemo";
import { containerCustomActionsDemo } from "./customActionsDemo";
import { containerCustomComponentsDemo, customComponentsLoads } from "./customComponentsDemo";
import { containerUploadDemo } from "./uploadDemo";
import { containerPageDataDemo, pageDataLoads } from "./pageDataDemo";
import { approvalLineLoads, containerApprovalLineDemo } from "./approvalLineDemo";
import { containerWorkflowDemo, workflowLoads } from "./workflowDemo";
import { containerProfileDemo, profileLoads } from "./profileDemo";
import { containerAuthDemo } from "./authDemo";

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
  fileCollectionDemo: {
    // The `filecollection` tree: collections → folders → files with every
    // mutation slot, a bound card, and unwired / read-only variants
    // (see ./fileCollectionDemo.ts).
    path: "/file-collection",
    parent: "countryList",
    title: "File collection",
    containers: containerFileCollectionDemo,
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
  dataGridDemo: {
    // Columns menu, selection, style rules, grouping, CSV export, scroll mode
    // (see ./dataGridDemo.ts).
    path: "/data-grid",
    parent: "countryList",
    title: "Data grid",
    containers: containerDataGridDemo,
  },
  chartsDemo: {
    // The `chart` element: the ten types over `/collection/analytics/*`,
    // a reference line read off the response, click → page data
    // (see ./chartsDemo.ts).
    path: "/charts",
    parent: "countryList",
    title: "Charts",
    containers: containerChartsDemo,
  },
  formatsDemo: {
    // `ColumnDef.format`: number / currency / percent / date / datetime /
    // boolean cells formatted by the engine (see ./formatsDemo.ts).
    path: "/formats",
    parent: "countryList",
    title: "Cell formats",
    containers: containerFormatsDemo,
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
  drawerDemo: {
    // The `drawer` element after MUI's temporary Drawer: the four anchors, a
    // form drawer, a header-less nav drawer, a card trigger and OpenModal by
    // id (see ./drawerDemo.ts).
    path: "/drawer",
    parent: "countryList",
    title: "Drawer",
    containers: containerDrawerDemo,
  },
  switchDemo: {
    // The `switch` element after MUI's Switch: basics, label position, sizes /
    // variants, disabled + enabledWhen gating, and a required switch that a
    // Save button validates (see ./switchDemo.ts).
    path: "/switch",
    parent: "countryList",
    title: "Switch",
    containers: containerSwitchDemo,
  },
  customActionsDemo: {
    // Consumer-coded button actions (`src/actions.ts`, mounted through
    // `<ActionsProvider>` in App.tsx) named inline in action chains as
    // "fn:<name>" (see ./customActionsDemo.ts).
    path: "/custom-actions",
    parent: "countryList",
    title: "Custom actions",
    containers: containerCustomActionsDemo,
  },
  customComponentsDemo: {
    // Consumer-coded React components (`src/components/custom`, registered
    // through `<ComponentsProvider>` in App.tsx) placed by `custom` Bins
    // (see ./customComponentsDemo.ts).
    path: "/custom-components",
    parent: "countryList",
    title: "Custom components",
    loads: customComponentsLoads,
    containers: containerCustomComponentsDemo,
  },
  profileDemo: {
    // The `replaceprofile` + `switchprofile` elements over the mock profile
    // service, sharing the `profile` state slice (see ./profileDemo.ts).
    path: "/profile",
    parent: "countryList",
    title: "Profile",
    loads: profileLoads,
    containers: containerProfileDemo,
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
  pageDataDemo: {
    // Page-level loads (`loads`): four slices — one chained two deep — bound
    // by a card, a table's rows, a select's options, a field's initial value
    // and conditions (see ./pageDataDemo.ts). The crumb is the country's name.
    path: "/page-data/:code",
    parent: "countryList",
    title: { type: "state", key: "country", path: "name" },
    loads: pageDataLoads,
    containers: containerPageDataDemo,
  },
  approvalLineDemo: {
    // The `approvalline` element over a loaded request's raw workflow rows
    // (see ./approvalLineDemo.ts). The crumb is the request's title.
    path: "/approval-line/:id",
    parent: "countryList",
    title: { type: "state", key: "approval", path: "title" },
    loads: approvalLineLoads,
    containers: containerApprovalLineDemo,
  },
  authDemo: {
    // Azure SSO (see ./authDemo.ts): the `auth` / `me` slices the app's
    // <AzureAuth> publishes, SignIn / SignOut buttons and a custom action
    // reading the token.
    path: "/auth",
    parent: "countryList",
    title: "Auth",
    containers: containerAuthDemo,
  },
  workflowDemo: {
    // The `workfloweditor` element as a field of a form over a loaded
    // workflow config, saved with Save (see ./workflowDemo.ts).
    path: "/workflow/:id",
    parent: "countryList",
    title: { type: "state", key: "workflow", path: "name" },
    loads: workflowLoads,
    containers: containerWorkflowDemo,
  },
} satisfies TPageMaster;

export type PageKey = keyof typeof pages;
