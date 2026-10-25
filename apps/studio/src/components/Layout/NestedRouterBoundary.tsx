import type { ContextType, ReactNode } from 'react'
import { UNSAFE_LocationContext, UNSAFE_NavigationContext, UNSAFE_RouteContext } from 'react-router-dom'

/**
 * Resets react-router's contexts so a `MemoryRouter` can mount inside the
 * studio's `BrowserRouter` (the `Router` invariant only checks that no
 * location context is above it; the route context reset keeps the nested
 * `useRoutes` from prefixing the studio's `/p/:projectId/...` path).
 */
export function NestedRouterBoundary({ children }: { children: ReactNode }) {
  return (
    <UNSAFE_LocationContext.Provider
      value={null as unknown as ContextType<typeof UNSAFE_LocationContext>}
    >
      <UNSAFE_NavigationContext.Provider
        value={null as unknown as ContextType<typeof UNSAFE_NavigationContext>}
      >
        <UNSAFE_RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
          {children}
        </UNSAFE_RouteContext.Provider>
      </UNSAFE_NavigationContext.Provider>
    </UNSAFE_LocationContext.Provider>
  )
}
