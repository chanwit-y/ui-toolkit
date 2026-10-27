import { DropdownMenu, Theme } from "@radix-ui/themes";
import { useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { AppBarConfig, MenuItem, NavigateTarget, PageTransition, SidebarConfig, TMenu, TPageEntries } from "./@types";
import { AppSidebar, MenuDropdownEntry, MenuIconsContext } from "./AppSidebar";
import { collectPageKeys, containsActive, isDivider, isExternal, isGroup, isTargetActive } from "./core/menuItems";
import { PageTransitionContext } from "./core/pageTransition";
import { appBarStyle, appBarTone, type AppBarTone } from "./core/appBarStyle";
import { useTheme } from "./context";
import { Icon } from "./Icon";
import { SurfaceBackdrop } from "./SurfaceBackdrop";
import { breadcrumbTrail, buildNavigateUrl, matchPage, PagesProvider, pathParamNames, usePageTitle } from "./core/pages";

export type AppShellProps = {
  /** The same record `PageRouter` gets — menu items resolve their page keys against it. */
  pages: TPageEntries;
  menu: TMenu;
  /** Top-left of the top bar (logo / app name). Wins over `appBar`'s title/icon/logo. */
  brand?: ReactNode;
  /** The top bar as config: title, icon or logo, panel/accent variant, height. */
  appBar?: AppBarConfig;
  /**
   * Text (and icon) colour of the active sidebar / drawer menu item, any CSS
   * colour, on its accent background. Default: the accent's contrast colour.
   */
  menuActiveColor?: string;
  /** How a page enters on a pathname change — read by the `PageRouter` inside (which may override it). Default: none. */
  pageTransition?: PageTransition;
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
   * The sidebar's look (`"plain"` / `"pill"`, colour overrides, rail width)
   * and where its collapse toggle sits (top bar or sidebar footer).
   */
  sidebar?: SidebarConfig;
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

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Literal class strings (Tailwind only emits what it can scan). Surfaces use
// Radix theme vars so they follow the accent and flip with appearance.
const TOP_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--gray-11)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";
// `appBar.variant: "accent"` paints the bar in the accent; everything sitting
// on it switches to contrast text with accent-10/11 hover and active states.
const TOP_BUTTON_ACCENT =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent-contrast)] hover:bg-[var(--accent-10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-contrast)]";
const BAR_PANEL = "border-[var(--gray-6)] gummy-surface";
const BAR_ACCENT = "border-[var(--accent-10)] bg-[var(--accent-9)] text-[var(--accent-contrast)]";
const BAR_DIVIDER = "border-[var(--gray-6)]";
const BAR_DIVIDER_ACCENT = "border-[var(--accent-contrast)] opacity-40";
// `appBar.variant: "custom"` paints the bar with `background` / `gradient`;
// its chrome reads the `--gummy-bar-*` vars `appBarStyle` sets (the text
// colour and white- or black-alpha tints picked from its luminance).
const TOP_BUTTON_CUSTOM =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--gummy-bar-fg)] hover:bg-[var(--gummy-bar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gummy-bar-fg)]";
const BAR_CUSTOM = "border-[var(--gummy-bar-line)]";
const BAR_DIVIDER_CUSTOM = "border-[var(--gummy-bar-fg)] opacity-40";

const BAR_CLASS: Record<AppBarTone, string> = { panel: BAR_PANEL, accent: BAR_ACCENT, custom: BAR_CUSTOM };
const TOP_BUTTON_CLASS: Record<AppBarTone, string> = { panel: TOP_BUTTON, accent: TOP_BUTTON_ACCENT, custom: TOP_BUTTON_CUSTOM };
const BAR_DIVIDER_CLASS: Record<AppBarTone, string> = { panel: BAR_DIVIDER, accent: BAR_DIVIDER_ACCENT, custom: BAR_DIVIDER_CUSTOM };

