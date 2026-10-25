import * as Tooltip from "@radix-ui/react-tooltip";
import { DropdownMenu, Theme } from "@radix-ui/themes";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { AppBarConfig, MenuItem, SidebarConfig, TMenu, TPageEntries } from "./@types";
import { useTheme } from "./context";
import { Icon } from "./Icon";
import { buildNavigateUrl } from "./core/pages";
import { containsActive, isDivider, isExternal, isGroup, isTargetActive } from "./core/menuItems";
import { sidebarIndicator, sidebarRailWidth, sidebarStyle, sidebarVariant, type SidebarVariant } from "./core/sidebarStyle";

export type AppSidebarProps = {
  menu: TMenu;
  /** The record menu page links resolve against (the one `PageRouter` gets). */
  pages: TPageEntries;
  /** Look and toggle placement (see `SidebarConfig`). */
  sidebar?: SidebarConfig;
  /** Draw the icon rail instead of the full sidebar. */
  rail?: boolean;
  /** Called by the footer toggle — shown only when given and `sidebar.toggle` is `"footer"`. */
  onToggleRail?: () => void;
  /** Footer toggle glyphs (`AppBarConfig.sidebarToggle`). Defaults `arrowLeft` / `arrowRight`. */
  toggleIcons?: AppBarConfig["sidebarToggle"];
  /** Above the toggle at the bottom (e.g. the signed-in user); hidden on the rail. */
  footer?: ReactNode;
  /** After a menu link navigates (the shell closes its drawer). */
  onNavigated?: () => void;
  /** CSS width while expanded. Default `16rem`. */
  width?: string;
  /** Show item icons. Default: the shell's `menuIcons`, else `true`. */
  menuIcons?: boolean;
  /** Active item text colour (the shell sets it for everything below it). */
  menuActiveColor?: string;
  as?: "aside" | "div";
  /** Display and border classes. Default `flex`. */
  className?: string;
  style?: CSSProperties;
};

/** `menuIcons` for every entry below the shell (a context beats threading it through six components). */
export const MenuIconsContext = createContext(true);

type SidebarCtx = {
  variant: SidebarVariant;
  rail: boolean;
  indicator: boolean;
  showIcons: boolean;
  pages: TPageEntries;
  pathname: string;
  onNavigated: () => void;
};

const SidebarContext = createContext<SidebarCtx | null>(null);

function useSidebar(): SidebarCtx {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("[gummy-ui] menu entries must render inside AppSidebar.");
  return ctx;
}

// Geometry: every item keeps its icon in a 1.5rem column at a fixed left
// inset, and the rail is exactly wide enough for that column to sit centred
// (nav padding 0.5rem each side + the column = 2.5rem, the rest split as the
// item's left padding). So collapsing is one width transition — labels clip
// and fade, icons never move.
const TOP_PAD = "calc((var(--gummy-side-rail) - 2.5rem) / 2)";
const NAV_PAD = "0.5rem";
const CHILD_PAD = "0.75rem";

// Literal class strings (Tailwind only emits what it can scan). Surfaces use
// Radix theme vars so they follow the accent and flip with appearance.
// Idle and active colours are alternatives, never stacked: both `text-*`
// utilities on one element resolve by their order in the compiled stylesheet,
// not in the class list, and the grey won — the active label vanished into the
// accent bar. The active text follows `menuActiveColor` (the
// `--gummy-menu-active-fg` var the shell sets), else the accent's contrast.
// The pill variant is drawn by `styles/sidebar.css` instead.
const ITEM_LAYOUT =
  "flex w-full items-center overflow-hidden rounded-md py-1.5 pr-2 text-left text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";
const ITEM_IDLE = "text-[var(--gray-11)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]";
const ITEM_ACTIVE =
  "bg-[var(--accent-9)] text-[var(--gummy-menu-active-fg,var(--accent-contrast))] hover:bg-[var(--accent-10)] hover:text-[var(--gummy-menu-active-fg,var(--accent-contrast))]";
const GROUP_LAYOUT =
  "flex w-full items-center overflow-hidden rounded-md py-1.5 pr-2 text-left text-xs font-semibold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";
const GROUP_IDLE = "text-[var(--gray-10)] hover:text-[var(--gray-12)]";

