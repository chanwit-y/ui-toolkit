import { get } from "lodash";
import type { DataValue } from "../@types";
import { getStateStore } from "./stateStore";

/** Sources available when resolving a {@link DataValue} at render time. */
export type DataValueScope = {
  /** Route path params (react-router `useParams()`). */
  params?: Record<string, string | undefined>;
  /** Query-string params (react-router `useSearchParams()[0]`). */
  searchParams?: URLSearchParams;
  /**
   * The current row, for `type:"row"`: the clicked data-table row
   * (`rowNavigate`) or the item a `repeater` is rendering. An item of a
   * primitive array is the primitive itself.
   */
  row?: unknown;
  /**
   * A data table's applied filter values, for `type:"filter"`: field name →
   * value of the table's `filterContainer` form (see `DataTableElement`).
   */
  filters?: Record<string, unknown>;
};

/**
 * A filter left blank: `""`, `null`, `undefined` or an empty array. `false`
 * and `0` are real values (a checkbox filter, a numeric one).
 */
export function isEmptyFilterValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Resolve a single {@link DataValue} to a concrete value.
 *
 * - `value`  → the literal `value`.
 * - `url`    → a route param (`source:"param"`, default) or query param
 *              (`source:"query"`) named by `key`.
 * - `state`  → the global-state slice named `key`, drilled by `path`.
 * - `row`    → `scope.row[key]` (drilled by `path` when given); `key:"none"`
 *              takes the row itself (an item of a primitive array, say).
 * - `filter` → `scope.filters[key]` (drilled by `path` when given). A blank
 *              filter falls back to the DataValue's `value`; without one it is
 *              `undefined`, so the key is left out of the request.
 * - others   → `undefined` (not resolvable from this scope).
 */
export function resolveDataValue(
  dv: DataValue,
  scope: DataValueScope = {}
): unknown {
  switch (dv.type) {
    case "value":
      return dv.value;
    case "url": {
      const raw =
        dv.source === "query"
          ? scope.searchParams?.get(dv.key) ?? undefined
          : scope.params?.[dv.key];
      return raw;
    }
    case "state": {
      const data = getStateStore(dv.key).getState().data;
      return dv.path ? get(data, dv.path) : data;
    }
    case "row": {
      if (scope.row === undefined || scope.row === null) return undefined;
      const v =
        dv.key === "none"
          ? scope.row
          : (scope.row as Record<string, unknown>)[dv.key];
      return dv.path ? get(v, dv.path) : v;
    }
    case "filter": {
      const raw = scope.filters?.[dv.key];
      const v = dv.path ? get(raw, dv.path) : raw;
      return isEmptyFilterValue(v) ? dv.value : v;
    }
    default:
      return undefined;
  }
}

/**
 * Resolve a map of {@link DataValue}s (e.g. an API config's `params`/`query`/
 * `body`) into a plain object of concrete values, dropping `undefined` entries.
 */
export function resolveDataValues(
  map: Record<string, DataValue> | undefined,
  scope: DataValueScope = {}
): Record<string, unknown> {
  if (!map) return {};
  return Object.entries(map).reduce((acc, [k, dv]) => {
    const v = resolveDataValue(dv, scope);
    if (v !== undefined) acc[k] = v;
    return acc;
  }, {} as Record<string, unknown>);
}

/** Drill a response object along a `paths` array (same semantics as DataTable). */
export function drillPaths(source: unknown, paths: string[] | undefined): unknown {
  if (!paths || paths.length === 0) return source;
  let cur: any = source;
  for (const p of paths) cur = cur?.[p];
  return cur;
}
