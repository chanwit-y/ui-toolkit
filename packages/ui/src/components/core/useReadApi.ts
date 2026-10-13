import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { FormListReadApi } from "../@types";
import { drillPaths, resolveDataValues, type DataValueScope } from "./dataValue";
import { callArgs, stateKeys, useRouteScope, useStateVersion } from "./readApi";
import { useRowScope } from "./rowScope";
import { useStord } from "./stord";

/**
 * One component's own read API (a resolved {@link FormListReadApi}), the way
 * the repeater and the approval line fetch: DataValue `params` / `query` /
 * `body` resolved against the URL, global state and the enclosing repeater
 * item, the call **held** until every URL `:param` resolves, refetched when
 * any of them changes (they're in the query key), the response drilled by
 * `api.paths`, and the refetch registered under `name` for `ReloadDataTable`.
 * `undefined` `api` ⇒ nothing fetched (the component reads something in scope).
 */
export function useReadApi(name: string, api: FormListReadApi | undefined) {
  const route = useRouteScope();
  const parent = useRowScope();
  const updateFnCtxs = useStord((state) => state.updateFnCtxs);

  const scope = useMemo<DataValueScope>(
    () => ({ ...route, row: parent?.row }),
    [route, parent],
  );
  const stateVersion = useStateVersion(stateKeys(api?.params, api?.query, api?.body));

  const readArgs = useMemo(() => {
    if (!api) return { args: [] as unknown[], ready: false };
    const q = resolveDataValues(api.query, scope);
    const p = resolveDataValues(api.params, scope);
    const b = resolveDataValues(api.body, scope);
    const ready = (api.urlParams ?? []).every((k) => p[k] !== undefined && p[k] !== "");
    return { args: callArgs(api.segments, q, p, api.segments?.body || api.body ? b : undefined), ready };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, scope, stateVersion]);

  const query = useQuery({
    queryKey: [`read-${name}`, readArgs.args],
    queryFn: async () => {
      const res = await (api!.api as (...a: unknown[]) => Promise<unknown>)(...readArgs.args);
      return drillPaths(res, api!.paths);
    },
    enabled: !!api && readArgs.ready,
  });

  const { refetch } = query;
  useEffect(() => {
    if (api) updateFnCtxs(name, refetch);
  }, [api, name, updateFnCtxs, refetch]);

  return { ...query, held: !!api && !readArgs.ready };
}
