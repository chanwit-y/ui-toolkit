import type { AppBarConfig, AppShellProps, MenuItem, TMenu } from '@gummy-ui/ui'
import { toNavigateTarget } from '../Layout/gridConfig'
import type { MenuItemDef, PageDef, ShellSettings } from './types'
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
export type EngineShellProps = Pick<AppShellProps, 'navigation' | 'breadcrumbs' | 'appBar' | 'menuIcons' | 'collapsible'>

/** Studio shell settings → `AppShell` props; empty app-bar fields are dropped. */
export function shellToEngine(shell: ShellSettings): EngineShellProps {
  const { title, icon, logo, variant, sidebarToggle } = shell.appBar
  type IconKey = AppBarConfig['icon']
  const toggle = shell.collapsible
    ? {
        ...(sidebarToggle.hide ? { hide: sidebarToggle.hide as IconKey } : {}),
        ...(sidebarToggle.show ? { show: sidebarToggle.show as IconKey } : {}),
      }
    : {}
  const appBar: AppBarConfig = {
    ...(title ? { title } : {}),
    ...(icon ? { icon: icon as IconKey } : {}),
    ...(logo ? { logo } : {}),
    ...(variant !== 'panel' ? { variant } : {}),
    ...(Object.keys(toggle).length ? { sidebarToggle: toggle } : {}),
  }
  return {
    navigation: shell.navigation,
    breadcrumbs: shell.breadcrumbs,
    appBar,
    ...(shell.menuIcons ? {} : { menuIcons: false }),
    ...(shell.collapsible ? {} : { collapsible: false }),
  }
}

/** The hand-off `menu.ts`: the `TMenu` plus the layout props the exported `AppShell` takes. */
export function toMenuTs(menu: MenuItemDef[], pages: Pick<PageDef, 'id' | 'key'>[], shell: ShellSettings): string {
  return (
    'import type { AppShellProps, TMenu } from "@gummy-ui/ui";\n\n' +
    'export const menu: TMenu = ' +
    JSON.stringify(menuToEngine(menu, pages), null, 2) +
    ';\n\n' +
    '// Spread onto <AppShell>: menu placement, breadcrumb strip, app bar (incl. sidebar toggle glyphs), menu icons, collapsible.\n' +
    'export const shell = ' +
    JSON.stringify(shellToEngine(shell), null, 2) +
    ' satisfies Pick<AppShellProps, "navigation" | "breadcrumbs" | "appBar" | "menuIcons" | "collapsible">;\n'
  )
}

/** The App.tsx wiring shown in HANDOFF.md. */
export function appWiringSnippet(): string {
  return [
    'import { AppShell, DataProvider, HttpClientFactory, PageRouter, ThemeProvider, ThemeToggle } from "@gummy-ui/ui";',
    'import { BrowserRouter } from "react-router-dom";',
    'import { model } from "./model"; import { api } from "./api"; import { pages } from "./pages"; import { menu, shell } from "./menu"; import { theme, components } from "./theme";',
    '',
    'const http = new HttpClientFactory(import.meta.env.VITE_API_URL ?? "", async () => "", "1.0.0", 30000);',
    '',
    'export function App() {',
    '  return (',
    '    <BrowserRouter>',
    '      <DataProvider>',
    '        <ThemeProvider theme={theme} components={components}>',
    '          <AppShell pages={pages} menu={menu} {...shell} header={<ThemeToggle />}>',
    '            <PageRouter http={http} model={model} api={api} pages={pages} />',
    '          </AppShell>',
    '        </ThemeProvider>',
    '      </DataProvider>',
    '    </BrowserRouter>',
    '  );',
    '}',
  ].join('\n')
}
