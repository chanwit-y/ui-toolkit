import * as Tooltip from "@radix-ui/react-tooltip";
import { DropdownMenu, Theme } from "@radix-ui/themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  matchPath,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { AppBarConfig, MenuItem, NavigateTarget, TMenu, TPageMaster } from "./@types";
import { useTheme } from "./context";
import { Icon } from "./Icon";
import { breadcrumbTrail, buildNavigateUrl, matchPage, PagesProvider, pathParamNames, usePageTitle } from "./core/pages";

export type AppShellProps = {
  /** The same record `PageRouter` gets — menu items resolve their page keys against it. */
  pages: TPageMaster;
  menu: TMenu;
  /** Top-left of the top bar (logo / app name). Wins over `appBar`'s title/icon/logo. */
  brand?: ReactNode;
  /** The top bar as config: title, icon or logo, panel/accent variant, height. */
  appBar?: AppBarConfig;
  /**
   * Show the icons of menu items (sidebar, drawer and top strip). Default
   * `true`. With `false` the icon rail shows label initials instead.
   */
  menuIcons?: boolean;
  /** Right side of the top bar (e.g. `<ThemeToggle />`). */
  header?: ReactNode;
  /** Bottom of the sidebar (e.g. the signed-in user). */
  footer?: ReactNode;
  /** CSS length. Default `16rem`. */
  sidebarWidth?: string;
  /** Show the collapse-to-icon-rail toggle. Default `true`. */
  collapsible?: boolean;
  /**
   * Where `menu` renders. `"sidebar"` (default): the collapsible side panel.
   * `"top"`: a horizontal strip in the top bar (groups become dropdowns) and no
   * sidebar. Below `md` both fall back to the off-canvas drawer.
   */
  navigation?: "sidebar" | "top";
  /**
   * Show the breadcrumb strip under the top bar. Default `true`. The trail
   * follows each page's `parent`, labelled by `title`; a page with
   * `breadcrumb: false` hides the strip while it is current.
   */
  breadcrumbs?: boolean;
  /** CSS height of the shell. Default `100dvh` (a full-window app); set it when embedding. */
  height?: string;
  className?: string;
  /** The routed content — typically `<PageRouter …/>` (wrapped however you like). */
  children: ReactNode;
};

const COLLAPSE_STORAGE_KEY = "gummy-ui-sidebar-collapsed";

/** `menuIcons` for every entry below the shell (a context beats threading it through six components). */
const MenuIconsContext = createContext(true);
const RAIL_WIDTH = "3.5rem";

const isDivider = (i: MenuItem): i is { divider: true } => "divider" in i;
const isGroup = (i: MenuItem): i is Extract<MenuItem, { items: MenuItem[] }> => "items" in i;
const isPageLink = (i: MenuItem): i is Extract<MenuItem, { navigate: NavigateTarget }> =>
  "navigate" in i;
const isExternal = (i: MenuItem): i is Extract<MenuItem, { href: string }> => "href" in i;

/**
 * A page link is active when its page's path matches the location and every
 * fixed (`value`) param equals the matched one. Params read from the URL or
 * state can't be compared statically and are treated as matching.
 */
function isTargetActive(target: NavigateTarget, pages: TPageMaster, pathname: string): boolean {
  const page = pages[target.page];
  if (!page) return false;
  const m = matchPath({ path: page.path, end: true }, pathname);
  if (!m) return false;
  for (const [k, dv] of Object.entries(target.params ?? {})) {
    if (dv.type === "value" && String(dv.value) !== m.params[k]) return false;
  }
  return true;
}

function containsActive(items: MenuItem[], pages: TPageMaster, pathname: string): boolean {
  return items.some((i) =>
    isGroup(i)
      ? containsActive(i.items, pages, pathname)
      : isPageLink(i) && isTargetActive(i.navigate, pages, pathname)
  );
}