function RailTooltip({ label, rail, children }: { label: string; rail: boolean; children: ReactNode }) {
  // Always mounted (only ever open on the rail), so switching modes doesn't
  // remount the item and its label can fade.
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Root delayDuration={200} open={rail && open} onOpenChange={setOpen}>
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

/** The bar at the sidebar's edge; `inset` is the distance from that edge to the item's `li`. */
function Indicator({ inset }: { inset: string }) {
  return <span aria-hidden className="gummy-side-indicator" style={{ left: `calc(-1 * ${inset})` }} />;
}

/** The fixed icon column: the glyph, or the label's initials on the rail when there is none. */
function IconColumn({ item, size }: { item: Exclude<MenuItem, { divider: true }>; size: number }) {
  const { rail, showIcons } = useSidebar();
  if (showIcons && item.icon) {
    return (
      <span className="gummy-side-icon flex w-6 shrink-0 items-center justify-center">
        <Icon icon={item.icon} size={size} className="flex" />
      </span>
    );
  }
  if (!rail) return null;
  return (
    <span className="gummy-side-icon flex w-6 shrink-0 items-center justify-center text-xs font-semibold">
      {item.label.slice(0, 2)}
    </span>
  );
}

type EntryProps = {
  item: MenuItem;
  depth: number;
  /** Distance from the sidebar's edge to this entry's `li` (for the indicator). */
  inset: string;
};

function itemPadding(variant: SidebarVariant, depth: number): string {
  if (depth === 0) return TOP_PAD;
  return variant === "pill" ? CHILD_PAD : `calc(${TOP_PAD} + ${depth * 0.75}rem)`;
}

function MenuEntry({ item, depth, inset }: EntryProps) {
  const { variant, rail, indicator, showIcons, pages, pathname, onNavigated } = useSidebar();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  if (isDivider(item)) return <li role="separator" className="my-2 border-t border-[var(--gray-6)]" />;
  if (isGroup(item)) return <MenuGroup item={item} depth={depth} inset={inset} />;

  const pill = variant === "pill";
  const hasIcon = (showIcons && !!item.icon) || rail;
  const content = (
    <>
      <IconColumn item={item} size={pill && depth === 0 ? 18 : 16} />
      <span className={`gummy-side-label min-w-0 flex-1 truncate ${hasIcon ? (pill ? "ml-3" : "ml-2") : ""}`}>{item.label}</span>
      {isExternal(item) && <Icon icon="external" size={12} className="gummy-side-fade ml-2 flex shrink-0 opacity-60" />}
    </>
  );
  const padding: CSSProperties = { paddingLeft: itemPadding(variant, depth) };

  if (isExternal(item)) {
    return (
      <li>
        <RailTooltip label={item.label} rail={rail}>
          <a
            href={item.href}
            target={item.newTab ? "_blank" : undefined}
            rel={item.newTab ? "noopener noreferrer" : undefined}
            className={pill ? "gummy-side-pill" : `${ITEM_LAYOUT} ${ITEM_IDLE}`}
            data-child={pill && depth > 0 ? "" : undefined}
            style={padding}
          >
            {content}
          </a>
        </RailTooltip>
      </li>
    );
  }

  // Page link: resolved against the shell's pages; an unresolvable one (page
  // deleted, missing param) renders disabled — the mount-time check already warned.
  const url = buildNavigateUrl(item.navigate, pages, { params, searchParams }, true);
  const active = isTargetActive(item.navigate, pages, pathname);
  const shift = pill && active && indicator;
  return (
    <li className={active && indicator ? "relative" : undefined}>
      {active && indicator && <Indicator inset={inset} />}
      <RailTooltip label={item.label} rail={rail}>
        <a
          href={url ?? "#"}
          aria-current={active ? "page" : undefined}
          aria-disabled={url ? undefined : true}
          className={`${pill ? "gummy-side-pill" : `${ITEM_LAYOUT} ${active ? ITEM_ACTIVE : ITEM_IDLE}`} ${url ? "" : "opacity-50"}`}
          data-active={pill && active ? "" : undefined}
          data-shift={shift ? "" : undefined}
          data-child={pill && depth > 0 ? "" : undefined}
          style={padding}
          onClick={(e) => {
            e.preventDefault();
            if (!url) return;
            navigate(url, { replace: !!item.navigate.replace });
            onNavigated();
          }}
        >
          {content}
        </a>
      </RailTooltip>
    </li>
  );
}

/**
 * True once an opened section has finished growing: its clip comes off then,
 * so an indicator inside it can reach the sidebar's edge (a clip during the
 * transition is what makes the section grow instead of popping).
 */
function useSettled(shown: boolean): boolean {
  const [settled, setSettled] = useState(shown);
  useEffect(() => {
    if (!shown) {
      setSettled(false);
      return;
    }
    const t = window.setTimeout(() => setSettled(true), 220);
    return () => window.clearTimeout(t);
  }, [shown]);
  return settled;
}

function MenuGroup({ item, depth, inset }: EntryProps & { item: Extract<MenuItem, { items: MenuItem[] }> }) {
  const { variant, rail, indicator, showIcons, pages, pathname, onNavigated } = useSidebar();
  const pill = variant === "pill";
  const holdsActive = containsActive(item.items, pages, pathname);
  const [open, setOpen] = useState(() => !item.collapsed || holdsActive);
  const [flyout, setFlyout] = useState(false);
  // Navigating into the group from elsewhere (a row click, a button) opens it.
  useEffect(() => {
    if (holdsActive) setOpen(true);
  }, [holdsActive]);
  useEffect(() => {
    if (!rail) setFlyout(false);
  }, [rail]);

  // On the rail a group is one icon whose children open in a flyout; its
  // section stays closed underneath.
  const shown = open && !rail;
  const settled = useSettled(shown);
  // While the active page is out of sight (rail, or a closed group) the header carries it.
  const headerActive = holdsActive && !shown;
  const hasIcon = (showIcons && !!item.icon) || rail;
  const pad = itemPadding(variant, depth);
  const childInset = pill ? `calc(${inset} + ${pad} + 0.75rem + 1px + 0.5rem)` : inset;

  const header = (
    <button
      type="button"
      className={
        pill
          ? "gummy-side-pill"
          : `${rail ? ITEM_LAYOUT : GROUP_LAYOUT} ${rail && holdsActive ? ITEM_ACTIVE : rail ? ITEM_IDLE : GROUP_IDLE}`
      }
      style={{ paddingLeft: pad }}
      data-active={pill && rail && holdsActive ? "" : undefined}
      data-holds-active={pill && !rail && holdsActive ? "" : undefined}
      data-shift={pill && rail && holdsActive && indicator ? "" : undefined}
      data-child={pill && depth > 0 ? "" : undefined}
      data-open={shown ? "" : undefined}
      aria-label={rail ? item.label : undefined}
      aria-expanded={rail ? flyout : open}
      onClick={rail ? undefined : () => setOpen((o) => !o)}
    >
      <IconColumn item={item} size={pill ? (depth === 0 ? 18 : 16) : 14} />
      <span className={`gummy-side-label min-w-0 flex-1 truncate ${hasIcon ? (pill ? "ml-3" : "ml-2") : ""}`}>{item.label}</span>
      <Icon
        icon={pill ? "chevronDown" : "chevronRight"}
        size={pill ? 16 : 14}
        className={`gummy-side-fade gummy-side-chevron ${pill ? "" : "gummy-side-chevron-quarter"} ml-auto flex shrink-0`}
      />
    </button>
  );

  return (
    <li className={headerActive && indicator ? "relative" : undefined}>
      {headerActive && indicator && <Indicator inset={inset} />}
      {/* On the rail the header is the flyout's trigger; off it, a plain
          button toggling the section (a click from any source — pointer,
          keyboard, assistive tech — not Radix's pointer-down / key handlers). */}
      {rail ? (
        <DropdownMenu.Root open={flyout} onOpenChange={setFlyout}>
          <DropdownMenu.Trigger>{header}</DropdownMenu.Trigger>
          <DropdownMenu.Content size="2" side="right" align="start" sideOffset={8}>
            <DropdownMenu.Label>{item.label}</DropdownMenu.Label>
            {item.items.map((child, i) => (
              <MenuDropdownEntry key={i} item={child} pages={pages} pathname={pathname} onNavigated={onNavigated} />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      ) : (
        header
      )}
      <div
        className="gummy-side-collapse grid"
        style={{ gridTemplateRows: shown ? "1fr" : "0fr", visibility: shown ? "visible" : "hidden" }}
        aria-hidden={!shown}
      >
        <div className={`min-h-0 ${shown && settled ? "" : "overflow-hidden"}`}>
          <ul
            className={pill ? "mt-1 space-y-1 border-l border-[var(--gray-6)]" : "mt-0.5 space-y-0.5"}
            style={pill ? { marginLeft: `calc(${pad} + 0.75rem)`, paddingLeft: "0.5rem" } : undefined}
          >
            {item.items.map((child, i) => (
              <MenuEntry key={i} item={child} depth={depth + 1} inset={childInset} />
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

/** A menu entry inside a dropdown — the top strip's groups and the rail's flyouts (nested groups flatten to a labelled section). */
export function MenuDropdownEntry({
  item,
  pages,
  pathname,
  onNavigated,
}: {
  item: MenuItem;
  pages: TPageEntries;
  pathname: string;
  onNavigated?: () => void;
}) {
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
          <MenuDropdownEntry key={i} item={child} pages={pages} pathname={pathname} onNavigated={onNavigated} />
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
        if (!url) return;
        navigate(url, { replace: !!item.navigate.replace });
        onNavigated?.();
      }}
    >
      {icon}
      {item.label}
    </DropdownMenu.Item>
  );
}

/** The footer toggle: icon + label expanded, the icon alone (centred in the rail) collapsed. */
function FooterToggle({
  rail,
  label,
  icons,
  onToggle,
}: {
  rail: boolean;
  label: string;
  icons?: AppBarConfig["sidebarToggle"];
  onToggle: () => void;
}) {
  return (
    <RailTooltip label="Expand sidebar" rail={rail}>
      <button
        type="button"
        className="gummy-side-toggle"
        style={{ paddingLeft: TOP_PAD, paddingRight: rail ? TOP_PAD : "0.75rem" }}
        aria-label={rail ? "Expand sidebar" : undefined}
        aria-expanded={!rail}
        onClick={onToggle}
      >
        <span className="flex w-6 shrink-0 items-center justify-center">
          <Icon icon={rail ? icons?.show ?? "arrowRight" : icons?.hide ?? "arrowLeft"} size={18} className="flex" />
        </span>
        <span className="gummy-side-toggle-label">{label}</span>
      </button>
    </RailTooltip>
  );
}

/**
 * The shell's sidebar on its own: the menu as a plain or pill list, the
 * active item following the route, groups that open in place (a flyout on the
 * icon rail), an optional edge indicator and footer toggle. `AppShell` draws
 * it; mount it directly (inside a router) for a custom shell or a preview.
 */
export function AppSidebar({
  menu,
  pages,
  sidebar = {},
  rail = false,
  onToggleRail,
  toggleIcons,
  footer,
  onNavigated,
  width = "16rem",
  menuIcons,
  menuActiveColor,
  as: Tag = "aside",
  className = "flex",
  style,
}: AppSidebarProps) {
  const { pathname } = useLocation();
  const { components } = useTheme();
  const shellIcons = useContext(MenuIconsContext);
  const variant = sidebarVariant(sidebar);
  const railWidth = sidebarRailWidth(sidebar);
  const showIcons = menuIcons ?? shellIcons;
  const ctx: SidebarCtx = {
    variant,
    rail,
    indicator: sidebarIndicator(sidebar),
    showIcons,
    pages,
    pathname,
    onNavigated: onNavigated ?? (() => {}),
  };
  const showToggle = !!onToggleRail && sidebar.toggle === "footer";
  const color = components.sidebar?.color;

  const nav = (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
      <ul className={`flex-1 overflow-y-auto overflow-x-hidden p-2 ${variant === "pill" ? "space-y-2" : "space-y-0.5"}`}>
        {menu.map((item, i) => (
          <MenuEntry key={i} item={item} depth={0} inset={NAV_PAD} />
        ))}
      </ul>
      {footer && !rail && <div className="border-t border-[var(--gray-6)] p-2 text-sm text-[var(--gray-11)]">{footer}</div>}
      {showToggle && (
        <div className="border-t border-[var(--gray-6)] p-2">
          <FooterToggle rail={rail} label={sidebar.toggleLabel || "Hide Menu"} icons={toggleIcons} onToggle={onToggleRail} />
        </div>
      )}
    </nav>
  );

  return (
    <Tag
      className={`gummy-sidebar shrink-0 flex-col overflow-hidden bg-[var(--color-panel-solid)] ${className}`}
      style={{
        width: rail ? railWidth : width,
        ["--gummy-side-rail" as string]: railWidth,
        ...(menuActiveColor ? { ["--gummy-menu-active-fg" as string]: menuActiveColor } : {}),
        ...sidebarStyle(sidebar),
        ...style,
      }}
      data-variant={variant}
      data-rail={rail || undefined}
      data-collapsed={rail || undefined}
    >
      <SidebarContext.Provider value={ctx}>
        <MenuIconsContext.Provider value={showIcons}>
          <Tooltip.Provider>
            {/* A per-component accent re-scopes the Radix `--accent-*` vars for the nav only. */}
            {color ? (
              <Theme accentColor={color} hasBackground={false} asChild>
                {nav}
              </Theme>
            ) : (
              nav
            )}
          </Tooltip.Provider>
        </MenuIconsContext.Provider>
      </SidebarContext.Provider>
    </Tag>
  );
}
