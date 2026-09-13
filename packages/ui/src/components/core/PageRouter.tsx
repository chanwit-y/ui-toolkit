import { useEffect, useMemo, type ReactElement, type ReactNode } from "react";
import { useRoutes, type RouteObject } from "react-router-dom";
import type { TModelMaster } from "../../model/master";
import type { HttpClientFactory } from "../../api";
import type { NavigateTarget, TPageMaster } from "../@types";
import { Core } from "./core";
import { PagesProvider } from "./pages";

export type PageRouterProps = {
  http: HttpClientFactory;
  model: TModelMaster;
  api: Record<string, any>;
  pages: TPageMaster;
  /** Rendered for paths no page matches (`*`). */
  notFound?: ReactNode;
};

/** One mounted page: the memoized `Core` tree plus its `document.title`. */
function PageView({ title, children }: { title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
  return <>{children}</>;
}

/** Every `navigate` / `rowNavigate` target reachable in a config tree. */
function collectTargets(node: unknown, out: NavigateTarget[] = [], seen = new Set<unknown>()): NavigateTarget[] {
  if (!node || typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) {
    node.forEach((n) => collectTargets(n, out, seen));
    return out;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if ((k === "navigate" || k === "rowNavigate") && v && typeof v === "object" && "page" in v) {
      out.push(v as NavigateTarget);
    }
    collectTargets(v, out, seen);
  }
  return out;
}

/**
 * Config-driven routes: one `Core` per page in `pages`, matched by its `path`.
 * Router-agnostic — render it inside your own `<BrowserRouter>` /
 * `<MemoryRouter>` and wrap it in whatever layout or transition you like.
 * Navigating elements below it (`ButtonElement.navigate`,
 * `DataTableElement.rowNavigate`) resolve page keys through the provided
 * context; unknown keys are warned once at mount and again, harmlessly, on click.
 */
export function PageRouter({ http, model, api, pages, notFound }: PageRouterProps): ReactElement | null {
  const routes = useMemo<RouteObject[]>(() => {
    const list: RouteObject[] = Object.entries(pages).map(([key, page]) => ({
      path: page.path,
      element: (
        <PageView key={key} title={page.title}>
          {new Core(http, model, api, page.containers).run()}
        </PageView>
      ),
    }));
    if (notFound !== undefined) list.push({ path: "*", element: <>{notFound}</> });
    return list;
  }, [http, model, api, pages, notFound]);

  useEffect(() => {
    const known = new Set(Object.keys(pages));
    const unknown = new Set(
      collectTargets(Object.values(pages).map((p) => p.containers))
        .map((t) => t.page)
        .filter((p) => !known.has(p))
    );
    unknown.forEach((p) =>
      console.warn(`[gummy-ui] PageRouter: a navigate target points at unknown page "${p}".`)
    );
  }, [pages]);

  const element = useRoutes(routes);
  return <PagesProvider pages={pages}>{element}</PagesProvider>;
}
