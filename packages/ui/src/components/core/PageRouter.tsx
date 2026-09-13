import { useEffect, useMemo, type ReactElement, type ReactNode } from "react";
import { useRoutes, type RouteObject } from "react-router-dom";
import type { TModelMaster } from "../../model/master";
import type { HttpClientFactory } from "../../api";
import type { DataValue, NavigateTarget, TPageMaster } from "../@types";
import { Core } from "./core";
import { breadcrumbTrail, PagesProvider, usePageTitle } from "./pages";

export type PageRouterProps = {
  http: HttpClientFactory;
  model: TModelMaster;
  api: Record<string, any>;
  pages: TPageMaster;
  /** Rendered for paths no page matches (`*`). */
  notFound?: ReactNode;
  /** Mirror each page's `title` into `document.title`. Default `true`; off when embedding (a studio preview). */
  documentTitle?: boolean;
};

/** One mounted page: the memoized `Core` tree plus its `document.title`. */
function PageView({ title: rawTitle, setDocumentTitle, children }: { title?: string | DataValue; setDocumentTitle: boolean; children: ReactNode }) {
  const title = usePageTitle(rawTitle);
  useEffect(() => {
    if (!title || !setDocumentTitle) return;
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title, setDocumentTitle]);
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
export function PageRouter({ http, model, api, pages, notFound, documentTitle = true }: PageRouterProps): ReactElement | null {
  // The page elements (and their Core instances) depend only on the config.
  // `notFound` is kept out of this memo on purpose: consumers usually pass an
  // inline element, and rebuilding the pages on every parent render would
  // remount every Core — refetching loaders and tables each time.
  const pageRoutes = useMemo<RouteObject[]>(
    () =>
      Object.entries(pages).map(([key, page]) => ({
        path: page.path,
        element: (
          <PageView key={key} title={page.title} setDocumentTitle={documentTitle}>
            {new Core(http, model, api, page.containers).run()}
          </PageView>
        ),
      })),
    [http, model, api, pages, documentTitle]
  );
  const routes = useMemo<RouteObject[]>(
    () =>
      notFound !== undefined
        ? [...pageRoutes, { path: "*", element: <>{notFound}</> }]
        : pageRoutes,
    [pageRoutes, notFound]
  );

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
    // Breadcrumb hierarchy: unknown parents and cycles warn here, once.
    Object.keys(pages).forEach((k) => breadcrumbTrail(k, pages));
  }, [pages]);

  const element = useRoutes(routes);
  return <PagesProvider pages={pages}>{element}</PagesProvider>;
}
