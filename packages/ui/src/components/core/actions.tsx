import { createContext, useContext, type ReactNode } from "react";
import type { ActionFn, ButtonAction, CustomActionName, TActionMaster } from "../@types";

/**
 * Custom button actions (see the grilled custom-actions design): a registry
 * of consumer-coded functions, mounted once above the routes beside
 * `DataProvider` / `ThemeProvider`, that a config references inline in a
 * button's action chain as `"fn:<name>"`. Context rather than a prop on
 * `PageRouter` / `Core`, so nothing has to thread it through the nested
 * container builders (modal, drawer, popover, card, repeater, …) and a
 * button inside any portal reads it.
 *
 * ```tsx
 * const actions: TActionMaster = {
 *   increase: ({ form }) => form.setValue("count", (form.getValues().count ?? 0) + 1),
 *   checkStock: async ({ snackbar }) => { snackbar("warning", "Out of stock"); return false },
 * };
 * <ActionsProvider actions={actions}><PageRouter … /></ActionsProvider>
 * ```
 */
const ActionsContext = createContext<TActionMaster | null>(null);

export type ActionsProviderProps = {
  actions: TActionMaster;
  children: ReactNode;
};

export function ActionsProvider({ actions, children }: ActionsProviderProps) {
  return <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>;
}

/** The registry of the nearest `ActionsProvider`, or `null` when none is mounted. */
export function useActions(): TActionMaster | null {
  return useContext(ActionsContext);
}

export const CUSTOM_ACTION_PREFIX = "fn:";

/** Whether an `actions` entry names a custom function (`"fn:<name>"`). */
export function isCustomAction(action: ButtonAction): action is CustomActionName {
  return typeof action === "string" && action.startsWith(CUSTOM_ACTION_PREFIX);
}

/** `"fn:increase"` → `"increase"`. */
export function customActionName(action: CustomActionName): string {
  return action.slice(CUSTOM_ACTION_PREFIX.length);
}

/** `"increase"` → `"fn:increase"`. */
export function customAction(name: string): CustomActionName {
  return `${CUSTOM_ACTION_PREFIX}${name}`;
}

/**
 * The function registered under an action entry, or `undefined` (with a
 * console warning naming the button) when the registry has no such name or
 * no provider is mounted — the chain then skips the step and continues, so
 * a config authored ahead of its code (or previewed where the code doesn't
 * exist) still runs the rest.
 */
export function resolveCustomAction(
  registry: TActionMaster | null,
  action: CustomActionName,
  buttonLabel: string,
): ActionFn | undefined {
  const name = customActionName(action);
  const fn = registry?.[name];
  if (typeof fn === "function") return fn;
  console.warn(
    registry
      ? `[gummy-ui] Button "${buttonLabel}": no custom action "${name}" in the ActionsProvider registry — skipped.`
      : `[gummy-ui] Button "${buttonLabel}": "${action}" needs an <ActionsProvider> above the page — skipped.`,
  );
  return undefined;
}
