import { DEFAULT_PAGE_TRANSITION_DURATION, type AppBarConfig, type AppShellProps, type MenuItem, type PageTransition, type SidebarConfig, type TMenu } from '@gummy-ui/ui'
import { toNavigateTarget } from '../Layout/gridConfig'
import type { MenuItemDef, PageDef, ShellSettings, SidebarSettings, StudioPageTransition } from './types'
import { pathParams } from './snapshots'

/** A fresh, empty item of the given kind. */
export function createMenuItem(kind: MenuItemDef['kind']): MenuItemDef {
  const id = crypto.randomUUID()
  switch (kind) {
    case 'page':
      return { id, kind, label: '', icon: '', navigate: { pageId: '', params: {}, replace: false } }
    case 'link':
      return { id, kind, label: '', icon: '', href: '', newTab: true }
    case 'group':
      return { id, kind, label: 'Group', icon: '', collapsed: false, items: [] }
    default:
      return { id, kind: 'divider' }
  }
}

/**
 * The menu a project starts with (see the grilled design): one link per
 * page that takes no `:params` — detail pages are reached by row clicks and
 * buttons, not the sidebar.
 */
export function defaultMenu(pages: Pick<PageDef, 'id' | 'name' | 'path'>[]): MenuItemDef[] {
  return pages
    .filter((pg) => pathParams(pg.path).length === 0)
    .map((pg) => ({
      id: crypto.randomUUID(),
      kind: 'page' as const,
      label: pg.name,
      icon: '',
      navigate: { pageId: pg.id, params: {}, replace: false },
    }))
}

/** Studio menu → the library `TMenu` (page ids resolved to keys). */
export function menuToEngine(menu: MenuItemDef[], pages: Pick<PageDef, 'id' | 'key'>[]): TMenu {
  const keyById = new Map(pages.map((p) => [p.id, p.key]))
  const convert = (item: MenuItemDef): MenuItem | null => {
    switch (item.kind) {
      case 'divider':
        return { divider: true }
      case 'link':
        return {
          label: item.label,
          ...(item.icon ? { icon: item.icon as MenuItem extends { icon?: infer I } ? I : never } : {}),
          href: item.href,
          ...(item.newTab ? { newTab: true } : {}),
        } as MenuItem
      case 'group':
        return {
          label: item.label,
          ...(item.icon ? { icon: item.icon } : {}),
          ...(item.collapsed ? { collapsed: true } : {}),
          items: item.items.map(convert).filter((x): x is MenuItem => x !== null),
        } as MenuItem
      case 'page': {
        const navigate = toNavigateTarget(item.navigate, keyById)
        if (!navigate) return null
        return {
          label: item.label,
          ...(item.icon ? { icon: item.icon } : {}),
          navigate,
        } as MenuItem
      }
      default:
        return null
    }
  }
  return menu.map(convert).filter((x): x is MenuItem => x !== null)
}

/** The `AppShell` props the studio shell settings become (spread onto the shell). */
export type EngineShellProps = Pick<
  AppShellProps,
  'navigation' | 'breadcrumbs' | 'appBar' | 'menuIcons' | 'menuActiveColor' | 'pageTransition' | 'collapsible' | 'sidebar'
>

/** The studio transition → the engine's, or nothing for none; duration / easing only off the engine defaults. */
export function pageTransitionToEngine(t: StudioPageTransition | undefined): PageTransition | undefined {
  if (!t || t.type === 'none') return undefined
  return {
    type: t.type,
    ...(typeof t.duration === 'number' && t.duration !== DEFAULT_PAGE_TRANSITION_DURATION ? { duration: t.duration } : {}),
    ...(t.easing !== 'ease-out' ? { easing: t.easing } : {}),
  }
}

/** The footer toggle's label when none is typed (the library's default, so typing it exports nothing). */
export const DEFAULT_SIDEBAR_TOGGLE_LABEL = 'Hide Menu'

/**
 * Studio sidebar settings → the library `SidebarConfig`, only what differs
 * from the defaults (undefined for a default sidebar). The pill colours ride
 * along only on a pill, the gradient only with both stops, the indicator only
 * off the variant's own default.
 */
