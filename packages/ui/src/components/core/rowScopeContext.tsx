import { createContext, useContext, useMemo, type ReactNode } from "react";

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
