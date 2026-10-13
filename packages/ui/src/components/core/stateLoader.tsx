import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { APIFunction, PageLoad } from "../@types";
import { useLoading } from "../context/LoadingProvider";
import { useSnackbar } from "../Snackbar";
import { drillPaths } from "./dataValue";
import { callArgs, stateKeys, useRouteScope, useStateVersion } from "./readApi";
import { resolveLoadRequest } from "./pageLoads";
import { getStateStore, type StateStatus } from "./stateStore";
import { useStord } from "./stord";

type StateLoaderProps = {
  load: PageLoad;
  apis: ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;
};

/**
 * Renders nothing. Fires `load.api` through the typed caller (args in the
 * endpoint's declared query / param / body order), drills `load.api.paths`
 * and writes data + status into the `load.key` global-state slice. Params
 * resolve against the URL and other slices; the request is held until they
 * all resolve and refetches when they change, keeping the previous data while
 * it does. The refetch is registered under the key (`reloadDataTable`), the
 * slice is cleared on unmount. Serves both `Container.load` and
 * `PageElement.loads`.
 */
export function StateLoader({ load, apis }: StateLoaderProps) {
  const route = useRouteScope();
  const { startLoading, stopLoading } = useLoading();
  const { showSnackbar } = useSnackbar();
  const updateFnCtxs = useStord((s) => s.updateFnCtxs);

  const name = load.api.name;
  const api = apis.api[name as keyof typeof apis.api] as APIFunction | undefined;
  const info = apis.apis[name] as { url?: string; query?: unknown; parameter?: unknown; body?: unknown } | undefined;

  // Nothing resolves before the first commit: when a page remounts (a
  // consumer keying its outlet by pathname), the outgoing loaders' slices
  // still hold the previous page's data during this render and are cleared by
  // their unmount cleanup, which React runs before these mount effects — a
  // chained load reading them now would fire one stale request.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const stateVersion = useStateVersion(stateKeys(load.api.params, load.api.query, load.api.body));
  const request = useMemo(() => {
    if (!mounted) return { held: true, args: [] as unknown[] };
    const r = resolveLoadRequest(load.api, route, info?.url);
    const segments = info ? { query: !!info.query, parameter: !!info.parameter, body: !!info.body } : undefined;
    return { held: r.held, args: callArgs(segments, r.query, r.params, segments?.body ? r.body : undefined) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, load, JSON.stringify(route.params), route.searchParams?.toString(), stateVersion, info]);

  useEffect(() => {
    if (!api) console.warn(`[gummy-ui] load "${load.key}": unknown API "${name}".`);
  }, [api, load.key, name]);

  const query = useQuery({
    queryKey: [`state-load-${load.key}`, name, request.args],
    queryFn: async () => {
      const res = await (api as (...a: unknown[]) => Promise<unknown>)(...request.args);
      return drillPaths(res, load.api.paths);
    },
    enabled: !!api && !request.held,
    placeholderData: keepPreviousData,
    retry: false,
  });

  // Held means what it reads is gone (the slice it chains from failed or
  // cleared, a `:param` left the URL): the previous result belongs to other
  // inputs, so it is not kept — unlike a refetch, which keeps it meanwhile.
  const status: StateStatus = !api
    ? "idle"
    : request.held
      ? "held"
      : query.isFetching
        ? "loading"
        : query.isError
          ? "error"
          : query.isSuccess
            ? "success"
            : "idle";
  const data = request.held ? undefined : query.data;

  useEffect(() => {
    getStateStore(load.key).getState().setLoad({
      data,
      status,
      error: status === "error" ? query.error : undefined,
    });
  }, [load.key, data, status, query.error]);

  const { refetch } = query;
  useEffect(() => {
    updateFnCtxs(load.key, () => refetch());
  }, [load.key, refetch, updateFnCtxs]);

  // Blocking: the page overlay while a request is in flight.
  const loaderId = useRef<string | undefined>(undefined);
  const busy = !!load.blocking && status === "loading";
  useEffect(() => {
    if (busy) loaderId.current = startLoading();
    return () => {
      if (loaderId.current) stopLoading(loaderId.current);
      loaderId.current = undefined;
    };
  }, [busy, startLoading, stopLoading]);

  // One snackbar per failure (errorUpdatedAt changes on each new failure).
  useEffect(() => {
    if (!query.isError) return;
    const message = load.errorMessage ?? (load.blocking ? `Couldn't load ${load.key}.` : undefined);
    if (message) showSnackbar({ variant: "error", message });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isError, query.errorUpdatedAt]);

  useEffect(
    () => () => {
      getStateStore(load.key).getState().clear();
    },
    [load.key],
  );

  return null;
}
