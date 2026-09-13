import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { generatePath, matchRoutes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { DataValue, NavigateTarget, PageElement, TPageMaster } from "../@types";
import { resolveDataValue } from "./dataValue";
import { getStateStore } from "./stateStore";

const PagesContext = createContext<TPageMaster | null>(null);

/** Supplies the page record `PageRouter` was given to every navigating element beneath it. */
export function PagesProvider({ pages, children }: { pages: TPageMaster; children: ReactNode }) {
  return <PagesContext.Provider value={pages}>{children}</PagesContext.Provider>;
}

/** The enclosing `PageRouter`'s pages, or `null` outside one. */
export function usePages(): TPageMaster | null {
  return useContext(PagesContext);
}

/** `:param` names a react-router path template requires. */
export function pathParamNames(path: string): string[] {
  const out: string[] = [];
  const re = /:([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) out.push(m[1]);
  return out;
}

/** Extra sources a navigating element can add beyond the URL (a clicked table row). */
export type NavigateScope = { row?: Record<string, unknown> };

/**
 * Turn a {@link NavigateTarget} into a concrete URL against `pages`, or `null`
 * (with a console warning) when it can't be built: unknown page key, or a
 * required `:param` that resolved to nothing. Pure, so the studio can reuse it.
 */
export function buildNavigateUrl(
  target: NavigateTarget,
  pages: TPageMaster | null,
  scope: { params?: Record<string, string | undefined>; searchParams?: URLSearchParams } & NavigateScope,
  /** Skip the console warnings (for render-time lookups that already warned once). */
  silent = false
): string | null {
  const warn = (msg: string) => {
    if (!silent) console.warn(msg);
  };
  if (!pages) {
    warn(`[gummy-ui] Navigate to "${target.page}" ignored: no <PageRouter> above this element.`);
    return null;
  }
  const page = pages[target.page];
  if (!page) {
    warn(`[gummy-ui] Navigate ignored: unknown page "${target.page}" (known: ${Object.keys(pages).join(", ")}).`);
    return null;
  }
  const resolved: Record<string, string> = {};
  for (const [k, dv] of Object.entries(target.params ?? {})) {
    const v = resolveDataValue(dv, scope);
    if (v !== undefined && v !== null && v !== "") resolved[k] = String(v);
  }
  const missing = pathParamNames(page.path).filter((p) => !(p in resolved));
  if (missing.length) {
    warn(`[gummy-ui] Navigate to "${target.page}" ignored: missing param(s) ${missing.map((m) => `:${m}`).join(", ")}.`);
    return null;
  }
  let url = generatePath(page.path, resolved);
  const qs = new URLSearchParams();
  for (const [k, dv] of Object.entries(target.query ?? {})) {
    const v = resolveDataValue(dv, scope);
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const q = qs.toString();
  if (q) url += `?${q}`;
  return url;
}

/**
 * Navigation for config-driven elements: resolves the target's `params`/`query`
 * from the current URL (and an optional row) and pushes or replaces history.
 * A target that can't be built warns and does nothing — never throws.
 */
export function useNavigateTo() {
  const pages = usePages();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  return useCallback(
    (target: NavigateTarget | undefined, extra: NavigateScope = {}) => {
      if (!target) {
        console.warn("[gummy-ui] Navigate action has no `navigate` target.");
        return;
      }
      const url = buildNavigateUrl(target, pages, { params, searchParams, ...extra });
      if (url) navigate(url, { replace: !!target.replace });
    },
    [pages, navigate, params, searchParams]
  );
}

/**
 * The key of the page whose `path` matches `pathname`, ranked the way
 * `PageRouter`'s `useRoutes` ranks them (so `/country/new` beats `/country/:id`),
 * or `null` when none does.
 */
export function matchPageKey(pages: TPageMaster, pathname: string): string | null {
  return matchPage(pages, pathname)?.key ?? null;
}

/** Like {@link matchPageKey}, with the `:params` the match filled — for code
 * rendered above the routed element, where `useParams()` is empty. */
export function matchPage(
  pages: TPageMaster,
  pathname: string
): { key: string; params: Record<string, string | undefined> } | null {
  const routes = Object.entries(pages).map(([key, p]) => ({ path: p.path, id: key }));
  const matches = matchRoutes(routes, pathname);
  const leaf = matches?.[matches.length - 1];
  return leaf?.route.id ? { key: leaf.route.id, params: leaf.params } : null;
}

/**
 * Page keys from the root ancestor down to `key`, following `parent`. Stops
 * (and warns, unless `silent`) at an unknown parent or a cycle, so a broken
 * hierarchy still yields the partial trail above the break.
 */
export function breadcrumbTrail(key: string, pages: TPageMaster, silent = false): string[] {
  const trail: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = key;
  while (cur !== undefined) {
    if (seen.has(cur)) {
      if (!silent) console.warn(`[gummy-ui] breadcrumb cycle through page "${cur}".`);
      break;
    }
    const page: PageElement | undefined = pages[cur];
    if (!page) {
      if (!silent) console.warn(`[gummy-ui] page "${trail[0] ?? key}" has unknown parent "${cur}".`);
      break;
    }
    seen.add(cur);
    trail.unshift(cur);
    cur = page.parent;
  }
  return trail;
}

/**
 * A page's `title` as a string, resolved from the URL or global state. A
 * `state` title re-renders when its slice changes, so a crumb can show the
 * loaded record's name once its container `load` finishes.
 */
export function usePageTitle(
  title: string | DataValue | undefined,
  /** Route params to resolve a `url` title against; defaults to `useParams()` (empty above the routed element). */
  routeParams?: Record<string, string | undefined>
): string | undefined {
  const ownParams = useParams();
  const params = routeParams ?? ownParams;
  const [searchParams] = useSearchParams();
  const dv = typeof title === "object" ? title : undefined;
  const stateKey = dv?.type === "state" ? dv.key : undefined;
  const store = useMemo(() => (stateKey !== undefined ? getStateStore(stateKey) : null), [stateKey]);
  const subscribe = useCallback((cb: () => void) => (store ? store.subscribe(cb) : () => {}), [store]);
  const getSnapshot = useCallback(() => {
    if (!dv) return typeof title === "string" ? title : undefined;
    const v = resolveDataValue(dv, { params, searchParams });
    return v === undefined || v === null || v === "" ? undefined : String(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, JSON.stringify(dv), JSON.stringify(params), searchParams.toString()]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
