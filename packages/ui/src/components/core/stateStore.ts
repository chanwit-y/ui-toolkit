import { create, type UseBoundStore, type StoreApi } from "zustand";

/**
 * Global state slice — one zustand store per unique key.
 *
 * The declarative engine keeps a *registry* of independent stores keyed by a
 * unique string (Container `load.key`). A loader writes the fetched object into
 * its key's store; input elements read-bind their initial value out of it via
 * `value:{ type:"state", key, path }`. Keeping one store per key (rather than a
 * single keyed object) means each slice updates/subscribes in isolation.
 */
export type StateSlice<T = any> = {
  /** The stored object (the path-drilled API response). `undefined` until loaded. */
  data: T | undefined;
  /** Replace the slice's data (used by the container loader). */
  setData: (data: T | undefined) => void;
  /** Reset the slice to empty (used on loader unmount). */
  clear: () => void;
};

export type StateStore<T = any> = UseBoundStore<StoreApi<StateSlice<T>>>;

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
      setData: (data) => set({ data }),
      clear: () => set({ data: undefined }),
    }));
    registry.set(key, store);
  }
  return store as StateStore<T>;
}

/** All store keys currently registered (mainly for debugging/tests). */
export function stateStoreKeys(): string[] {
  return [...registry.keys()];
}
