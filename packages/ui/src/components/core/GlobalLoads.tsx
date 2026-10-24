import { useEffect, useMemo, type ReactElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { HttpClientFactory } from "../../api";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { PageLoad } from "../@types";
import { LoadingProvider } from "../context";
import { SnackbarProvider } from "../Snackbar";
import { queryClient } from "./context";
import { loadCycles, loadingMode } from "./pageLoads";
import { sharedApiMaster } from "./sharedApiMaster";
import { StateLoader } from "./stateLoader";
import { setLoadingMode } from "./stateStore";

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
  // The same instance the pages use when given the same config objects.
  const apis = useMemo(() => sharedApiMaster(http, model, api), [http, model, api]);

  // The loading modes are known before anything bound to the slices renders.
  useMemo(() => loads.forEach((l) => setLoadingMode(l.key, loadingMode(l))), [loads]);

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