// Like the sidebar: each class string is a whole state (layout + colours), the
// active one used *instead of* the idle one, so their text colours never stack.
const TOP_LINK_LAYOUT = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2";
const TOP_LINK = `${TOP_LINK_LAYOUT} text-[var(--gray-11)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)] focus-visible:ring-[var(--accent-8)]`;
const TOP_LINK_ACTIVE = `${TOP_LINK_LAYOUT} bg-[var(--accent-3)] text-[var(--accent-11)] hover:bg-[var(--accent-4)] hover:text-[var(--accent-11)] focus-visible:ring-[var(--accent-8)]`;
const TOP_LINK_ACCENT = `${TOP_LINK_LAYOUT} text-[var(--accent-contrast)] hover:bg-[var(--accent-10)] focus-visible:ring-[var(--accent-contrast)]`;
const TOP_LINK_ACCENT_ACTIVE = `${TOP_LINK_LAYOUT} bg-[var(--accent-11)] font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-11)] focus-visible:ring-[var(--accent-contrast)]`;
const TOP_LINK_CUSTOM = `${TOP_LINK_LAYOUT} text-[var(--gummy-bar-fg)] hover:bg-[var(--gummy-bar-hover)] focus-visible:ring-[var(--gummy-bar-fg)]`;
const TOP_LINK_CUSTOM_ACTIVE = `${TOP_LINK_LAYOUT} bg-[var(--gummy-bar-active)] font-semibold text-[var(--gummy-bar-fg)] hover:bg-[var(--gummy-bar-active)] focus-visible:ring-[var(--gummy-bar-fg)]`;
const TOP_LINK_CLASS: Record<AppBarTone, string> = { panel: TOP_LINK, accent: TOP_LINK_ACCENT, custom: TOP_LINK_CUSTOM };
const TOP_LINK_ACTIVE_CLASS: Record<AppBarTone, string> = {
  panel: TOP_LINK_ACTIVE,
  accent: TOP_LINK_ACCENT_ACTIVE,
  custom: TOP_LINK_CUSTOM_ACTIVE,
};

type TopEntryProps = { item: MenuItem; pages: TPageEntries; pathname: string; tone?: AppBarTone };

