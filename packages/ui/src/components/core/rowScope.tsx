import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { DataValue } from "../@types";
import { resolveDataValue } from "./dataValue";
import { useRowScope } from "./rowScopeContext";
import { useFormula } from "./logic";
import { getStateStore, loadingModeOf, skeletonBindingKeys, skeletonPending } from "./stateStore";

export { RowScopeProvider, useRowScope, type RowScope } from "./rowScopeContext";

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
  const resolved = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // A formula's raw result (its formatted text is `useDisplayValue`'s).
  const formula = useFormula(dv);
  return formula.active ? formula.value : resolved;
}

/**
 * Whether a component bound through any of `dvs` should draw a skeleton
 * instead of its content: some `state` binding reads a slice whose load is in
 * `skeleton` mode and still has no data (see `skeletonPending`). Bindings of
 * any other type, and `$status` / `$error` paths, never skeleton. Re-renders
 * as the slices change.
 */
export function useSkeleton(...dvs: (DataValue | undefined)[]): boolean {
  const keys = skeletonBindingKeys(dvs);
  const sig = keys.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slices = useMemo(() => keys.map((key) => ({ key, store: getStateStore(key) })), [sig]);
  const subscribe = useCallback(
    (cb: () => void) => {
      const unsubs = slices.map((s) => s.store.subscribe(cb));
      return () => unsubs.forEach((u) => u());
    },
    [slices],
  );
  const getSnapshot = useCallback(
    () => slices.some((s) => skeletonPending(s.store.getState(), loadingModeOf(s.key))),
    [slices],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** A resolved value as display text; `undefined` when there is nothing to show. */
export function displayText(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return undefined;
  return String(value);
}

/**
 * A bound value as display text: a formula through its `format` (`—` with
 * the reason in `error` when it fails), anything else via `displayText`.
 */
export function useDisplayValue(dv: DataValue | undefined): { text?: string; error?: string } {
  const formula = useFormula(dv);
  const raw = useDataValue(formula.active ? undefined : dv);
  if (formula.active) return formula.error ? { text: "—", error: formula.error } : { text: formula.text || undefined };
  return { text: displayText(raw) };
}
