import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { DataValue } from "../@types";
import { resolveDataValue } from "./dataValue";
import { getStateStore } from "./stateStore";

/** The item a `repeater` is rendering, and its position in the array. */
export type RowScope = { row: unknown; index: number };

const RowScopeContext = createContext<RowScope | null>(null);

/**
 * Puts one item in scope for everything beneath it: `type:"row"`
 * {@link DataValue}s (display bindings, `Navigate` params) resolve against it.
 * A nested provider replaces the outer one — bindings read the nearest item.
 */
export function RowScopeProvider({ row, index, children }: RowScope & { children: ReactNode }) {
  const value = useMemo(() => ({ row, index }), [row, index]);
  return <RowScopeContext.Provider value={value}>{children}</RowScopeContext.Provider>;
}

/** The nearest enclosing item, or `null` outside a repeater. */
export function useRowScope(): RowScope | null {
  return useContext(RowScopeContext);
}

/**
 * A {@link DataValue} resolved at render time against the URL, global state
 * and the enclosing item. A `state` value re-renders when its slice changes.
 * `undefined` for no binding — callers fall back to their static prop.
 */
export function useDataValue(dv: DataValue | undefined): unknown {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const scope = useRowScope();
  const stateKey = dv?.type === "state" ? dv.key : undefined;
  const store = useMemo(() => (stateKey !== undefined ? getStateStore(stateKey) : null), [stateKey]);
  const subscribe = useCallback((cb: () => void) => (store ? store.subscribe(cb) : () => {}), [store]);
  const getSnapshot = useCallback(
    () => (dv ? resolveDataValue(dv, { params, searchParams, row: scope?.row }) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(dv), JSON.stringify(params), searchParams.toString(), scope?.row]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** A resolved value as display text; `undefined` when there is nothing to show. */
export function displayText(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return undefined;
  return String(value);
}