/** Every page key the menu references, for the mount-time validation. */
function collectPageKeys(items: MenuItem[], out: string[] = []): string[] {
  for (const i of items) {
    if (isGroup(i)) collectPageKeys(i.items, out);
    else if (isPageLink(i)) out.push(i.navigate.page);
  }
  return out;
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Literal class strings (Tailwind only emits what it can scan). Surfaces use
// Radix theme vars so they follow the accent and flip with appearance.
const ITEM_BASE =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--gray-11)] no-underline transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";
const ITEM_ACTIVE =
  "bg-[var(--accent-9)] text-[var(--accent-contrast)] hover:bg-[var(--accent-10)] hover:text-[var(--accent-contrast)]";
const GROUP_HEADER =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-10)] hover:text-[var(--gray-12)]";
const TOP_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--gray-11)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";
// `appBar.variant: "accent"` paints the bar in the accent; everything sitting
// on it switches to contrast text with accent-10/11 hover and active states.
const TOP_BUTTON_ACCENT =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent-contrast)] hover:bg-[var(--accent-10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-contrast)]";
const BAR_PANEL = "border-[var(--gray-6)] bg-[var(--color-panel-solid)]";
const BAR_ACCENT = "border-[var(--accent-10)] bg-[var(--accent-9)] text-[var(--accent-contrast)]";
const BAR_DIVIDER = "border-[var(--gray-6)]";
const BAR_DIVIDER_ACCENT = "border-[var(--accent-contrast)] opacity-40";

type ItemProps = {
  item: MenuItem;
  depth: number;
  rail: boolean;
  pages: TPageMaster;
  pathname: string;
  onNavigated: () => void;
};

function RailTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={6}
          className="z-50 rounded-md bg-[var(--gray-12)] px-2 py-1 text-xs text-[var(--gray-1)] shadow-md"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--gray-12)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function MenuEntry({ item, depth, rail, pages, pathname, onNavigated }: ItemProps) {
  const showIcons = useContext(MenuIconsContext);
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const indent: CSSProperties = rail ? {} : { paddingLeft: `${0.5 + depth * 0.75}rem` };

  if (isDivider(item)) return <li role="separator" className="my-2 border-t border-[var(--gray-6)]" />;

  if (isGroup(item)) {
    return (
      <MenuGroup item={item} depth={depth} rail={rail} pages={pages} pathname={pathname} onNavigated={onNavigated} />
    );
  }

  const icon = showIcons && item.icon ? <Icon icon={item.icon} size={16} className="shrink-0" /> : null;
  const content = (
    <>
      {icon ?? (rail ? <span className="text-xs font-semibold">{item.label.slice(0, 2)}</span> : null)}
      {!rail && <span className="truncate">{item.label}</span>}
      {!rail && isExternal(item) && <Icon icon="external" size={12} className="ml-auto shrink-0 opacity-60" />}
    </>
  );
  const railClass = rail ? "justify-center px-0" : "";

  if (isExternal(item)) {
    const a = (
      <a
        href={item.href}
        target={item.newTab ? "_blank" : undefined}
        rel={item.newTab ? "noopener noreferrer" : undefined}
        className={`${ITEM_BASE} ${railClass}`}
        style={indent}
        aria-label={rail ? item.label : undefined}
      >
        {content}
      </a>
    );
    return <li>{rail ? <RailTooltip label={item.label}>{a}</RailTooltip> : a}</li>;
  }

  // Page link: resolved against the shell's pages; an unresolvable one (page
  // deleted, missing param) renders disabled — the mount-time check already warned.
  const url = buildNavigateUrl(item.navigate, pages, { params, searchParams }, true);
  const active = isTargetActive(item.navigate, pages, pathname);
  const a = (
    <a
      href={url ?? "#"}
      aria-current={active ? "page" : undefined}
      aria-disabled={url ? undefined : true}
      aria-label={rail ? item.label : undefined}
      className={`${ITEM_BASE} ${railClass} ${active ? ITEM_ACTIVE : ""} ${url ? "" : "opacity-50"}`}
      style={indent}
      onClick={(e) => {
        e.preventDefault();
        if (!url) return;
        navigate(url, { replace: !!item.navigate.replace });
        onNavigated();
      }}
    >
      {content}
    </a>
  );
  return <li>{rail ? <RailTooltip label={item.label}>{a}</RailTooltip> : a}</li>;
}