export function sidebarToEngine(s: SidebarSettings | undefined): SidebarConfig | undefined {
  if (!s) return undefined
  const pill = s.variant === 'pill'
  const gradientOn = pill && s.activeGradient.enabled && s.activeGradient.from.trim() && s.activeGradient.to.trim()
  const indicatorOn = s.indicator ?? pill
  const label = s.toggleLabel.trim()
  const out: SidebarConfig = {
    ...(pill ? { variant: 'pill' as const } : {}),
    ...(s.toggle === 'footer' ? { toggle: 'footer' as const } : {}),
    ...(s.toggle === 'footer' && label && label !== DEFAULT_SIDEBAR_TOGGLE_LABEL ? { toggleLabel: label } : {}),
    ...(s.railWidth.trim() ? { railWidth: s.railWidth.trim() } : {}),
    ...(pill && s.itemBackground.trim() ? { itemBackground: s.itemBackground.trim() } : {}),
    ...(gradientOn
      ? {
          activeGradient: {
            from: s.activeGradient.from.trim(),
            to: s.activeGradient.to.trim(),
            ...(s.activeGradient.angle !== 90 ? { angle: s.activeGradient.angle } : {}),
          },
        }
      : pill && s.activeBackground.trim()
        ? { activeBackground: s.activeBackground.trim() }
        : {}),
    ...(s.indicator !== null && s.indicator !== pill ? { indicator: s.indicator } : {}),
    ...(indicatorOn && s.indicatorColor.trim() ? { indicatorColor: s.indicatorColor.trim() } : {}),
  }
  return Object.keys(out).length ? out : undefined
}

/** Studio shell settings → `AppShell` props; empty app-bar fields are dropped. */
export function shellToEngine(shell: ShellSettings): EngineShellProps {
  const { title, icon, logo, logoSize, variant, background, gradient, foreground, padding, sidebarToggle } = shell.appBar
  type IconKey = AppBarConfig['icon']
  const toggle = shell.collapsible
    ? {
        ...(sidebarToggle.hide ? { hide: sidebarToggle.hide as IconKey } : {}),
        ...(sidebarToggle.show ? { show: sidebarToggle.show as IconKey } : {}),
      }
    : {}
  // The paint rides along only on a custom bar; a gradient needs both stops.
  const gradientOn = variant === 'custom' && gradient.enabled && gradient.from.trim() && gradient.to.trim()
  const paint: Partial<AppBarConfig> =
    variant === 'custom'
      ? {
          ...(background.trim() ? { background: background.trim() } : {}),
          ...(gradientOn
            ? { gradient: { from: gradient.from.trim(), to: gradient.to.trim(), ...(gradient.angle !== 90 ? { angle: gradient.angle } : {}) } }
            : {}),
          ...(foreground ? { foreground } : {}),
        }
      : {}
  const appBar: AppBarConfig = {
    ...(title ? { title } : {}),
    ...(icon ? { icon: icon as IconKey } : {}),
    ...(logo ? { logo } : {}),
    ...(logo && logoSize.trim() ? { logoSize: logoSize.trim() } : {}),
    ...(variant !== 'panel' ? { variant } : {}),
    ...paint,
    ...(padding.trim() ? { padding: padding.trim() } : {}),
    ...(Object.keys(toggle).length ? { sidebarToggle: toggle } : {}),
  }
  return {
    navigation: shell.navigation,
    breadcrumbs: shell.breadcrumbs,
    appBar,
    ...(shell.menuIcons ? {} : { menuIcons: false }),
    ...(shell.menuActiveColor?.trim() ? { menuActiveColor: shell.menuActiveColor.trim() } : {}),
    ...(pageTransitionToEngine(shell.pageTransition) ? { pageTransition: pageTransitionToEngine(shell.pageTransition) } : {}),
    ...(shell.collapsible ? {} : { collapsible: false }),
    ...(sidebarToEngine(shell.sidebar) ? { sidebar: sidebarToEngine(shell.sidebar) } : {}),
  }
}

