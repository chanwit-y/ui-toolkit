import { createContext, useCallback, useContext, type ReactNode } from "react";
import { generatePath, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { NavigateTarget, TPageMaster } from "../@types";
import { resolveDataValue } from "./dataValue";

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
  scope: { params?: Record<string, string | undefined>; searchParams?: URLSearchParams } & NavigateScope
): string | null {
  if (!pages) {
    console.warn(`[gummy-ui] Navigate to "${target.page}" ignored: no <PageRouter> above this element.`);
    return null;
  }
  const page = pages[target.page];
  if (!page) {
    console.warn(`[gummy-ui] Navigate ignored: unknown page "${target.page}" (known: ${Object.keys(pages).join(", ")}).`);
    return null;
  }
  const resolved: Record<string, string> = {};
  for (const [k, dv] of Object.entries(target.params ?? {})) {
    const v = resolveDataValue(dv, scope);
    if (v !== undefined && v !== null && v !== "") resolved[k] = String(v);
  }
  const missing = pathParamNames(page.path).filter((p) => !(p in resolved));
  if (missing.length) {
    console.warn(`[gummy-ui] Navigate to "${target.page}" ignored: missing param(s) ${missing.map((m) => `:${m}`).join(", ")}.`);
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
