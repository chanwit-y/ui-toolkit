import { create } from "zustand";
import type { UseFormReturn } from "react-hook-form";

/**
 * Engine debug mirror — a module-level store that surfaces runtime state that
 * otherwise lives inside the drawn tree, out of reach of external tooling:
 * the per-container react-hook-form instances (created inside
 * `ContainerRenderer`, wrapped in their own `FormProvider`), and the
 * `DataProvider`/`LoadingProvider` state that `Provider isRoot` creates
 * *inside* the engine tree. Providers register/mirror here so an inspector
 * rendered as a *sibling* of the engine (e.g. the studio Live Preview's
 * dev-tools panel) can subscribe without being a descendant.
 *
 * Always on: writes are reference swaps into one zustand store, and nothing
 * subscribes unless an inspector is open. Slots are keyed by a mount-unique
 * id (`useId`) so multiple engine roots (e.g. an app plus a preview) never
 * clobber each other; every registration cleans up on unmount.
 */

export type EngineDebugState = {
  /** Container form instances, keyed by `<container name>#<mount id>`. */
  forms: Record<string, UseFormReturn<any>>;
  /** Each mounted DataProvider's contextData, keyed by mount id. */
  contextData: Record<string, Record<string, any>>;
  /** Each mounted LoadingProvider's active loader ids, keyed by mount id. */
  loaders: Record<string, string[]>;
};

export const useEngineDebugStore = create<EngineDebugState>(() => ({
  forms: {},
  contextData: {},
  loaders: {},
}));

function setSlot<K extends keyof EngineDebugState>(
  section: K,
  key: string,
  value: EngineDebugState[K][string] | undefined,
) {
  useEngineDebugStore.setState((state) => {
    const next = { ...state[section] } as EngineDebugState[K];
    if (value === undefined) delete next[key];
    else next[key] = value;
    return { [section]: next } as Partial<EngineDebugState>;
  });
}

export const engineDebug = {
  registerForm: (key: string, form: UseFormReturn<any>) => setSlot("forms", key, form),
  unregisterForm: (key: string) => setSlot("forms", key, undefined),
  setContextData: (key: string, data: Record<string, any> | undefined) =>
    setSlot("contextData", key, data),
  setLoaders: (key: string, ids: string[] | undefined) => setSlot("loaders", key, ids),
};