function MenuGroup({ item, depth, rail, pages, pathname, onNavigated }: ItemProps & { item: Extract<MenuItem, { items: MenuItem[] }> }) {
  const showIcons = useContext(MenuIconsContext);
  const holdsActive = containsActive(item.items, pages, pathname);
  const [open, setOpen] = useState(() => !item.collapsed || holdsActive);
  // Navigating into the group from elsewhere (a row click, a button) opens it.
  useEffect(() => {
    if (holdsActive) setOpen(true);
  }, [holdsActive]);

  // The icon rail has no room for headers: a group's links show flat.
  if (rail) {
    return (
      <>
        {item.items.map((child, i) => (
          <MenuEntry key={i} item={child} depth={depth} rail pages={pages} pathname={pathname} onNavigated={onNavigated} />
        ))}
      </>
    );
  }
  return (
    <li>
      <button
        type="button"
        className={GROUP_HEADER}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {showIcons && item.icon && <Icon icon={item.icon} size={14} className="shrink-0" />}
        <span className="truncate">{item.label}</span>
        <Icon icon={open ? "chevronDown" : "chevronRight"} size={14} className="ml-auto shrink-0" />
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {item.items.map((child, i) => (
            <MenuEntry key={i} item={child} depth={depth + 1} rail={false} pages={pages} pathname={pathname} onNavigated={onNavigated} />
          ))}
        </ul>
      )}
    </li>
  );
}

function SidebarNav({ menu, pages, rail, onNavigated, footer }: { menu: TMenu; pages: TPageMaster; rail: boolean; onNavigated: () => void; footer?: ReactNode }) {
  const { pathname } = useLocation();
  const { components } = useTheme();
  const color = components.sidebar?.color;
  const nav = (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {menu.map((item, i) => (
          <MenuEntry key={i} item={item} depth={0} rail={rail} pages={pages} pathname={pathname} onNavigated={onNavigated} />
        ))}
      </ul>
      {footer && !rail && <div className="border-t border-[var(--gray-6)] p-2 text-sm text-[var(--gray-11)]">{footer}</div>}
    </nav>
  );
  // A per-component accent re-scopes the Radix `--accent-*` vars for the nav only.
  return (
    <Tooltip.Provider>
      {color ? (
        <Theme accentColor={color} hasBackground={false} asChild>
          {nav}
        </Theme>
      ) : (
        nav
      )}
    </Tooltip.Provider>
  );
}

const TOP_LINK =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-[var(--gray-11)] no-underline transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";
const TOP_LINK_ACTIVE =
  "bg-[var(--accent-3)] text-[var(--accent-11)] hover:bg-[var(--accent-4)] hover:text-[var(--accent-11)]";
const TOP_LINK_ACCENT =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-[var(--accent-contrast)] no-underline transition-colors hover:bg-[var(--accent-10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-contrast)]";
const TOP_LINK_ACCENT_ACTIVE = "bg-[var(--accent-11)] font-semibold hover:bg-[var(--accent-11)]";

type TopEntryProps = { item: MenuItem; pages: TPageMaster; pathname: string; onAccent?: boolean };

