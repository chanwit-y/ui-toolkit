import { useEffect, useMemo, type ReactElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiFactory, type HttpClientFactory } from "../../api";
import { ApiMaster, type TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { PageLoad } from "../@types";
import { LoadingProvider } from "../context";
import { SnackbarProvider } from "../Snackbar";
import { queryClient } from "./context";
import { loadCycles } from "./pageLoads";
import { StateLoader } from "./stateLoader";

export type GlobalLoadsProps = {
  http: HttpClientFactory;
  model: TModelMaster;
  api: Record<string, any>;
  /** App-wide loads: fetched once, kept for the life of this component. */
  loads: PageLoad[];
};

/**
 * App-wide data loads (see the grilled page-data design): the same
 * `PageLoad`s a page declares, but fetched once when the app starts and kept
 * across every page — the current user, lookup lists. Each lands in the
 * global-state slice `key`, readable from any page with `{ type: "state" }`
 * DataValues / `source: "state"` conditions, and page loads may chain off
 * them. Mount it once, above your routes and outside anything keyed by the
 * route (a page transition would refetch it on every navigation). It sits
 * above the routes, so a URL `:param` never resolves here — query strings,
 * literals and other slices do. Renders nothing.
 */
export function GlobalLoads({ http, model, api, loads }: GlobalLoadsProps): ReactElement {
  const apis = useMemo(
    () => new ApiMaster(model, api as TApiMaster<TModelMaster>, new ApiFactory(http, {})),
    [http, model, api],
  );

  useEffect(() => {
    for (const c of loadCycles(loads))
      console.warn(`[gummy-ui] GlobalLoads: loads wait on each other and never fire: ${c.join(" → ")}.`);
    const keys = loads.map((l) => l.key);
    for (const d of new Set(keys.filter((k, i) => keys.indexOf(k) !== i)))
      console.warn(`[gummy-ui] GlobalLoads: more than one load writes the state key "${d}".`);
  }, [loads]);

  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <SnackbarProvider>
          {loads.map((l) => (
            <StateLoader key={`global-load-${l.key}`} load={l} apis={apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>} />
          ))}
        </SnackbarProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}
