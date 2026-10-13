import { get } from "lodash";
import { create, type UseBoundStore, type StoreApi } from "zustand";
import type { DataValue, LoadingMode } from "../@types";

/**
 * Global state slice — one zustand store per unique key.
 *
 * The declarative engine keeps a *registry* of independent stores keyed by a
 * unique string (Container `load.key`). A loader writes the fetched object into
 * its key's store; input elements read-bind their initial value out of it via
 * `value:{ type:"state", key, path }`. Keeping one store per key (rather than a
 * single keyed object) means each slice updates/subscribes in isolation.
 */
/**
 * Where a slice's loader is: `idle` (no loader, or not started), `held`
 * (waiting on a `:param` or another slice it reads), `loading` (a request in
 * flight — `data` may still hold the previous result), `success`, `error`.
 */
export type StateStatus = "idle" | "held" | "loading" | "success" | "error";

export type StateSlice<T = any> = {
  /** The stored object (the path-drilled API response). `undefined` until loaded. */
  data: T | undefined;
  status: StateStatus;
  /** The last failure, while `status` is `error`. */
  error: unknown;
  /** Replace the slice's data (used by the container loader). */
  setData: (data: T | undefined) => void;
  /** Replace data, status and error in one update (a page load's state change). */
  setLoad: (next: { data: T | undefined; status: StateStatus; error?: unknown }) => void;
  /** Reset the slice to empty (used on loader unmount). */
  clear: () => void;
};

/**
 * What a `$`-prefixed path reads off a slice instead of its `data`:
 * `$status`, `$error` (and `$error.message`, …). Every other path drills
 * `data`. Shared by conditions and anything else that reads a slice.
 */
export function readSlice(key: string, path?: string): unknown {
  const s = getStateStore(key).getState();
  if (path === "$status") return s.status;
  if (path === "$error") return s.error;
  if (path?.startsWith("$error.")) return get(s.error, path.slice("$error.".length));
  return path ? get(s.data, path) : s.data;
}

export type StateStore<T = any> = UseBoundStore<StoreApi<StateSlice<T>>>;

/**
 * Which loads draw skeletons: the `loading` mode of every page / global
 * load, by slice key. Registered by the builders when the page is assembled
 * (before anything renders) and again by each loader as it renders, so a
 * bound component can ask `skeletonPending` for the slice it reads. Never
 * dropped on unmount: the mode is config, and a page's unmount cleanup runs
 * after the next page — which may bind the same key — has already rendered.
 */
const loadingModes = new Map<string, LoadingMode>();

export function setLoadingMode(key: string, mode: LoadingMode): void {
  if (mode === "none") loadingModes.delete(key);
  else loadingModes.set(key, mode);
}

export function loadingModeOf(key: string): LoadingMode {
  return loadingModes.get(key) ?? "none";
}

/**
 * The slice keys a component's bindings may skeleton on: the `state`
 * bindings that read data — a `$status` / `$error` path is defined while
 * the load runs (it is what a status line shows), so it never skeletons.
 */
export function skeletonBindingKeys(dvs: (DataValue | undefined)[]): string[] {
  return [...new Set(dvs.filter((dv): dv is DataValue => dv?.type === "state" && !dv.path?.startsWith("$")).map((dv) => dv.key))];
}

/**
 * Whether a component bound to slice `key` should draw a skeleton: the load
 * is in `skeleton` mode and the slice has no data yet — not started, held
 * behind a `:param` / another slice, or on its first fetch. A refetch keeps
 * the previous data, so it never skeletons over content. Pure (tested).
 */
export function skeletonPending(slice: Pick<StateSlice, "data" | "status">, mode: LoadingMode): boolean {
  if (mode !== "skeleton") return false;
  if (slice.data !== undefined) return false;
  return slice.status === "idle" || slice.status === "held" || slice.status === "loading";
}

const registry = new Map<string, StateStore>();

/**
 * Get (or lazily create) the zustand store for `key`. The same instance is
 * returned for the lifetime of the app, so loaders and bindings that name the
 * same key share one slice — that is the "unique key" contract.
 */
export function getStateStore<T = any>(key: string): StateStore<T> {
  let store = registry.get(key);
  if (!store) {
    store = create<StateSlice<T>>((set) => ({
      data: undefined,
      status: "idle",
      error: undefined,
      setData: (data) => set({ data }),
      setLoad: ({ data, status, error }) => set({ data, status, error }),
      clear: () => set({ data: undefined, status: "idle", error: undefined }),
    }));
    registry.set(key, store);
  }
  return store as StateStore<T>;
}

/** All store keys currently registered (mainly for debugging/tests). */
export function stateStoreKeys(): string[] {
  return [...registry.keys()];
}