/** One top-strip entry: link, external link, dropdown group or vertical divider. */
function TopEntry({ item, pages, pathname, onAccent }: TopEntryProps) {
  const showIcons = useContext(MenuIconsContext);
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const link = onAccent ? TOP_LINK_ACCENT : TOP_LINK;
  const linkActive = onAccent ? TOP_LINK_ACCENT_ACTIVE : TOP_LINK_ACTIVE;

  if (isDivider(item))
    return <li role="separator" className={`mx-1 h-5 border-l ${onAccent ? BAR_DIVIDER_ACCENT : BAR_DIVIDER}`} />;

  const icon = showIcons && item.icon ? <Icon icon={item.icon} size={16} className="shrink-0" /> : null;

  if (isGroup(item)) {
    const holdsActive = containsActive(item.items, pages, pathname);
    return (
      <li>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button type="button" className={`${link} ${holdsActive ? linkActive : ""}`} aria-current={holdsActive ? "true" : undefined}>
              {icon}
              <span className="truncate">{item.label}</span>
              <Icon icon="chevronDown" size={14} className="shrink-0 opacity-70" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="2" align="start">
            {item.items.map((child, i) => (
              <TopDropdownEntry key={i} item={child} pages={pages} pathname={pathname} />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </li>
    );
  }

  if (isExternal(item)) {
    return (
      <li>
        <a
          href={item.href}
          target={item.newTab ? "_blank" : undefined}
          rel={item.newTab ? "noopener noreferrer" : undefined}
          className={link}
        >
          {icon}
          <span className="truncate">{item.label}</span>
          <Icon icon="external" size={12} className="shrink-0 opacity-60" />
        </a>
      </li>
    );
  }

  const url = buildNavigateUrl(item.navigate, pages, { params, searchParams }, true);
  const active = isTargetActive(item.navigate, pages, pathname);
  return (
    <li>
      <a
        href={url ?? "#"}
        aria-current={active ? "page" : undefined}
        aria-disabled={url ? undefined : true}
        className={`${link} ${active ? linkActive : ""} ${url ? "" : "opacity-50"}`}
        onClick={(e) => {
          e.preventDefault();
          if (url) navigate(url, { replace: !!item.navigate.replace });
        }}
      >
        {icon}
        <span className="truncate">{item.label}</span>
      </a>
    </li>
  );
}

/** A group's children inside the top-strip dropdown (nested groups flatten to a labelled section). */
function TopDropdownEntry({ item, pages, pathname }: TopEntryProps) {
  const showIcons = useContext(MenuIconsContext);
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  if (isDivider(item)) return <DropdownMenu.Separator />;
  if (isGroup(item)) {
    return (
      <>
        <DropdownMenu.Label>{item.label}</DropdownMenu.Label>
        {item.items.map((child, i) => (
          <TopDropdownEntry key={i} item={child} pages={pages} pathname={pathname} />
        ))}
      </>
    );
  }
  const icon = showIcons && item.icon ? <Icon icon={item.icon} size={14} className="shrink-0" /> : null;
  if (isExternal(item)) {
    return (
      <DropdownMenu.Item
        onSelect={() => {
          if (item.newTab) window.open(item.href, "_blank", "noopener,noreferrer");
          else window.location.assign(item.href);
        }}
      >
        {icon}
        {item.label}
        <Icon icon="external" size={12} className="ml-auto shrink-0 opacity-60" />
      </DropdownMenu.Item>
    );
  }
  const url = buildNavigateUrl(item.navigate, pages, { params, searchParams }, true);
  const active = isTargetActive(item.navigate, pages, pathname);
  return (
    <DropdownMenu.Item
      disabled={!url}
      data-active={active || undefined}
      className={active ? "font-semibold" : undefined}
      onSelect={() => {
        if (url) navigate(url, { replace: !!item.navigate.replace });
      }}
    >
      {icon}
      {item.label}
    </DropdownMenu.Item>
  );
}

/** The horizontal strip of `menu` in the top bar (`navigation="top"`), desktop only. */
function TopNav({ menu, pages, onAccent }: { menu: TMenu; pages: TPageMaster; onAccent?: boolean }) {
  const { pathname } = useLocation();
  const { components } = useTheme();
  // On an accent bar the strip must stay in the bar's own colour.
  const color = onAccent ? undefined : components.sidebar?.color;
  const nav = (
    <nav aria-label="Main" className="hidden min-w-0 flex-1 md:flex">
      <ul className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {menu.map((item, i) => (
          <TopEntry key={i} item={item} pages={pages} pathname={pathname} onAccent={onAccent} />
        ))}
      </ul>
    </nav>
  );
  return color ? (
    <Theme accentColor={color} hasBackground={false} asChild>
      {nav}
    </Theme>
  ) : (
    nav
  );
}

/** One crumb: an ancestor links to its page with the current route's params; the last is the page itself. */
function Crumb({
  pageKey,
  pages,
  params,
  current,
}: {
  pageKey: string;
  pages: TPageMaster;
  /** The current route's params (the strip renders above the routed element, so `useParams()` is empty here). */
  params: Record<string, string | undefined>;
  current: boolean;
}) {
  const page = pages[pageKey];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const label = usePageTitle(page?.title, params) ?? pageKey;
  const target = useMemo<NavigateTarget>(
    () => ({
      page: pageKey,
      params: Object.fromEntries(pathParamNames(page?.path ?? "").map((n) => [n, { type: "url", key: n } as const])),
    }),
    [pageKey, page?.path]
  );
  if (current) {
    return (
      <li aria-current="page" className="truncate font-medium text-[var(--gray-12)]">
        {label}
      </li>
    );
  }
  const url = buildNavigateUrl(target, pages, { params, searchParams }, true);
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <a
        href={url ?? "#"}
        aria-disabled={url ? undefined : true}
        className={`truncate text-[var(--gray-11)] no-underline hover:text-[var(--gray-12)] hover:underline ${url ? "" : "pointer-events-none opacity-60"}`}
        onClick={(e) => {
          e.preventDefault();
          if (url) navigate(url);
        }}
      >
        {label}
      </a>
      <Icon icon="chevronRight" size={12} className="shrink-0 text-[var(--gray-9)]" aria-hidden />
    </li>
  );
}

/**
 * The breadcrumb strip: the current page's ancestor trail (by `parent`). Renders
 * nothing when no page matches, the page opts out (`breadcrumb: false`), or the
 * trail is empty.
 */
function Breadcrumbs({ pages }: { pages: TPageMaster }) {
  const { pathname } = useLocation();
  const match = useMemo(() => matchPage(pages, pathname), [pages, pathname]);
  const key = match?.key ?? null;
  const trail = useMemo(() => (key ? breadcrumbTrail(key, pages, true) : []), [key, pages]);
  if (!match || !key || pages[key]?.breadcrumb === false || trail.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-9 shrink-0 items-center border-b border-[var(--gray-6)] bg-[var(--color-panel-solid)] px-4 text-sm"
    >
      <ol className="flex min-w-0 items-center gap-1.5">
        {trail.map((k, i) => (
          <Crumb key={k} pageKey={k} pages={pages} params={match.params} current={i === trail.length - 1} />
        ))}
      </ol>
    </nav>
  );
}

/** The `appBar` title/icon/logo mark (used when no `brand` node is given). */
function BrandMark({ bar }: { bar: AppBarConfig }) {
  return (
    <>
      {bar.logo ? (
        <img src={bar.logo} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
      ) : bar.icon ? (
        <Icon icon={bar.icon} size={20} className="shrink-0" />
      ) : null}
      {bar.title && <span className="truncate">{bar.title}</span>}
    </>
  );
}

/**
 * Config-driven app shell: a top bar (brand, collapse toggle, `header` slot)
 * and `menu` — page links keyed to `pages` (the record `PageRouter` gets),
 * external links, collapsible groups and dividers — as a sidebar or, with
 * `navigation="top"`, a horizontal strip in the top bar. The active item
 * follows the current route. The sidebar collapses to an icon rail
 * (remembered in localStorage); either placement becomes an off-canvas
 * drawer below the `md` breakpoint. A breadcrumb strip under the top bar
 * follows each page's `parent`. Wrap it around `PageRouter` inside your own router;
 * the shell provides the pages context, so nested `PageRouter`s and any
 * `Navigate` actions below share one record.
 */
export function AppShell({
  pages,
  menu,
  brand,
  appBar,
  menuIcons = true,
  header,
  footer,
  sidebarWidth = "16rem",
  collapsible = true,
  navigation = "sidebar",
  breadcrumbs = true,
  height = "100dvh",
  className,
  children,
}: AppShellProps) {
  const sidebar = navigation === "sidebar";
  const [collapsed, setCollapsed] = useState(() => collapsible && readCollapsed());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable: state still flips for this session */
      }
      return !c;
    });
  }, []);

  // The drawer closes on any navigation (menu click, or a button on the page).
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    const unknown = new Set(collectPageKeys(menu).filter((k) => !(k in pages)));
    unknown.forEach((k) => console.warn(`[gummy-ui] AppShell: a menu item points at unknown page "${k}".`));
  }, [menu, pages]);

  const rail = sidebar && collapsible && collapsed;
  const asideStyle = useMemo<CSSProperties>(() => ({ width: rail ? RAIL_WIDTH : sidebarWidth }), [rail, sidebarWidth]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const bar = appBar ?? {};
  const accentBar = bar.variant === "accent";
  const topButton = accentBar ? TOP_BUTTON_ACCENT : TOP_BUTTON;
  const brandNode = brand ?? (bar.title || bar.icon || bar.logo ? <BrandMark bar={bar} /> : null);
  const barStyle = useMemo<CSSProperties>(() => ({ height: bar.height ?? "3rem" }), [bar.height]);
  const topBar = (
    <header
      className={`flex shrink-0 items-center gap-2 border-b px-3 ${accentBar ? BAR_ACCENT : BAR_PANEL}`}
      style={barStyle}
      data-variant={bar.variant ?? "panel"}
    >
      <button
        type="button"
        className={`${topButton} md:hidden`}
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <Icon icon="menu" size={18} />
      </button>
      {sidebar && collapsible && (
        <button
          type="button"
          className={`${topButton} hidden md:inline-flex`}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={rail}
          onClick={toggleCollapsed}
        >
          <Icon icon={rail ? bar.sidebarToggle?.show ?? "chevronRight" : bar.sidebarToggle?.hide ?? "chevronLeft"} size={18} />
        </button>
      )}
      {brandNode && (
        <div className="flex min-w-0 shrink-0 items-center gap-2 truncate text-base font-semibold">{brandNode}</div>
      )}
      {!sidebar && (
        <>
          {brandNode && (
            <span className={`mx-1 hidden h-5 border-l md:block ${accentBar ? BAR_DIVIDER_ACCENT : BAR_DIVIDER}`} />
          )}
          <TopNav menu={menu} pages={pages} onAccent={accentBar} />
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">{header}</div>
    </header>
  );

  return (
    <PagesProvider pages={pages}>
      <MenuIconsContext.Provider value={menuIcons}>
      <div
        className={`flex w-full flex-col bg-[var(--color-background)] text-[var(--gray-12)] ${className ?? ""}`}
        style={{ height }}
      >
        {accentBar && bar.color ? (
          <Theme accentColor={bar.color} hasBackground={false} asChild>
            {topBar}
          </Theme>
        ) : (
          topBar
        )}
        {breadcrumbs && <Breadcrumbs pages={pages} />}

        <div className="flex min-h-0 flex-1">
          {sidebar && (
            <aside
              className="hidden shrink-0 flex-col border-r border-[var(--gray-6)] bg-[var(--color-panel-solid)] transition-[width] duration-200 md:flex"
              style={asideStyle}
              data-collapsed={rail || undefined}
            >
              <SidebarNav menu={menu} pages={pages} rail={rail} onNavigated={closeDrawer} footer={footer} />
            </aside>
          )}
          <main className="min-w-0 flex-1 overflow-auto">{children}</main>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
            <aside
              className="absolute inset-y-0 left-0 flex flex-col border-r border-[var(--gray-6)] bg-[var(--color-panel-solid)] shadow-xl"
              style={{ width: sidebarWidth }}
            >
              <div className="flex h-12 items-center gap-2 border-b border-[var(--gray-6)] px-3">
                <button type="button" className={TOP_BUTTON} aria-label="Close navigation" onClick={closeDrawer}>
                  <Icon icon="x" size={18} />
                </button>
                {brandNode && (
                  <div className="flex min-w-0 items-center gap-2 truncate text-base font-semibold">{brandNode}</div>
                )}
              </div>
              <SidebarNav menu={menu} pages={pages} rail={false} onNavigated={closeDrawer} footer={footer} />
            </aside>
          </div>
        )}
      </div>
      </MenuIconsContext.Provider>
    </PagesProvider>
  );
}
