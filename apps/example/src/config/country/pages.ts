import type { TPageMaster } from "@gummy-ui/ui";
import {
  containerCountryList,
  containerCountryStateDetail,
} from "./container";
import { containerFormListDemo } from "./formListDemo";
import { containerRepeaterDemo } from "./repeaterDemo";
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
