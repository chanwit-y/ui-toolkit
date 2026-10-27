import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { useRoutes, type RouteObject } from "react-router-dom";
import { Button } from "@radix-ui/themes";
import type { TModelMaster } from "../../model/master";
import type { HttpClientFactory } from "../../api";
import type { DataValue, GummyPageBody, NavigateTarget, PageEntry, PageTransition, TPageEntries } from "../@types";
import { Icon } from "../Icon";
import { Core } from "./core";
import { breadcrumbTrail, PagesProvider, usePageTitle } from "./pages";
import { loadCycles } from "./pageLoads";
import { fetchPageLoader, PageBodyCache, type PageBodyLoader } from "./pageBodies";
import { PageEnter, PageEnterGate, usePageTransition } from "./pageTransition";

export type PageRouterProps = {
  http: HttpClientFactory;
  model: TModelMaster;
  api: Record<string, any>;
  /** The pages: inline bodies, split ones (`src`, loaded on the first visit through `loadPage`), or a mix. */
  pages: TPageEntries;
  /**
   * Loads a split page's body (`page.src`, relative to the project document).
   * Default: `fetchPageLoader()` — `fetch` from the site root. The starter
   * passes `globPageLoader(import.meta.glob(…))` so each page is a chunk.
   */
  loadPage?: PageBodyLoader;
  /** Shown while a split page's body loads (inside the shell). Default: a centred spinner. */
  pageFallback?: ReactNode;
  /** How a page enters on a pathname change. Default: the enclosing `AppShell`'s `pageTransition`, else none. */
  pageTransition?: PageTransition;
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

/** The default `pageFallback`: a centred spinner in the Radix accent. */
export function PageLoadingFallback() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[12rem] w-full items-center justify-center">
      <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--gray-6)] border-t-[var(--accent-9)]" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

/** A split page whose file failed to load: the shell stays, the page offers a retry. */
function PageLoadError({ pageKey, error, onRetry }: { pageKey: string; error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div
      role="alert"
      className="mx-auto my-10 flex max-w-md flex-col items-center gap-3 rounded-lg border border-[var(--gray-6)] gummy-surface p-6 text-center text-[var(--gray-12)]"
    >
      <Icon icon="alertTriangle" size={28} className="text-[var(--amber-11)]" />
      <p className="text-base font-semibold">Couldn’t load this page</p>
      <p className="break-words text-sm text-[var(--gray-11)]">
        {/* The library's loaders already name the page; a bare network error doesn't. */}
        {message.includes(`"${pageKey}"`) ? (
          message
        ) : (
          <>
            Page <span className="font-mono">{pageKey}</span>: {message}
          </>
        )}
      </p>
      <Button variant="soft" onClick={onRetry}>
        <Icon icon="refresh" size={14} />
        Retry
      </Button>
    </div>
  );
}

/** Warnings about one page's own config: load cycles, two loads on one key. */
function checkPageLoads(key: string, body: { containers?: GummyPageBody["containers"]; loads?: GummyPageBody["loads"] }) {
  const loads = body.loads ?? [];
  for (const c of loadCycles(loads))
    console.warn(`[gummy-ui] Page "${key}": loads wait on each other and never fire: ${c.join(" → ")}.`);
  const keys = [...loads.map((l) => l.key), ...(body.containers ?? []).flatMap((c) => (c.load ? [c.load.key] : []))];
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  for (const d of new Set(dup)) console.warn(`[gummy-ui] Page "${key}": more than one load writes the state key "${d}".`);
}

function warnUnknownTargets(containers: unknown, known: Set<string>, where: string) {
  const unknown = new Set(collectTargets(containers).map((t) => t.page).filter((p) => !known.has(p)));
  unknown.forEach((p) => console.warn(`[gummy-ui] ${where}: a navigate target points at unknown page "${p}".`));
}

type BuildPage = (key: string, body: GummyPageBody, split: boolean) => ReactElement;

/** Warms a split page's body before it is visited (menu hover, a likely next step). Inline pages resolve at once. */
const PrefetchContext = createContext<(key: string) => Promise<void>>(() => Promise.resolve());

/** `prefetchPage(key)` from the enclosing `PageRouter`: loads a split page's file ahead of its visit. */
export function usePrefetchPage(): (key: string) => Promise<void> {
  return useContext(PrefetchContext);
}

type Enter = { transition?: PageTransition; gate: PageEnterGate };

/** A split page: suspends until its file is in, then builds it once (and only then animates in). */
function SplitPage({ pageKey, src, build, cache, enter }: { pageKey: string; src: string; build: BuildPage; cache: PageBodyCache; enter: Enter }) {
  const [, setAttempt] = useState(0);
  const entry = cache.read(pageKey, src);
  if (entry.status === "pending") throw entry.promise;
  if (entry.status === "error")
    return (
      <PageLoadError
        pageKey={pageKey}
        error={entry.error}
        onRetry={() => {
          cache.retry(pageKey, src);
          setAttempt((n) => n + 1);
        }}
      />
    );
  return (
    <PageEnter transition={enter.transition} gate={enter.gate}>
      {build(pageKey, entry.body, true)}
    </PageEnter>
  );
}

