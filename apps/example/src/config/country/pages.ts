import type { TPageMaster } from "@gummy-ui/ui";
import {
  containerCountryList,
  containerCountryStateDetail,
} from "./container";

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
  },
  countryDetail: {
    // `:id` feeds the container's state loader (`{ type: "url", key: "id" }`).
    // `?next=` is read by the "Next country" button's replace-navigation.
    path: "/country/:id",
    title: "Country",
    containers: containerCountryStateDetail,
  },
} satisfies TPageMaster;

export type PageKey = keyof typeof pages;
