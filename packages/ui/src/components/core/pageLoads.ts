import type { ContainerLoad, DataValue, LoadingMode, PageLoad } from "../@types";
import { resolveDataValue, resolveDataValues, type DataValueScope } from "./dataValue";
import { stateKeys, urlParamNames } from "./readApi";

type Maps = Pick<ContainerLoad["api"], "params" | "query" | "body">;

/**
 * Resolve a load's request against `scope`, and say whether it must wait:
 * a `state` value it reads is still `undefined` (the slice it chains from
 * hasn't landed), or an endpoint URL `:param` has no value. Pure — tested
 * in `pageLoads.test.ts`.
 */
export function resolveLoadRequest(
  api: Maps,
  scope: DataValueScope,
  url: string | undefined,
): { query: Record<string, unknown>; params: Record<string, unknown>; body: Record<string, unknown>; held: boolean } {
  const query = resolveDataValues(api.query, scope);
  const params = resolveDataValues(api.params, scope);
  const body = resolveDataValues(api.body, scope);
  const waitsOnState = [api.params, api.query, api.body].some((m) =>
    Object.values(m ?? {}).some((dv: DataValue) => dv.type === "state" && resolveDataValue(dv, scope) === undefined),
  );
  const missingParam = urlParamNames(url).some((k) => params[k] === undefined || params[k] === "");
  return { query, params, body, held: waitsOnState || missingParam };
}

/**
 * How a load shows its wait (see {@link PageLoad.loading}): `loading` when
 * set, else the deprecated `blocking` flag → `cycle`, else `none`. A plain
 * {@link ContainerLoad} has neither and is `none`.
 */
export function loadingMode(load: ContainerLoad & Partial<Pick<PageLoad, "loading" | "blocking">>): LoadingMode {
  if (load.loading) return load.loading;
  return load.blocking ? "cycle" : "none";
}

/** Load keys each load reads through `state` DataValues. */
export function loadDependencies(loads: ContainerLoad[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const l of loads) out[l.key] = stateKeys(l.api.params, l.api.query, l.api.body);
  return out;
}

/**
 * Cycles among `loads` (A reads B, B reads A — every load on one would be held
 * forever), each as the key path that closes it. Only edges between these
 * loads count; a slice filled elsewhere isn't part of the graph.
 */
export function loadCycles(loads: ContainerLoad[]): string[][] {
  const deps = loadDependencies(loads);
  const keys = new Set(Object.keys(deps));
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const visit = (k: string, stack: string[]) => {
    const at = stack.indexOf(k);
    if (at >= 0) {
      const cycle = stack.slice(at);
      const sig = [...cycle].sort().join("|");
      if (!seen.has(sig)) {
        seen.add(sig);
        cycles.push([...cycle, k]);
      }
      return;
    }
    for (const d of deps[k] ?? []) if (keys.has(d)) visit(d, [...stack, k]);
  };
  for (const k of keys) visit(k, []);
  return cycles;
}

