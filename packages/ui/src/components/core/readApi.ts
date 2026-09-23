import { useEffect, useReducer } from "react";
import { useInRouterContext, useParams, useSearchParams } from "react-router-dom";
import type { ApiSegments, APIFunction, DataValue } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";
import { getStateStore } from "./stateStore";
import type { DataValueScope } from "./dataValue";

type Row = Record<string, any>;

/** Global-state keys a set of DataValue maps read from (to re-resolve on change). */
export function stateKeys(...maps: (Record<string, DataValue> | undefined)[]): string[] {
  const keys = new Set<string>();
  for (const m of maps) for (const dv of Object.values(m ?? {})) if (dv.type === "state") keys.add(dv.key);
  return [...keys];
}

/** Re-render when any of the named global-state slices change. */
export function useStateVersion(keys: string[]): number {
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const sig = keys.join("|");
  useEffect(() => {
    const unsubs = keys.map((k) => getStateStore(k).subscribe(() => bump()));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return version;
}

const NO_ROUTE: Pick<DataValueScope, "params" | "searchParams"> = {};

function useRoutedScope(): Pick<DataValueScope, "params" | "searchParams"> {
  const params = useParams();
  const [searchParams] = useSearchParams();
  return { params, searchParams };
}

/**
 * The route half of a {@link DataValueScope}, for components that may also be
 * mounted outside a router (a hand-wired `DataTable2`): there `type:"url"`
 * values simply don't resolve. Whether a router is above is fixed for the life
 * of a mount, so the branch keeps hook order stable.
 */
export function useRouteScope(): Pick<DataValueScope, "params" | "searchParams"> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useInRouterContext() ? useRoutedScope() : NO_ROUTE;
}

/**
 * Positional args for a built API caller: the declared segments in
 * (query, param, body) order. Without `segments` (a hand-wired function) fall
 * back to the editable table's convention — `(params, body)` when there are
 * params, else `(body)`.
 */
export function callArgs(
  segments: ApiSegments | undefined,
  query: Row,
  params: Row,
  body: Row | undefined,
): unknown[] {
  if (segments) {
    const args: unknown[] = [];
    if (segments.query) args.push(query);
    if (segments.parameter) args.push(params);
    if (segments.body) args.push(body ?? {});
    return args;
  }
  const hasParams = Object.keys(params).length > 0;
  if (body === undefined) return hasParams ? [params] : [query];
  return hasParams ? [params, body] : [body];
}

/** `:param` placeholders of an endpoint URL. */
export function urlParamNames(url: string | undefined): string[] {
  if (!url) return [];
  return [...url.matchAll(/:([A-Za-z_$][A-Za-z0-9_$]*)/g)].map((m) => m[1]);
}

/**
 * An API name resolved against the ApiMaster: the built caller, its declared
 * segments (so args line up with `ApiFactory`'s positional order) and its URL.
 */
export function resolveApiRef<M extends TModelMaster, A extends TApiMaster<M>>(
  context: ElementContext<M, A>,
  name: string | undefined,
): { api: APIFunction; segments: ApiSegments; url?: string } | undefined {
  if (!name) return undefined;
  const api = context.apis?.api?.[name] as APIFunction | undefined;
  const info = context.apiList?.[name] as
    | { url?: string; query?: unknown; parameter?: unknown; body?: unknown }
    | undefined;
  if (!api || !info) return undefined;
  return {
    api,
    url: info.url,
    segments: { query: !!info.query, parameter: !!info.parameter, body: !!info.body },
  };
}