/** The routed element: inline pages build synchronously on the first visit, split ones behind Suspense. */
function RoutedPage({ pageKey, page, build, cache, fallback, enter }: { pageKey: string; page: PageEntry; build: BuildPage; cache: PageBodyCache; fallback: ReactNode; enter: Enter }) {
  if (page.containers)
    return (
      <PageEnter transition={enter.transition} gate={enter.gate}>
        {build(pageKey, { containers: page.containers, loads: page.loads }, false)}
      </PageEnter>
    );
  return (
    <Suspense fallback={fallback}>
      <SplitPage pageKey={pageKey} src={page.src ?? ""} build={build} cache={cache} enter={enter} />
    </Suspense>
  );
}

let defaultLoader: PageBodyLoader | null = null;

/**
 * Config-driven routes: one `Core` per page in `pages`, matched by its `path`.
 * Router-agnostic — render it inside your own `<BrowserRouter>` /
 * `<MemoryRouter>` and wrap it in whatever layout or transition you like.
 * Navigating elements below it (`ButtonElement.navigate`,
 * `DataTableElement.rowNavigate`) resolve page keys through the provided
 * context; unknown keys are warned once at mount and again, harmlessly, on click.
 *
 * Pages are built **lazily** (see the grilled design `split-pages-lazy-load`):
 * a page's `Core` is constructed on its first visit and kept for the life of
 * the router, so an app with hundreds of pages pays only for the routes
 * table up front. Every page shares one `ApiMaster` (`sharedApiMaster`). A
 * page entry with `src` instead of `containers` is loaded through `loadPage`
 * on its first visit, with `pageFallback` meanwhile and a retry card on failure.
 */
export function PageRouter({ http, model, api, pages, loadPage, pageFallback, pageTransition, notFound, documentTitle = true }: PageRouterProps): ReactElement | null {
  // One gate per router: no animation on the first page shown, then one per pathname change.
  const transition = usePageTransition(pageTransition);
  const gate = useMemo(() => new PageEnterGate(), []);
  const enter = useMemo<Enter>(() => ({ transition, gate }), [transition, gate]);
  const loader = loadPage ?? (defaultLoader ??= fetchPageLoader());
  const cache = useMemo(() => new PageBodyCache(loader), [loader]);
  const known = useMemo(() => new Set(Object.keys(pages)), [pages]);

  // Built page trees by key — one `Core` per page, constructed on its first
  // visit and kept, so a revisit (or a parent re-render) gets the same tree
  // and doesn't remount every loader and table. A new config starts afresh.
  const built = useMemo(() => new Map<string, ReactElement>(), [http, model, api, pages]);
  const build = useCallback<BuildPage>(
    (key, body, split) => {
      let element = built.get(key);
      if (!element) {
        // Inline pages were checked at mount; a split page's config is first seen here.
        if (split) {
          warnUnknownTargets(body.containers, known, `Page "${key}"`);
          checkPageLoads(key, body);
        }
        element = new Core(http, model, api, body.containers, body.loads).run();
        built.set(key, element);
      }
      return element;
    },
    [built, http, model, api, known],
  );

  const fallback = pageFallback ?? <PageLoadingFallback />;
  // Route entries are cheap now (the trees are built on demand), so an inline `notFound` / `pageFallback` is fine here.
  const routes = useMemo<RouteObject[]>(() => {
    const pageRoutes: RouteObject[] = Object.entries(pages).map(([key, page]) => ({
      path: page.path,
      element: (
        <PageView key={key} title={page.title} setDocumentTitle={documentTitle}>
          <RoutedPage pageKey={key} page={page} build={build} cache={cache} fallback={fallback} enter={enter} />
        </PageView>
      ),
    }));
    return notFound !== undefined ? [...pageRoutes, { path: "*", element: <>{notFound}</> }] : pageRoutes;
  }, [pages, documentTitle, build, cache, fallback, notFound, enter]);

  const prefetch = useCallback(
    (key: string) => {
      const page = pages[key];
      return page?.src && !page.containers ? cache.prefetch(key, page.src) : Promise.resolve();
    },
    [pages, cache],
  );

  useEffect(() => {
    // Inline pages are checked up front (after paint); split pages when their file arrives.
    const inline = Object.entries(pages).filter(([, p]) => p.containers);
    warnUnknownTargets(inline.map(([, p]) => p.containers), known, "PageRouter");
    // Breadcrumb hierarchy: unknown parents and cycles warn here, once.
    Object.keys(pages).forEach((k) => breadcrumbTrail(k, pages));
    for (const [k, page] of inline) checkPageLoads(k, page);
  }, [pages, known]);

  const element = useRoutes(routes);
  return (
    <PagesProvider pages={pages}>
      <PrefetchContext.Provider value={prefetch}>{element}</PrefetchContext.Provider>
    </PagesProvider>
  );
}
