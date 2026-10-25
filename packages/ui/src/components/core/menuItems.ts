import { matchPath } from "react-router-dom";
import type { MenuItem, NavigateTarget, TPageEntries } from "../@types";

export const isDivider = (i: MenuItem): i is { divider: true } => "divider" in i;
export const isGroup = (i: MenuItem): i is Extract<MenuItem, { items: MenuItem[] }> => "items" in i;
export const isPageLink = (i: MenuItem): i is Extract<MenuItem, { navigate: NavigateTarget }> => "navigate" in i;
export const isExternal = (i: MenuItem): i is Extract<MenuItem, { href: string }> => "href" in i;

/**
 * A page link is active when its page's path matches the location and every
 * fixed (`value`) param equals the matched one. Params read from the URL or
 * state can't be compared statically and are treated as matching.
 */
export function isTargetActive(target: NavigateTarget, pages: TPageEntries, pathname: string): boolean {
  const page = pages[target.page];
  if (!page) return false;
  const m = matchPath({ path: page.path, end: true }, pathname);
  if (!m) return false;
  for (const [k, dv] of Object.entries(target.params ?? {})) {
    if (dv.type === "value" && String(dv.value) !== m.params[k]) return false;
  }
  return true;
}

export function containsActive(items: MenuItem[], pages: TPageEntries, pathname: string): boolean {
  return items.some((i) =>
    isGroup(i) ? containsActive(i.items, pages, pathname) : isPageLink(i) && isTargetActive(i.navigate, pages, pathname)
  );
}

/** Every page key the menu references, for the mount-time validation. */
export function collectPageKeys(items: MenuItem[], out: string[] = []): string[] {
  for (const i of items) {
    if (isGroup(i)) collectPageKeys(i.items, out);
    else if (isPageLink(i)) out.push(i.navigate.page);
  }
  return out;
}
