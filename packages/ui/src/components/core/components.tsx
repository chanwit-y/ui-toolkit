import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { CustomComponentProps, TComponentMaster } from "../@types";

/**
 * Custom components (see the grilled custom-components design): a registry of
 * consumer-coded React components, mounted once above the routes beside
 * `ActionsProvider` / `ThemeProvider`, that a `custom` Bin references by name
 * (`element.component`). Context rather than a prop on `PageRouter` / `Core`,
 * so nothing threads it through the nested container builders and a component
 * inside any portal (modal, drawer, popover) reads it.
 *
 * ```tsx
 * const components: TComponentMaster = {
 *   StatBadge: ({ props, value }) => <span>{props.label}: {String(value)}</span>,
 * };
 * <ComponentsProvider components={components}><PageRouter … /></ComponentsProvider>
 * ```
 */
const ComponentsContext = createContext<TComponentMaster | null>(null);

export type ComponentsProviderProps = {
  components: TComponentMaster;
  children: ReactNode;
};

export function ComponentsProvider({ components, children }: ComponentsProviderProps) {
  return <ComponentsContext.Provider value={components}>{children}</ComponentsContext.Provider>;
}

/** The registry of the nearest `ComponentsProvider`, or `null` when none is mounted. */
export function useComponents(): TComponentMaster | null {
  return useContext(ComponentsContext);
}

/**
 * The component registered under `name`, or `undefined` (with a console
 * warning) when the registry has no such name or no provider is mounted —
 * the cell then draws the `CustomComponentPlaceholder`, so a config authored
 * ahead of its code (or previewed where the code doesn't exist) shows *where*
 * the component goes instead of a hole in the layout.
 */
export function resolveCustomComponent(
  registry: TComponentMaster | null,
  name: string,
): ComponentType<CustomComponentProps<any, any>> | undefined {
  const comp = registry?.[name];
  if (typeof comp === "function" || (comp && typeof comp === "object")) return comp;
  console.warn(
    registry
      ? `[gummy-ui] Custom component "${name}" is not in the ComponentsProvider registry — placeholder drawn.`
      : `[gummy-ui] Custom component "${name}" needs a <ComponentsProvider> above the page — placeholder drawn.`,
  );
  return undefined;
}