/** One top-strip entry: link, external link, dropdown group or vertical divider. */
function TopEntry({ item, pages, pathname, tone = "panel" }: TopEntryProps) {
  const showIcons = useContext(MenuIconsContext);
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const link = TOP_LINK_CLASS[tone];
  const linkActive = TOP_LINK_ACTIVE_CLASS[tone];

  if (isDivider(item)) return <li role="separator" className={`mx-1 h-5 border-l ${BAR_DIVIDER_CLASS[tone]}`} />;

  const icon = showIcons && item.icon ? <Icon icon={item.icon} size={16} className="shrink-0" /> : null;

  if (isGroup(item)) {
    const holdsActive = containsActive(item.items, pages, pathname);
    return (
      <li>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button type="button" className={holdsActive ? linkActive : link} aria-current={holdsActive ? "true" : undefined}>
              {icon}
              <span className="truncate">{item.label}</span>
              <Icon icon="chevronDown" size={14} className="shrink-0 opacity-70" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="2" align="start">
            {item.items.map((child, i) => (
              <MenuDropdownEntry key={i} item={child} pages={pages} pathname={pathname} />
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
        className={`${active ? linkActive : link} ${url ? "" : "opacity-50"}`}
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

/** The horizontal strip of `menu` in the top bar (`navigation="top"`), desktop only. */
function TopNav({ menu, pages, tone }: { menu: TMenu; pages: TPageEntries; tone: AppBarTone }) {
  const { pathname } = useLocation();
  const { components } = useTheme();
  // On an accent or custom bar the strip must stay in the bar's own colour.
  const color = tone === "panel" ? components.sidebar?.color : undefined;
  const nav = (
    <nav aria-label="Main" className="hidden min-w-0 flex-1 md:flex">
      <ul className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {menu.map((item, i) => (
          <TopEntry key={i} item={item} pages={pages} pathname={pathname} tone={tone} />
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
  pages: TPageEntries;
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
function Breadcrumbs({ pages }: { pages: TPageEntries }) {
  const { pathname } = useLocation();
  const match = useMemo(() => matchPage(pages, pathname), [pages, pathname]);
  const key = match?.key ?? null;
  const trail = useMemo(() => (key ? breadcrumbTrail(key, pages, true) : []), [key, pages]);
  if (!match || !key || pages[key]?.breadcrumb === false || trail.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-9 shrink-0 items-center border-b border-[var(--gray-6)] gummy-surface px-4 text-sm"
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
        <img src={bar.logo} alt="" className="w-auto shrink-0 rounded object-contain" style={{ height: bar.logoSize ?? "1.5rem" }} />
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
  menuActiveColor,
  pageTransition,
  menuIcons = true,
  header,
  footer,
  sidebarWidth = "16rem",
  collapsible = true,
  sidebar: sidebarConfig,
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
  const footerToggle = sidebarConfig?.toggle === "footer";
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const bar = appBar ?? {};
  const tone = appBarTone(bar);
  const accentBar = tone === "accent";
  const topButton = TOP_BUTTON_CLASS[tone];
  const brandNode = brand ?? (bar.title || bar.icon || bar.logo ? <BrandMark bar={bar} /> : null);
  const barStyle = useMemo<CSSProperties>(() => appBarStyle(bar), [bar]);
  const topBar = (
    <header
      className={`flex shrink-0 items-center gap-2 border-b ${bar.padding ? "" : "px-3"} ${BAR_CLASS[tone]}`}
      style={barStyle}
      data-variant={tone}
    >
      <button
        type="button"
        className={`${topButton} gummy-shell-mobile`}
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <Icon icon="menu" size={18} />
      </button>
      {sidebar && collapsible && !footerToggle && (
        <button
          type="button"
          className={`${topButton} gummy-shell-desktop`}
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
            <span className={`mx-1 hidden h-5 border-l md:block ${BAR_DIVIDER_CLASS[tone]}`} />
          )}
          <TopNav menu={menu} pages={pages} tone={tone} />
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">{header}</div>
    </header>
  );

  return (
    <PagesProvider pages={pages}>
      <MenuIconsContext.Provider value={menuIcons}>
      <div
        className={`relative isolate flex w-full flex-col bg-[var(--color-background)] text-[var(--gray-12)] ${className ?? ""}`}
        style={{ height, ...(menuActiveColor ? ({ "--gummy-menu-active-fg": menuActiveColor } as CSSProperties) : {}) }}
      >
        {/* The glass backdrop (nothing in flat); see styles/surface.css. */}
        <SurfaceBackdrop />
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
            <AppSidebar
              menu={menu}
              pages={pages}
              sidebar={sidebarConfig}
              rail={rail}
              onToggleRail={collapsible ? toggleCollapsed : undefined}
              toggleIcons={bar.sidebarToggle}
              footer={footer}
              onNavigated={closeDrawer}
              width={sidebarWidth}
              className="gummy-side-desktop border-r border-[var(--gray-6)]"
            />
          )}
          <main className="min-w-0 flex-1 overflow-auto">
            <PageTransitionContext.Provider value={pageTransition}>{children}</PageTransitionContext.Provider>
          </main>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
            <aside
              className="absolute inset-y-0 left-0 flex flex-col border-r border-[var(--gray-6)] gummy-surface-strong shadow-xl"
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
              <AppSidebar
                as="div"
                menu={menu}
                pages={pages}
                sidebar={sidebarConfig}
                footer={footer}
                onNavigated={closeDrawer}
                width="100%"
                className="flex min-h-0 flex-1"
              />
            </aside>
          </div>
        )}
      </div>
      </MenuIconsContext.Provider>
    </PagesProvider>
  );
}
